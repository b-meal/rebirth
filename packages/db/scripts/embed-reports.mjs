import { pipeline } from "@huggingface/transformers";
import postgres from "postgres";

import {
  EMBEDDING_MODEL,
  buildEmbedText,
  isEmbeddable,
} from "../../core/src/matching/embed-text.ts";

// 벡터를 만드는 유일한 자리. 모델이 381MB 라 Vercel 번들에 넣지 않고 여기서만 돌림
// 저장된 벡터를 쓰는 조회는 SQL 뿐이라 런타임에는 모델이 필요 없음
//
//   pnpm --filter @rebirth/db run db:embed          아직 없는 것만 200건
//   pnpm --filter @rebirth/db run db:embed 1000     상한을 올려서
//   pnpm --filter @rebirth/db run db:embed 1000 all 모델이 바뀌었을 때 전부 다시

process.loadEnvFile("../../.env.local");

const LIMIT = Number(process.argv[2] ?? 200);
const REDO = process.argv[3] === "all";
// 한 번에 넘기는 문장 수. 늘려도 빨라지지 않고 메모리만 늘어남
const BATCH = 32;

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const rows = await sql`
  select r.id, r.animal_type, r.breed_guess, r.colors, r.size,
         r.condition_tags, r.appearance
  from reports r
  ${REDO ? sql`` : sql`left join report_embeddings e on e.report_id = r.id`}
  where r.visibility <> 'deleted'
    ${REDO ? sql`` : sql`and e.report_id is null`}
  order by r.created_at desc
  limit ${LIMIT}`;

const targets = rows
  .map((row) => ({
    id: row.id,
    source: {
      animalType: row.animal_type,
      breedGuess: row.breed_guess,
      colors: row.colors ?? [],
      size: row.size,
      conditionTags: row.condition_tags ?? [],
      appearance: row.appearance,
    },
  }))
  .filter((row) => isEmbeddable(row.source))
  .map((row) => ({ id: row.id, text: buildEmbedText(row.source) }));

console.log(`대상 ${rows.length}건 중 임베딩 가능 ${targets.length}건`);
if (targets.length === 0) {
  await sql.end();
  process.exit(0);
}

console.log(`모델 적재 ${EMBEDDING_MODEL} (처음 한 번은 내려받느라 몇 분 걸림)`);
const extract = await pipeline("feature-extraction", EMBEDDING_MODEL);

let saved = 0;
for (let i = 0; i < targets.length; i += BATCH) {
  const chunk = targets.slice(i, i + BATCH);
  // normalize 를 켜야 코사인 거리와 내적의 순서가 같아짐
  const out = await extract(
    chunk.map((row) => row.text),
    { pooling: "mean", normalize: true },
  );
  const dim = out.dims[1];

  const values = chunk.map((row, index) => ({
    report_id: row.id,
    embedding: JSON.stringify(
      Array.from(out.data.slice(index * dim, (index + 1) * dim)),
    ),
    source_text: row.text,
    model: EMBEDDING_MODEL,
  }));

  await sql`
    insert into report_embeddings ${sql(values, "report_id", "embedding", "source_text", "model")}
    on conflict (report_id) do update set
      embedding = excluded.embedding,
      source_text = excluded.source_text,
      model = excluded.model,
      created_at = now()`;

  saved += chunk.length;
  process.stdout.write(`\r  저장 ${saved}/${targets.length}`);
}

const [total] = await sql`select count(*)::int as n from report_embeddings`;
console.log(`\n완료. 저장된 벡터 ${total.n}건`);
await sql.end();
