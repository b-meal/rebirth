import postgres from "postgres";

// 384차원 벡터를 주성분 둘로 눌러 화면에 흩뿌릴 좌표를 만듦
// 거리 판단에는 쓰지 않음. 눌러 담는 과정에서 원래 거리가 보존되지 않음
//
//   pnpm --filter @rebirth/db run db:project

process.loadEnvFile("../../.env.local");

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const rows = await sql`
  select report_id, embedding::text as embedding
  from report_embeddings`;

if (rows.length === 0) {
  console.log("벡터가 없습니다");
  await sql.end();
  process.exit(0);
}

const vectors = rows.map((row) => JSON.parse(row.embedding));
const dim = vectors[0].length;
console.log(`${rows.length}건 · ${dim}차원`);

// 평균을 빼야 첫 주성분이 평균 방향이 아니라 퍼짐 방향을 가리킴
const mean = new Float64Array(dim);
for (const v of vectors) for (let i = 0; i < dim; i += 1) mean[i] += v[i];
for (let i = 0; i < dim; i += 1) mean[i] /= vectors.length;
const centered = vectors.map((v) => v.map((x, i) => x - mean[i]));

const dot = (a, b) => {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) sum += a[i] * b[i];
  return sum;
};

// 공분산 행렬을 만들지 않고 곱만으로 주성분을 뽑음. 384x384 를 들고 있을 이유가 없음
function power(data, exclude) {
  let v = new Float64Array(dim).map(() => Math.random() - 0.5);
  for (let step = 0; step < 60; step += 1) {
    const next = new Float64Array(dim);
    for (const row of data) {
      const scale = dot(row, v);
      for (let i = 0; i < dim; i += 1) next[i] += scale * row[i];
    }
    for (const prev of exclude) {
      const scale = dot(next, prev);
      for (let i = 0; i < dim; i += 1) next[i] -= scale * prev[i];
    }
    let norm = Math.sqrt(dot(next, next));
    if (norm === 0) break;
    for (let i = 0; i < dim; i += 1) next[i] /= norm;
    v = next;
  }
  return v;
}

const pc1 = power(centered, []);
const pc2 = power(centered, [pc1]);

const coords = centered.map((row) => [dot(row, pc1), dot(row, pc2)]);
// 화면 쪽에서 눈금을 신경 쓰지 않게 -1 에서 1 로 맞춤
const scale = (index) => {
  const values = coords.map((c) => c[index]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return (value) => Math.round(((value - min) / span) * 2000 - 1000) / 1000;
};
const sx = scale(0);
const sy = scale(1);

const values = rows.map((row, i) => ({
  report_id: row.report_id,
  proj_x: sx(coords[i][0]),
  proj_y: sy(coords[i][1]),
}));

for (let i = 0; i < values.length; i += 500) {
  const chunk = values.slice(i, i + 500);
  await sql`
    update report_embeddings e
    set proj_x = c.x, proj_y = c.y
    from unnest(
      ${chunk.map((v) => v.report_id)}::uuid[],
      ${chunk.map((v) => v.proj_x)}::float8[],
      ${chunk.map((v) => v.proj_y)}::float8[]
    ) as c(id, x, y)
    where e.report_id = c.id`;
  process.stdout.write(`\r  좌표 ${Math.min(i + 500, values.length)}/${values.length}`);
}

console.log(`\n완료`);
await sql.end();
