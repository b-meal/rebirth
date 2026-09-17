import "server-only";

import {
  findMyLostForSighting,
  findReportForScoring,
  upsertMatchScores,
} from "@rebirth/db";

import { toMatchInput } from "./row";
import { isComparable, scoreMatch, type MatchBreakdown, type MatchInput } from "./score";

// 발견 제보 하나를 내 실종 신고들과 견줌. 후보 화면의 반대 방향
// 제보 상세의 내 가족 같아요 가 여기로 옴
// 유사도일 뿐 개체 동일성 확정이 아님. 화면이 확정 아님 표기를 함께 냄

/** 한 번에 견줄 내 신고 수. 넘으면 최근 신고부터 끊음 */
const MAX_LOST = 20;

export type SightingLostMatch = {
  lostId: string;
  petName: string | null;
  animalType: MatchInput["animalType"];
  size: MatchInput["size"];
  areaName: string | null;
  occurredAt: Date;
  score: number;
  breakdown: MatchBreakdown;
};

export type SightingLostMatches = {
  /** 찾는 중인 내 실종 신고 수. 0이면 견줄 기준이 없어 신고부터 써야 함 */
  total: number;
  /** 종이 맞아 견줄 수 있었던 신고, 점수 내림차순 */
  matches: SightingLostMatch[];
};

/**
 * 이 발견 제보와 내 실종 신고들의 유사도
 * 점수 하한을 두지 않음. 내 신고는 몇 건뿐이라 걸러 내면 빈 화면만 남고
 * 낮은 점수도 왜 낮은지 근거와 함께 보는 편이 보호자의 판단에 쓰임
 */
export async function listSightingLostMatches(input: {
  sightingId: string;
  userId: string;
}): Promise<SightingLostMatches | null> {
  const [sighting] = await findReportForScoring(input.sightingId);
  // 실종끼리는 서로 견주지 않음. 없는 제보도 같은 취급
  if (!sighting || sighting.kind === "lost") return null;

  const sightingInput = toMatchInput(sighting);

  const mine = await findMyLostForSighting({ userId: input.userId, limit: MAX_LOST });
  if (mine.length === 0) return { total: 0, matches: [] };

  const scored = mine.flatMap((lost) => {
    const lostInput = toMatchInput(lost);
    if (!isComparable(lostInput, sightingInput)) return [];
    const result = scoreMatch(lostInput, sightingInput);
    return [
      {
        lostId: lost.id,
        petName: lost.petName,
        animalType: lost.animalType,
        size: lost.size,
        areaName: lost.areaName,
        occurredAt: lost.occurredAt,
        score: result.score,
        breakdown: result.breakdown,
      },
    ];
  });

  scored.sort((a, b) => b.score - a.score);

  // 후보 화면과 운영 화면이 같은 점수를 보게 남김. 실패해도 이 화면은 그대로 뜸
  if (scored.length > 0) {
    await upsertMatchScores(
      scored.map((match) => ({
        lostId: match.lostId,
        sightingId: input.sightingId,
        score: match.score,
        breakdown: match.breakdown,
      })),
    ).catch((error) => {
      console.error("[sighting.lostMatches] 점수 캐시 실패", error);
    });
  }

  return { total: mine.length, matches: scored };
}
