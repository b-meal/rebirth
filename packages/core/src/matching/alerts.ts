import "server-only";

import {
  findLostForSighting,
  findReportForScoring,
  upsertMatchScores,
} from "@rebirth/db";

import { toMatchInput } from "./row";
import { isComparable, scoreMatch } from "./score";

// 새 발견 제보가 들어오면 견줄 실종 신고를 찾아 점수를 캐시에 남김
// 알림 행은 만들지 않음. 알림함이 이 점수와 확인 시각으로 안 읽은 수를 그때그때 셈
// 전에는 보호자가 후보 화면을 열어야 계산돼 열기 전에는 알릴 거리가 없었음

/** 한 제보에 견줄 실종 신고 상한. 넘어가면 가까운 순으로 끊음 */
const MAX_LOST_PER_SIGHTING = 50;

/**
 * 새 제보와 닮은 실종 신고의 점수를 캐시에 남김
 * 저장 흐름을 막지 않음. 실패해도 제보는 이미 저장됐고 보호자가 후보 화면을 열면 다시 계산됨
 */
export async function scoreSightingAgainstLost(sightingId: string): Promise<void> {
  const [sighting] = await findReportForScoring(sightingId);
  // 발견 계열만 견줌. 실종끼리는 서로 후보가 되지 않음
  if (!sighting || sighting.kind === "lost") return;

  const input = toMatchInput(sighting);

  const lost = await findLostForSighting({
    sightingId,
    animalType: sighting.animalType,
    point: input.point,
    occurredAt: sighting.occurredAt,
    limit: MAX_LOST_PER_SIGHTING,
  });
  if (lost.length === 0) return;

  const scored = lost.flatMap((row) => {
    const other = toMatchInput(row);
    if (!isComparable(other, input)) return [];
    const result = scoreMatch(other, input);
    return [
      {
        lostId: row.id,
        sightingId,
        score: result.score,
        breakdown: result.breakdown,
      },
    ];
  });
  if (scored.length === 0) return;

  await upsertMatchScores(scored);
}
