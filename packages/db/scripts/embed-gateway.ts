// Vercel AI Gateway 로 제보 벡터를 만드는 배치, 런타임에 모델 파일을 두지 않음

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import postgres from "postgres";
import { embedMany } from "ai";

import {
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
  buildEmbedText,
  isEmbeddable,
} from "../../core/src/matching/embed-text.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readEnvFile(file: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    env[match[1]!] = match[2]!.trim().replace(/^["'](.*)["']$/, "$1");
  }
  return env;
}

const env = readEnvFile(path.join(repoRoot, ".env.local"));
for (const key of ["DATABASE_URL", "AI_GATEWAY_API_KEY"]) {
  if (!env[key]) throw new Error(`${key} 가 없습니다`);
}
process.env.AI_GATEWAY_API_KEY = env.AI_GATEWAY_API_KEY;

const LIMIT = Number(process.argv[2] ?? 200);
const REDO = process.argv[3] === "all";

// 한 요청에 담는 문장 수, 게이트웨이 한 번의 상한을 넘지 않게 둠
const BATCH = 64;

const sql = postgres(env.DATABASE_URL!.replace(":5432/", ":6543/"), { prepare: false, max: 3 });

type Row = {
  id: string;
  animal_type: string;
  breed_guess: string | null;
  colors: string[] | null;
  size: string;
  condition_tags: string[] | null;
  appearance: string | null;
};

try {
  const rows = (await sql`
    select r.id, r.animal_type, r.breed_guess, r.colors, r.size, r.condition_tags, r.appearance
    from reports r
    ${REDO ? sql`` : sql`left join report_embeddings e on e.report_id = r.id`}
    where r.visibility <> 'deleted'
      ${REDO ? sql`` : sql`and e.report_id is null`}
    order by r.created_at desc
    limit ${LIMIT}
  `) as unknown as Row[];

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
    .filter((row) => isEmbeddable(row.source));

  process.stdout.write(`대상 ${rows.length}건 중 임베딩 가능 ${targets.length}건\n`);

  let saved = 0;
  for (let from = 0; from < targets.length; from += BATCH) {
    const chunk = targets.slice(from, from + BATCH);
    const texts = chunk.map((row) => buildEmbedText(row.source));
    const { embeddings } = await embedMany({
      model: EMBEDDING_MODEL,
      values: texts,
      maxParallelCalls: 2,
      providerOptions: { openai: { dimensions: EMBEDDING_DIMENSIONS } },
    });

    const values = chunk.map((row, index) => ({
      report_id: row.id,
      embedding: JSON.stringify(embeddings[index]),
      source_text: texts[index]!,
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
    process.stdout.write(`  저장 ${saved}/${targets.length}\n`);
  }

  const [total] = await sql`select count(*)::int as n from report_embeddings`;
  process.stdout.write(`완료. 저장된 벡터 ${total!.n}건\n`);
} finally {
  await sql.end();
}
