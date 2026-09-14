import "server-only";

import {
  findAdminReport,
  findReportCoarsePoint,
  upsertMatchReview,
} from "@rebirth/db";

import { scoreMatch, type MatchInput } from "./score.ts";
import {
  REVIEW_PROMPT_VERSION,
  ReviewError,
  reviewMatch,
  type MatchReview,
  type ReviewSubject,
} from "./review";

// 운영자가 한 쌍씩 눌러 돌리는 재평가. 배치로 돌리지 않는 이유는 호출 비용이 그대로 늘어서임

type Loaded = { subject: ReviewSubject; match: MatchInput };

async function load(id: string): Promise<Loaded | null> {
  const report = await findAdminReport(id);
  if (!report) return null;

  // 정확 좌표는 어디서도 읽지 않음. 거리 점수는 공개 격자로만 냄. POL-25
  const spot = await findReportCoarsePoint(id).catch(() => undefined);
  const point = spot?.coarsePoint
    ? { lat: spot.coarsePoint.y, lng: spot.coarsePoint.x }
    : null;

  return {
    subject: {
      animalType: report.animalType,
      breedGuess: report.breedGuess,
      colors: report.colors,
      size: report.size,
      collar: report.collar,
      injury: report.injury,
      earTip: report.earTip,
      conditionTags: report.conditionTags,
      appearance: report.appearance,
      areaName: report.areaName,
      occurredAt: report.occurredAt,
    },
    match: {
      animalType: report.animalType,
      colors: report.colors,
      size: report.size,
      collar: report.collar,
      injury: report.injury,
      earTip: report.earTip,
      point,
      occurredAt: report.occurredAt,
    },
  };
}

export type RunReviewOutcome = {
  lostId: string;
  sightingId: string;
  score: number;
  review: MatchReview;
  model: string;
  latencyMs: number;
};

/** 후보 한 쌍을 모델에 다시 물어 근거를 만들고 저장함 */
export async function runMatchReview(input: {
  lostId: string;
  sightingId: string;
}): Promise<RunReviewOutcome> {
  const [lost, sighting] = await Promise.all([
    load(input.lostId),
    load(input.sightingId),
  ]);
  if (!lost || !sighting) {
    throw new ReviewError("제보를 찾지 못했습니다", "api");
  }

  const scored = scoreMatch(lost.match, sighting.match);
  const startedAt = Date.now();
  const { review, model } = await reviewMatch({
    lost: lost.subject,
    sighting: sighting.subject,
    score: scored.score,
    distanceKm: scored.distanceKm,
    hoursApart: scored.hoursApart,
  });
  const latencyMs = Date.now() - startedAt;

  await upsertMatchReview({
    lostId: input.lostId,
    sightingId: input.sightingId,
    verdict: review.verdict,
    agreements: review.agreements,
    conflicts: review.conflicts,
    checkFirst: review.checkFirst,
    model,
    promptVersion: REVIEW_PROMPT_VERSION,
    latencyMs,
  });

  return {
    lostId: input.lostId,
    sightingId: input.sightingId,
    score: scored.score,
    review,
    model,
    latencyMs,
  };
}
