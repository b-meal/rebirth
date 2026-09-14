import type { Metadata } from "next";

import {
  analysisFailureCodes,
  analysisJobSummary,
  analysisJobsByModel,
  analysisJobsDaily,
  countEditedFields,
  countUnattributedFailures,
  draftAcceptance,
  embeddingCoverage,
  listAnalysisJobs,
  listMatchReviews,
  listSemanticNeighbors,
  listUnreviewedPairs,
  listVectorPoints,
  matchBreakdownAverages,
  matchReviewSummary,
  matchScoreDistribution,
  vectorClusters,
} from "@rebirth/db";
import {
  MATCH_VERDICT_LABEL,
  REVIEW_MODEL,
  REVIEW_PROMPT_VERSION,
} from "@rebirth/core/matching";
import { EMBEDDING_MODEL } from "@rebirth/core/matching/embed-text";
import { MOCK_MODEL, VISION_MODEL } from "@rebirth/core/vision";

import { AiView, type AiDashboard } from "./view";

export const metadata: Metadata = { title: "AI" };

// 실행 기록이 계속 쌓이므로 캐시하지 않음
export const dynamic = "force-dynamic";

// 원장은 판단이 아니라 확인용이라 한 화면에 들어갈 만큼만 둠
const LEDGER_LIMIT = 12;
const TREND_DAYS = 14;

/** 한 절이 실패해도 나머지 절은 보여야 하므로 절마다 따로 감쌈 */
async function safe<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error("[ai] 지표 조회 실패", error);
    return fallback;
  }
}

export default async function AiPage() {
  const [real, all, orphanFailures, byModel, failures, daily, editedFields, acceptance] =
    await Promise.all([
      safe(() => analysisJobSummary({ model: VISION_MODEL }), undefined),
      safe(() => analysisJobSummary(), undefined),
      safe(() => countUnattributedFailures(), undefined),
      safe(() => analysisJobsByModel(), []),
      safe(() => analysisFailureCodes(), []),
      safe(() => analysisJobsDaily(TREND_DAYS), []),
      safe(() => countEditedFields(), []),
      safe(() => draftAcceptance(), undefined),
    ]);

  const [scoreBuckets, breakdown, reviewSummary, reviews, unreviewed] =
    await Promise.all([
      safe(() => matchScoreDistribution(), []),
      safe(() => matchBreakdownAverages(), undefined),
      safe(() => matchReviewSummary(), []),
      safe(() => listMatchReviews(4), []),
      safe(() => listUnreviewedPairs(3), []),
    ]);

  const [coverage, neighbors, jobs, points, clusters] = await Promise.all([
    safe(() => embeddingCoverage(), undefined),
    safe(() => listSemanticNeighbors(4), []),
    safe(() => listAnalysisJobs(LEDGER_LIMIT), []),
    safe(() => listVectorPoints(1200), []),
    safe(() => vectorClusters(), []),
  ]);

  const mockRuns = byModel
    .filter((row) => row.model === MOCK_MODEL)
    .reduce((sum, row) => sum + row.total, 0);

  const data: AiDashboard = {
    models: {
      vision: VISION_MODEL,
      review: REVIEW_MODEL,
      embedding: EMBEDDING_MODEL,
    },
    real: real ?? null,
    orphanFailures: orphanFailures?.total ?? 0,
    mockRuns,
    totalRuns: all?.total ?? 0,
    byModel,
    failures,
    days: daily,
    editedFields,
    acceptance: acceptance ?? null,
    scoreBuckets,
    breakdown: breakdown ?? null,
    reviewSummary: reviewSummary.map((row) => ({
      ...row,
      label:
        MATCH_VERDICT_LABEL[row.verdict as keyof typeof MATCH_VERDICT_LABEL] ??
        row.verdict,
    })),
    reviews: reviews.map((row) => ({
      ...row,
      label:
        MATCH_VERDICT_LABEL[row.verdict as keyof typeof MATCH_VERDICT_LABEL] ??
        row.verdict,
      createdAt: row.createdAt.toISOString(),
    })),
    unreviewed,
    coverage: coverage ?? null,
    neighbors,
    points,
    clusters,
    reviewPromptVersion: REVIEW_PROMPT_VERSION,
    // 클라이언트 경계를 넘으면 Date 가 문자열이 되므로 서버에서 형태를 맞춤
    jobs: jobs.map((job) => ({
      id: job.id,
      status: job.status,
      failureCode: job.failureCode,
      model: job.model,
      latencyMs: job.latencyMs,
      createdAt: job.createdAt.toISOString(),
    })),
  };

  return <AiView data={data} />;
}
