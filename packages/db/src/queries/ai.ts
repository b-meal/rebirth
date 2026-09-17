import 'server-only'

import { desc, sql as raw } from 'drizzle-orm'

import { db } from '../client'
import {
  matchReviews,
  analysisJobs,
  matchScores,
  reportEmbeddings,
  reportFlags,
  reports,
} from '../schema'

/* 운영 대시보드 집계. 사진 원본과 좌표를 읽지 않고 건수와 실행 기록만 셈 */

// 추이 기본 기간. 대회 기간 전체가 이 아래라 더 늘릴 이유가 없음
export const TREND_DAYS = 30

/**
 * 분석 작업 현황. 성공률과 지연을 한 행으로 돌려줌
 * model 을 주면 그 모델의 기록만 셈. 더미와 일회성 실험이 섞이면 배포된 값이 가려짐
 */
export async function analysisJobSummary({ model }: { model?: string } = {}) {
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
    .where(model ? raw`${analysisJobs.model} = ${model}` : undefined)
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

/** 모델을 남기기 전에 끊긴 실패. 어느 모델의 실패인지 알 수 없어 따로 셈 */
export async function countUnattributedFailures() {
  const [row] = await db
    .select({ total: raw<number>`count(*)::int`.mapWith(Number) })
    .from(analysisJobs)
    .where(raw`${analysisJobs.status} = 'failed' and ${analysisJobs.model} is null`)
  return row
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

/**
 * 일자별 추이. 기록이 없는 날도 자리를 지켜야 끊긴 구간이 보임
 * 빈 날 채우기를 SQL 에서 하는 이유는 화면에서 하면 서버 시계와 DB 시계가 갈려서임
 */
export function analysisJobsDaily(days = TREND_DAYS) {
  return db
    .select({
      day: raw<string>`to_char(d.day, 'YYYY-MM-DD')`,
      total: raw<number>`count(${analysisJobs.id})::int`.mapWith(Number),
      failed: raw<number>`count(*) filter (where ${analysisJobs.status} = 'failed')::int`.mapWith(
        Number,
      ),
    })
    .from(
      raw`generate_series(
        date_trunc('day', now()) - make_interval(days => ${days - 1}),
        date_trunc('day', now()),
        interval '1 day'
      ) as d(day)`,
    )
    .leftJoin(
      analysisJobs,
      raw`date_trunc('day', ${analysisJobs.createdAt}) = d.day`,
    )
    .groupBy(raw`d.day`)
    .orderBy(raw`d.day`)
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

/** 개요 타일. 제보 상태별 건수와 미판정 신고 수를 한 행으로 돌려줌 */
export async function adminOverview() {
  const [row] = await db
    .select({
      total: raw<number>`count(*)::int`.mapWith(Number),
      sightings: raw<number>`count(*) filter (where ${reports.kind} = 'sighting')::int`.mapWith(
        Number,
      ),
      lost: raw<number>`count(*) filter (where ${reports.kind} = 'lost')::int`.mapWith(Number),
      hidden: raw<number>`count(*) filter (where ${reports.visibility} = 'hidden')::int`.mapWith(
        Number,
      ),
      resolved: raw<number>`count(*) filter (where ${reports.lifecycle} = 'resolved')::int`.mapWith(
        Number,
      ),
      last24h: raw<number>`count(*) filter (where ${reports.createdAt} >= now() - interval '24 hours')::int`.mapWith(
        Number,
      ),
    })
    .from(reports)
    .where(raw`${reports.visibility} <> 'deleted'`)
  return row
}

/** 미판정 신고 수. 검수 대기가 쌓이는지만 보면 되므로 건수만 셈 */
export async function countPendingFlags() {
  const [row] = await db
    .select({ reports: raw<number>`count(distinct report_id)::int`.mapWith(Number) })
    .from(reportFlags)
    .where(raw`${reportFlags.resolvedAt} is null`)
  return row
}

/** 일자별 제보 추이. 빈 날은 행이 없으므로 화면에서 채움 */
export function reportsDaily(days = TREND_DAYS) {
  return db
    .select({
      day: raw<string>`to_char(date_trunc('day', ${reports.createdAt}), 'YYYY-MM-DD')`,
      sightings: raw<number>`count(*) filter (where ${reports.kind} = 'sighting')::int`.mapWith(
        Number,
      ),
      lost: raw<number>`count(*) filter (where ${reports.kind} = 'lost')::int`.mapWith(Number),
    })
    .from(reports)
    .where(
      raw`${reports.visibility} <> 'deleted' and ${reports.createdAt} >= now() - make_interval(days => ${days})`,
    )
    .groupBy(raw`1`)
    .orderBy(raw`1 desc`)
}

/** 지역별 상위. 어디에 제보가 몰리는지 보고 보호센터 안내 범위를 조정함 */
export function reportsByArea(limit = 20) {
  return db
    .select({
      areaName: raw<string>`coalesce(${reports.areaName}, '(미확인)')`,
      total: raw<number>`count(*)::int`.mapWith(Number),
      roaming: raw<number>`count(*) filter (where ${reports.careSituation} = 'roaming')::int`.mapWith(
        Number,
      ),
    })
    .from(reports)
    .where(raw`${reports.visibility} <> 'deleted' and ${reports.kind} = 'sighting'`)
    .groupBy(raw`1`)
    .orderBy(raw`2 desc`)
    .limit(limit)
}

/** 보호 상황 분포. 4단계 마무리 문구가 이 분기를 따라감 */
export function careSituationBreakdown() {
  return db
    .select({
      careSituation: reports.careSituation,
      total: raw<number>`count(*)::int`.mapWith(Number),
    })
    .from(reports)
    .where(raw`${reports.visibility} <> 'deleted' and ${reports.kind} = 'sighting'`)
    .groupBy(reports.careSituation)
    .orderBy(raw`2 desc`)
}

/** 이 제보를 후보로 올린 실종 신고. 개체 동일성이 아니라 확인할 후보 목록 */
export function listMatchesForSighting(sightingId: string, limit = 10) {
  return db
    .select({
      lostId: matchScores.lostId,
      score: matchScores.score,
      breakdown: matchScores.breakdown,
      createdAt: matchScores.createdAt,
    })
    .from(matchScores)
    .where(raw`${matchScores.sightingId} = ${sightingId}`)
    .orderBy(raw`${matchScores.score} desc`)
    .limit(limit)
}

/** 재평가 저장. 같은 쌍을 다시 돌리면 덮어씀 */
export async function upsertMatchReview(row: typeof matchReviews.$inferInsert) {
  const [saved] = await db
    .insert(matchReviews)
    .values(row)
    .onConflictDoUpdate({
      target: [matchReviews.lostId, matchReviews.sightingId],
      set: {
        verdict: raw`excluded.verdict`,
        agreements: raw`excluded.agreements`,
        conflicts: raw`excluded.conflicts`,
        checkFirst: raw`excluded.check_first`,
        model: raw`excluded.model`,
        promptVersion: raw`excluded.prompt_version`,
        latencyMs: raw`excluded.latency_ms`,
        createdAt: raw`now()`,
      },
    })
    .returning({ id: matchReviews.id })
  return saved
}

/** 최근 재평가. 근거 문장까지 함께 읽어 화면에서 바로 보여 줌 */
export function listMatchReviews(limit = 20) {
  return db
    .select({
      lostId: matchReviews.lostId,
      sightingId: matchReviews.sightingId,
      verdict: matchReviews.verdict,
      agreements: matchReviews.agreements,
      conflicts: matchReviews.conflicts,
      checkFirst: matchReviews.checkFirst,
      model: matchReviews.model,
      latencyMs: matchReviews.latencyMs,
      createdAt: matchReviews.createdAt,
    })
    .from(matchReviews)
    .orderBy(desc(matchReviews.createdAt))
    .limit(limit)
}

/** 판정별 건수. 모델이 어느 쪽으로 치우치는지 봄 */
export function matchReviewSummary() {
  return db
    .select({
      verdict: matchReviews.verdict,
      total: raw<number>`count(*)::int`.mapWith(Number),
      avgLatencyMs: raw<number | null>`round(avg(${matchReviews.latencyMs}))::int`.mapWith(
        (v) => (v === null ? null : Number(v)),
      ),
    })
    .from(matchReviews)
    .groupBy(matchReviews.verdict)
    .orderBy(raw`2 desc`)
}

/** 아직 재평가하지 않은 상위 점수 후보. 여기부터 돌리면 값어치가 큼 */
export function listUnreviewedPairs(limit = 5) {
  return db
    .select({
      lostId: matchScores.lostId,
      sightingId: matchScores.sightingId,
      score: matchScores.score,
    })
    .from(matchScores)
    .where(
      raw`not exists (
        select 1 from ${matchReviews}
        where ${matchReviews.lostId} = ${matchScores.lostId}
          and ${matchReviews.sightingId} = ${matchScores.sightingId}
      )`,
    )
    .orderBy(desc(matchScores.score))
    .limit(limit)
}

/* 의미 벡터 */

/** 벡터가 붙은 제보 비율. 스크립트를 언제 다시 돌릴지 판단하는 근거 */
export async function embeddingCoverage() {
  const [row] = await db
    .select({
      reports: raw<number>`count(*)::int`.mapWith(Number),
      embedded: raw<number>`count(${reportEmbeddings.reportId})::int`.mapWith(Number),
      model: raw<string | null>`max(${reportEmbeddings.model})`,
      lastAt: raw<string | null>`to_char(max(${reportEmbeddings.createdAt}) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`,
    })
    .from(reports)
    .leftJoin(reportEmbeddings, raw`${reportEmbeddings.reportId} = ${reports.id}`)
    .where(raw`${reports.visibility} <> 'deleted'`)
  return row
}

export type SemanticNeighbor = {
  lostId: string
  lostText: string
  sightingId: string
  sightingText: string
  similarity: number
  scored: boolean
}

/**
 * 실종 신고마다 표현이 가장 가까운 발견 제보를 찾음
 * scored 가 false 면 배점이 후보로 올리지 않은 쌍이라 벡터가 새로 찾아낸 것
 */
export async function listSemanticNeighbors(limit = 8): Promise<SemanticNeighbor[]> {
  // 같은 문장을 가진 실종 신고가 여럿이라 제보 기준으로 한 줄만 남김
  const rows = await db.execute(raw`
    select * from (
      select distinct on (s.id)
        l.id                                as "lostId",
        le.source_text                      as "lostText",
        s.id                                as "sightingId",
        s.source_text                       as "sightingText",
        round((1 - (le.embedding <=> s.embedding))::numeric, 3)::float8 as "similarity",
        exists (
          select 1 from match_scores m
          where m.lost_id = l.id and m.sighting_id = s.id
        )                                   as "scored"
      from reports l
      join report_embeddings le on le.report_id = l.id
      cross join lateral (
        select r.id, e.embedding, e.source_text
        from reports r
        join report_embeddings e on e.report_id = r.id
        where r.kind = 'sighting'
          and r.visibility = 'public'
        order by e.embedding <=> le.embedding
        limit 1
      ) s
      where l.kind = 'lost' and l.visibility = 'public'
      order by s.id, 5 desc
    ) t
    order by t."similarity" desc
    limit ${limit}`)
  return rows as unknown as SemanticNeighbor[]
}

/** 이 제보와 표현이 가까운 다른 제보. 자기 자신은 뺌 */
export async function findSimilarReports(reportId: string, limit = 5) {
  const rows = await db.execute(raw`
    select
      r.id                                as "id",
      r.area_name                         as "areaName",
      r.kind                              as "kind",
      e.source_text                       as "sourceText",
      round((1 - (e.embedding <=> base.embedding))::numeric, 3)::float8 as "similarity"
    from report_embeddings base
    join report_embeddings e on e.report_id <> base.report_id
    join reports r on r.id = e.report_id
    where base.report_id = ${reportId}
      and r.visibility = 'public'
    order by e.embedding <=> base.embedding
    limit ${limit}`)
  return rows as unknown as {
    id: string
    areaName: string | null
    kind: string
    sourceText: string
    similarity: number
  }[]
}

export type VectorPoint = {
  x: number
  y: number
  kind: string
  animalType: string
  label: string
}

/**
 * 벡터 공간을 흩뿌려 보기 위한 표본. 전부 그리면 점이 뭉개져 고르게 솎아냄
 * 좌표는 주성분 둘로 눌러 담은 값이라 거리 판단에 쓰지 않음
 */
export async function listVectorPoints(limit = 1200): Promise<VectorPoint[]> {
  const rows = await db.execute(raw`
    select
      e.proj_x            as "x",
      e.proj_y            as "y",
      r.kind              as "kind",
      r.animal_type       as "animalType",
      left(e.source_text, 60) as "label"
    from report_embeddings e
    join reports r on r.id = e.report_id
    where e.proj_x is not null
      and r.visibility <> 'deleted'
    order by md5(e.report_id::text)
    limit ${limit}`)
  return rows as unknown as VectorPoint[]
}

/** 종별 군집 중심과 퍼짐. 벡터가 종을 갈라내는지 숫자로 확인하는 자리 */
export async function vectorClusters() {
  const rows = await db.execute(raw`
    select
      r.animal_type                                   as "animalType",
      count(*)::int                                   as "total",
      round(avg(e.proj_x)::numeric, 3)::float8        as "cx",
      round(avg(e.proj_y)::numeric, 3)::float8        as "cy",
      round(stddev(e.proj_x)::numeric, 3)::float8     as "spread"
    from report_embeddings e
    join reports r on r.id = e.report_id
    where e.proj_x is not null
    group by 1
    order by 2 desc`)
  return rows as unknown as {
    animalType: string
    total: number
    cx: number
    cy: number
    spread: number | null
  }[]
}

/** 제보 하나의 벡터를 남김, 같은 제보가 다시 오면 덮어씀 */
export async function insertReportEmbedding(input: {
  reportId: string
  embedding: number[]
  sourceText: string
  model: string
}) {
  return db
    .insert(reportEmbeddings)
    .values({
      reportId: input.reportId,
      embedding: input.embedding,
      sourceText: input.sourceText,
      model: input.model,
    })
    .onConflictDoUpdate({
      target: reportEmbeddings.reportId,
      set: {
        embedding: input.embedding,
        sourceText: input.sourceText,
        model: input.model,
      },
    })
}
