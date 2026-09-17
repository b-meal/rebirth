// 시드가 넣은 목데이터를 지움, 고정 UUID 대역이라 시드를 다시 돌리면 같은 행이 돌아옴

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

// 시드 스크립트가 쓰는 고정 UUID 앞자리
const SEED_PREFIX = "00000000%";

const sql = postgres(DATABASE_URL.replace(":5432/", ":6543/"), {
  prepare: false,
  max: 2,
  connect_timeout: 20,
});

try {
  const reports = await sql<{ id: string }[]>`select id from reports where id::text like ${SEED_PREFIX}`;
  const reportIds = reports.map((row) => row.id);
  process.stdout.write(`제보 ${reportIds.length}건\n`);

  if (reportIds.length > 0) {
    for (const table of [
      "report_embeddings",
      "report_photos",
      "consent_records",
      "report_comments",
      "report_interests",
      "report_flags",
    ] as const) {
      const removed = await sql`delete from ${sql(table)} where report_id = any(${reportIds})`;
      if (removed.count) process.stdout.write(`  ${table} ${removed.count}\n`);
    }
    await sql`delete from match_scores where sighting_id = any(${reportIds}) or lost_id = any(${reportIds})`;
    const removed = await sql`delete from reports where id = any(${reportIds})`;
    process.stdout.write(`  reports ${removed.count}\n`);
  }

  const posts = await sql<{ id: string }[]>`select id from community_posts where id::text like ${SEED_PREFIX}`;
  const postIds = posts.map((row) => row.id);
  process.stdout.write(`커뮤니티 글 ${postIds.length}건\n`);

  if (postIds.length > 0) {
    for (const table of ["community_post_photos", "community_post_likes", "community_comments"] as const) {
      const removed = await sql`delete from ${sql(table)} where post_id = any(${postIds})`;
      if (removed.count) process.stdout.write(`  ${table} ${removed.count}\n`);
    }
    const removed = await sql`delete from community_posts where id = any(${postIds})`;
    process.stdout.write(`  community_posts ${removed.count}\n`);
  }

  const left = await sql`
    select kind, count(*)::int as n from reports group by 1 order by 2 desc`;
  process.stdout.write("\n남은 제보\n");
  for (const row of left) process.stdout.write(`  ${row.kind} ${row.n}\n`);
} finally {
  await sql.end();
}
