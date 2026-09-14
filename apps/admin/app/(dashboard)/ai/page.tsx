import type { Metadata } from "next";

import {
  analysisFailureCodes,
  analysisJobSummary,
  analysisJobsByModel,
  analysisJobsDaily,
  countEditedFields,
  draftAcceptance,
  listAnalysisJobs,
  matchBreakdownAverages,
  matchScoreDistribution,
} from "@rebirth/db";
import { MOCK_MODEL, VISION_MODEL } from "@rebirth/core/vision";

import { AiView, type AiDashboard } from "./view";

export const metadata: Metadata = { title: "AI" };

// 실행 기록이 계속 쌓이므로 캐시하지 않음
export const dynamic = "force-dynamic";

const RECENT_LIMIT = 30;

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
  const [summary, byModel, failures, daily, editedFields, acceptance, scoreBuckets, breakdown, jobs] =
    await Promise.all([
      safe(() => analysisJobSummary(), undefined),
      safe(() => analysisJobsByModel(), []),
      safe(() => analysisFailureCodes(), []),
      safe(() => analysisJobsDaily(), []),
      safe(() => countEditedFields(), []),
      safe(() => draftAcceptance(), undefined),
      safe(() => matchScoreDistribution(), []),
      safe(() => matchBreakdownAverages(), undefined),
      safe(() => listAnalysisJobs(RECENT_LIMIT), []),
    ]);

  const data: AiDashboard = {
    visionModel: VISION_MODEL,
    mockModel: MOCK_MODEL,
    summary: summary ?? null,
    byModel,
    failures,
    daily,
    editedFields,
    acceptance: acceptance ?? null,
    scoreBuckets,
    breakdown: breakdown ?? null,
    // 클라이언트 경계를 넘으면 Date 가 문자열이 되므로 서버에서 형태를 맞춤
    jobs: jobs.map((job) => ({
      ...job,
      createdAt: job.createdAt.toISOString(),
      finishedAt: job.finishedAt?.toISOString() ?? null,
    })),
  };

  return <AiView data={data} />;
}
