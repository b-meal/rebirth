// 행을 직접 넣은 제보는 저장 흐름을 타지 않아 match_scores 가 비어 다시 세는 스크립트

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import postgres from "postgres";

import { isComparable, scoreMatch, type MatchInput } from "../../core/src/matching/score.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

// loadEnvFile 은 셸에 이미 있는 값을 덮지 않아 파일을 원천으로 둠
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

// packages/db/src/queries/lost.ts 의 findCandidateSightings 와 같은 값
const CANDIDATE_RADIUS_M = 15_000;
const CANDIDATE_WINDOW_DAYS = 14;
const CANDIDATE_LIMIT = 200;

// packages/core/src/matching/handlers.ts 의 MIN_CANDIDATE_SCORE 와 같은 값
const MIN_CANDIDATE_SCORE = 30;

type Row = {
  id: string;
  animal_type: MatchInput["animalType"];
  colors: string[] | null;
  size: MatchInput["size"];
  collar: boolean | null;
  injury: boolean | null;
  ear_tip: boolean | null;
  lng: number | null;
  lat: number | null;
  occurred_at: Date;
};

function toMatchInput(row: Row): MatchInput {
  return {
    animalType: row.animal_type,
    colors: row.colors ?? [],
    size: row.size,
    collar: row.collar,
    injury: row.injury,
    earTip: row.ear_tip,
    // 격자 좌표 전용, 정확 좌표는 읽지 않음
    point: row.lng !== null && row.lat !== null ? { lat: row.lat, lng: row.lng } : null,
    occurredAt: new Date(row.occurred_at),
  };
}

// 5432 는 세션 모드라 클라이언트 15개에서 막혀 트랜잭션 모드로 붙음
const sql = postgres(DATABASE_URL.replace(":5432/", ":6543/"), {
  prepare: false,
  max: 3,
  connect_timeout: 20,
});

const COLUMNS = sql`
  id, animal_type, colors, size, collar, injury, ear_tip,
  ST_X(coarse_point::geometry) as lng, ST_Y(coarse_point::geometry) as lat, occurred_at
`;

try {
  const lostRows = (await sql`
    select ${COLUMNS} from reports
    where kind = 'lost' and visibility = 'public' and lifecycle = 'searching'
    order by occurred_at desc
  `) as unknown as Row[];

  process.stdout.write(`실종 신고 ${lostRows.length}건\n`);

  let scoredPairs = 0;
  let withCandidates = 0;

  for (const lost of lostRows) {
    const lostInput = toMatchInput(lost);
    // 실종 시점을 정확히 아는 보호자가 드물어 앞선 목격도 모음
    const since = new Date(lost.occurred_at.getTime() - 24 * 3_600_000);
    const until = new Date(lost.occurred_at.getTime() + CANDIDATE_WINDOW_DAYS * 24 * 3_600_000);

    const withinRadius = lostInput.point
      ? sql`and ST_DWithin(
          coarse_point::geography,
          ST_SetSRID(ST_MakePoint(${lostInput.point.lng}, ${lostInput.point.lat}), 4326)::geography,
          ${CANDIDATE_RADIUS_M}
        )`
      : sql``;

    // 종이 다르면 후보 아님, unknown 은 사용자가 판단하게 남김
    const sameKind =
      lost.animal_type === "unknown"
        ? sql``
        : sql`and (animal_type = ${lost.animal_type} or animal_type = 'unknown')`;

    const candidates = (await sql`
      select ${COLUMNS} from reports
      where kind = 'sighting' and visibility = 'public' and lifecycle = 'active'
        and id <> ${lost.id}
        and occurred_at >= ${since} and occurred_at <= ${until}
        ${sameKind} ${withinRadius}
      order by occurred_at desc
      limit ${CANDIDATE_LIMIT}
    `) as unknown as Row[];

    const scored = candidates.flatMap((row) => {
      const input = toMatchInput(row);
      if (!isComparable(lostInput, input)) return [];
      const result = scoreMatch(lostInput, input);
      if (result.score < MIN_CANDIDATE_SCORE) return [];
      return [{ sightingId: row.id, score: result.score, breakdown: result.breakdown }];
    });

    if (scored.length === 0) continue;
    withCandidates += 1;
    scoredPairs += scored.length;

    for (const row of scored) {
      await sql`
        insert into match_scores (lost_id, sighting_id, score, breakdown)
        values (${lost.id}, ${row.sightingId}, ${row.score}, ${sql.json(row.breakdown)})
        on conflict (lost_id, sighting_id) do update set
          score = excluded.score,
          breakdown = excluded.breakdown
      `;
    }
  }

  process.stdout.write(
    `후보가 붙은 신고 ${withCandidates}건, 점수 ${scoredPairs}쌍을 넣었습니다\n`,
  );
} finally {
  await sql.end();
}
