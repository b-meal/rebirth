import 'server-only'

import { desc, sql as raw } from 'drizzle-orm'

import { db } from '../client'
import { analysisJobs, matchScores, reports } from '../schema'

/* AI 파이프라인 지표. 사진 원본과 좌표를 읽지 않고 실행 기록만 집계함 */

// 추이 기본 기간. 대회 기간 전체가 이 아래라 더 늘릴 이유가 없음
export const TREND_DAYS = 30

/** 분석 작업 전체 현황. 성공률과 지연을 한 행으로 돌려줌 */
export async function analysisJobSummary() {
  const [row] = await db
    .select({
      total: raw<number>`count(*)::int`.mapWith(Number),
      succeeded: raw<number>`count(*) filter (where ${analysisJobs.status} = 'succeeded')::int`.mapWith(
        Number,
      ),
      failed: raw<number>`count(*) filter (where ${analysisJobs.status} = 'failed')::int`.mapWith(
        Number,
      ),
      running: raw<number>`count(*) filter (where ${analysisJobs.status} = 'running')::int`.mapWith(
        Number,
      ),
      avgLatencyMs: raw<number | null>`round(avg(${analysisJobs.latencyMs}))::int`.mapWith(
        (v) => (v === null ? null : Number(v)),
      ),
      // 평균만 보면 느린 꼬리가 가려짐. 사용자가 체감하는 값은 이쪽
      p95LatencyMs: raw<number | null>`percentile_disc(0.95) within group (order by ${analysisJobs.latencyMs})::int`.mapWith(
        (v) => (v === null ? null : Number(v)),
      ),
      // 이상치 한 건이 평균을 끌어올리면 p95 가 평균보다 작아 보임. 최댓값을 함께 둠
      maxLatencyMs: raw<number | null>`max(${analysisJobs.latencyMs})::int`.mapWith(
        (v) => (v === null ? null : Number(v)),
      ),
      // raw 집계는 드라이버가 Date 로 바꿔 주지 않으므로 문자열로 못박음
      lastRunAt: raw<string | null>`to_char(max(${analysisJobs.createdAt}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
    })
    .from(analysisJobs)
  return row
}

/** 모델별 실행 현황. 더미(mock)로 만든 기록을 실제 호출과 갈라 보기 위함 */
export function analysisJobsByModel() {
  return db
    .select({
      model: raw<string>`coalesce(${analysisJobs.model}, '(없음)')`,
      promptVersion: raw<string>`coalesce(${analysisJobs.promptVersion}, '(없음)')`,
      total: raw<number>`count(*)::int`.mapWith(Number),
      succeeded: raw<number>`count(*) filter (where ${analysisJobs.status} = 'succeeded')::int`.mapWith(
        Number,
      ),
      avgLatencyMs: raw<number | null>`round(avg(${analysisJobs.latencyMs}))::int`.mapWith(
        (v) => (v === null ? null : Number(v)),
      ),
    })
    .from(analysisJobs)
    .groupBy(raw`1`, raw`2`)
    .orderBy(raw`3 desc`)
}

/** 실패 코드별 집계. 무엇을 먼저 고쳐야 하는지가 이 표에서 나옴 */
export function analysisFailureCodes() {
  return db
    .select({
      failureCode: raw<string>`coalesce(${analysisJobs.failureCode}, '(없음)')`,
      count: raw<number>`count(*)::int`.mapWith(Number),
    })
    .from(analysisJobs)
    .where(raw`${analysisJobs.status} = 'failed'`)
    .groupBy(raw`1`)
    .orderBy(raw`2 desc`)
}

/** 일자별 추이. 빈 날은 행이 없으므로 화면에서 채움 */
export function analysisJobsDaily(days = TREND_DAYS) {
  return db
    .select({
      day: raw<string>`to_char(date_trunc('day', ${analysisJobs.createdAt}), 'YYYY-MM-DD')`,
      total: raw<number>`count(*)::int`.mapWith(Number),
      failed: raw<number>`count(*) filter (where ${analysisJobs.status} = 'failed')::int`.mapWith(
        Number,
      ),
      avgLatencyMs: raw<number | null>`round(avg(${analysisJobs.latencyMs}))::int`.mapWith(
        (v) => (v === null ? null : Number(v)),
      ),
    })
    .from(analysisJobs)
    .where(raw`${analysisJobs.createdAt} >= now() - make_interval(days => ${days})`)
    .groupBy(raw`1`)
    .orderBy(raw`1`)
}

/** 최근 분석 작업. 결과 본문은 무거워 목록에서 빼고 상세에서만 읽음 */
export function listAnalysisJobs(limit = 50) {
  return db
    .select({
      id: analysisJobs.id,
      uploadId: analysisJobs.uploadId,
      revision: analysisJobs.revision,
      status: analysisJobs.status,
      failureCode: analysisJobs.failureCode,
      model: analysisJobs.model,
      promptVersion: analysisJobs.promptVersion,
      latencyMs: analysisJobs.latencyMs,
      createdAt: analysisJobs.createdAt,
      finishedAt: analysisJobs.finishedAt,
    })
    .from(analysisJobs)
    .orderBy(desc(analysisJobs.createdAt))
    .limit(limit)
}

/**
 * AI 초안을 사람이 얼마나 고쳤는지. 고친 필드가 0 이면 초안을 그대로 받아들인 것
 * 품종 단정을 피하려고 일부러 비워 두는 필드가 있어 필드별로 따로 봄
 */
export async function draftAcceptance() {
  const [row] = await db
    .select({
      withDraft: raw<number>`count(*)::int`.mapWith(Number),
      untouched: raw<number>`count(*) filter (where cardinality(${reports.aiEditedFields}) = 0)::int`.mapWith(
        Number,
      ),
      avgEdits: raw<number>`round(avg(cardinality(${reports.aiEditedFields})), 2)::float8`.mapWith(
        Number,
      ),
    })
    .from(reports)
    .where(raw`${reports.aiModel} is not null`)
  return row
}

/** 점수 구간별 후보 수. 임계값을 어디에 둘지 판단하는 근거 */
export function matchScoreDistribution() {
  return db
    .select({
      bucket: raw<string>`(width_bucket(${matchScores.score}, 0, 100, 10) - 1) * 10 || '-' || width_bucket(${matchScores.score}, 0, 100, 10) * 10`,
      count: raw<number>`count(*)::int`.mapWith(Number),
    })
    .from(matchScores)
    .groupBy(raw`1`)
    .orderBy(raw`min(${matchScores.score})`)
}

/** 항목별 평균 점수. 어느 축이 순위를 지배하는지 봄 */
export async function matchBreakdownAverages() {
  const [row] = await db
    .select({
      pairs: raw<number>`count(*)::int`.mapWith(Number),
      avgScore: raw<number>`round(avg(${matchScores.score}), 1)::float8`.mapWith(Number),
      maxScore: raw<number>`max(${matchScores.score})::int`.mapWith(Number),
      distance: raw<number>`round(avg((${matchScores.breakdown} ->> 'distance')::numeric), 1)::float8`.mapWith(
        Number,
      ),
      time: raw<number>`round(avg((${matchScores.breakdown} ->> 'time')::numeric), 1)::float8`.mapWith(
        Number,
      ),
      color: raw<number>`round(avg((${matchScores.breakdown} ->> 'color')::numeric), 1)::float8`.mapWith(
        Number,
      ),
      size: raw<number>`round(avg((${matchScores.breakdown} ->> 'size')::numeric), 1)::float8`.mapWith(
        Number,
      ),
      features: raw<number>`round(avg((${matchScores.breakdown} ->> 'features')::numeric), 1)::float8`.mapWith(
        Number,
      ),
    })
    .from(matchScores)
  return row
}
