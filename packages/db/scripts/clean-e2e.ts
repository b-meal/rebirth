// e2e 가 남긴 제보와 실종 신고를 지움, 같은 DB 를 화면과 나눠 쓰기 때문에 필요함

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import postgres from "postgres";

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

const { DATABASE_URL } = readEnvFile(path.join(repoRoot, ".env.local"));
if (!DATABASE_URL) throw new Error("DATABASE_URL 이 없습니다");

// e2e 가 ANALYZE_MOCK=1 로 도는 동안 저장되는 표식
const E2E_MODEL = "mock";

// lost-flow 가 늘 같은 문장으로 채우는 자리
const E2E_LOST_APPEARANCE = "왼쪽 귀에 갈색 반점, 분홍 목줄";

const sql = postgres(DATABASE_URL.replace(":5432/", ":6543/"), {
  prepare: false,
  max: 2,
  connect_timeout: 20,
});

try {
  const targets = await sql<{ id: string }[]>`
    select id from reports
    where ai_model = ${E2E_MODEL}
       or (kind = 'lost' and appearance = ${E2E_LOST_APPEARANCE})
  `;
  const ids = targets.map((row) => row.id);
  if (ids.length === 0) {
    process.stdout.write("지울 e2e 자료가 없습니다\n");
  } else {
    for (const table of [
      "match_scores",
      "report_embeddings",
      "report_photos",
      "consent_records",
      "report_comments",
      "report_interests",
      "report_flags",
    ] as const) {
      const column = table === "match_scores" ? "sighting_id" : "report_id";
      await sql`delete from ${sql(table)} where ${sql(column)} = any(${ids})`;
      if (table === "match_scores") {
        await sql`delete from match_scores where lost_id = any(${ids})`;
      }
    }
    const removed = await sql`delete from reports where id = any(${ids})`;
    process.stdout.write(`제보와 신고 ${removed.count}건을 지웠습니다\n`);
  }

  // 초안 세션은 제보로 이어지지 않은 것까지 남아 쌓임
  const jobs = await sql`delete from analysis_jobs where model = ${E2E_MODEL}`;
  process.stdout.write(`분석 기록 ${jobs.count}건을 지웠습니다\n`);
} finally {
  await sql.end();
}
