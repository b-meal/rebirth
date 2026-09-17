import "server-only";

import {
  findMyLostForSighting,
  findPublicLostForSighting,
  findReportForScoring,
  upsertMatchScores,
} from "@rebirth/db";

import { MIN_CANDIDATE_SCORE } from "./handlers";
import { toMatchInput } from "./row";
import { isComparable, scoreMatch, type MatchBreakdown, type MatchInput } from "./score";

// 발견 제보 하나를 실종 신고들과 견줌. 후보 화면의 반대 방향
// 제보 상세의 내 가족 같아요 가 여기로 옴
// 유사도일 뿐 개체 동일성 확정이 아님. 화면이 확정 아님 표기를 함께 냄

/** 한 번에 견줄 내 신고 수. 넘으면 최근 신고부터 끊음 */
const MAX_LOST = 20;

/** 둘러보기에서 보여 줄 공개 신고 수. 목록이 길면 훑는 일이 되어 버림 */
const MAX_PUBLIC = 10;

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
  /** mine 은 내 신고와 견준 것, public 은 로그인 없이 공개 신고를 둘러보는 것 */
  mode: "mine" | "public";
  /** 견줄 대상이 된 신고 수. mine 에서 0이면 기준이 없어 신고부터 써야 함 */
  total: number;
  /** 종이 맞아 견줄 수 있었던 신고, 점수 내림차순 */
  matches: SightingLostMatch[];
};

type Scored = Omit<SightingLostMatch, "breakdown"> & { breakdown: MatchBreakdown };

type LostRow = {
  id: string;
  petName: string | null;
  areaName: string | null;
} & Parameters<typeof toMatchInput>[0];

function score(rows: LostRow[], sighting: MatchInput): Scored[] {
  const scored = rows.flatMap((lost) => {
    const lostInput = toMatchInput(lost);
    if (!isComparable(lostInput, sighting)) return [];
    const result = scoreMatch(lostInput, sighting);
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
  return scored.sort((a, b) => b.score - a.score);
}

/**
 * 이 발견 제보와 실종 신고들의 유사도
 *
 * 로그인했으면 내 신고와 견줌. 점수 하한을 두지 않음
 * 내 신고는 몇 건뿐이라 걸러 내면 빈 화면만 남고
 * 낮은 점수도 왜 낮은지 근거와 함께 보는 편이 보호자의 판단에 쓰임
 *
 * 로그인하지 않았으면 가까운 공개 실종 신고를 둘러봄
 * 이쪽은 목록이 길어질 수 있어 후보 목록과 같은 하한을 두고 앞쪽만 냄
 */
export async function listSightingLostMatches(input: {
  sightingId: string;
  userId?: string;
}): Promise<SightingLostMatches | null> {
  const [sighting] = await findReportForScoring(input.sightingId);
  // 실종끼리는 서로 견주지 않음. 없는 제보도 같은 취급
  if (!sighting || sighting.kind === "lost") return null;

  const sightingInput = toMatchInput(sighting);

  if (!input.userId) {
    const nearby = await findPublicLostForSighting({
      sightingId: input.sightingId,
      animalType: sighting.animalType,
      point: sightingInput.point,
      occurredAt: sighting.occurredAt,
    });
    const matches = score(nearby, sightingInput)
      .filter((match) => match.score >= MIN_CANDIDATE_SCORE)
      .slice(0, MAX_PUBLIC);
    // 점수를 캐시하지 않음. 로그인 없이 열리는 화면이라 방문만으로 쓰기가 일어나면 안 됨
    return { mode: "public", total: nearby.length, matches };
  }

  const mine = await findMyLostForSighting({ userId: input.userId, limit: MAX_LOST });
  if (mine.length === 0) return { mode: "mine", total: 0, matches: [] };

  const matches = score(mine, sightingInput);

  // 후보 화면과 운영 화면이 같은 점수를 보게 남김. 실패해도 이 화면은 그대로 뜸
  if (matches.length > 0) {
    await upsertMatchScores(
      matches.map((match) => ({
        lostId: match.lostId,
        sightingId: input.sightingId,
        score: match.score,
        breakdown: match.breakdown,
      })),
    ).catch((error) => {
      console.error("[sighting.lostMatches] 점수 캐시 실패", error);
    });
  }

  return { mode: "mine", total: mine.length, matches };
}
