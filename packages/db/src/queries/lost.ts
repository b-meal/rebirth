import 'server-only'

import { and, asc, desc, eq, gte, lte, ne, sql as raw } from 'drizzle-orm'

import { db } from '../client'
import { matchScores, pets, reportPhotos, reports } from '../schema'

/* 실종 신고와 후보 조회. 연락처를 받지 않고 토큰으로만 접근 */

// 후보를 찾을 반경. 이 밖은 거리 점수가 0이라 조회하지 않음
const CANDIDATE_RADIUS_M = 15_000
// 실종 시각 기준으로 후보를 모을 기간. 이후 목격만 점수를 받음
const CANDIDATE_WINDOW_DAYS = 14

/**
 * 관리 토큰 해시로 내 기록을 찾음. 원문 토큰은 저장하지 않으므로 해시를 받음
 * 공개 ID 만으로는 접근할 수 없음. POL-03
 */
export function findReportByManageTokenHash(tokenHash: string) {
  return db.query.reports.findFirst({
    where: eq(reports.manageTokenHash, tokenHash),
    // 자기 기록이라도 정확 좌표는 내주지 않음. 화면이 좌표를 쓰지 않기 때문
    columns: {
      exactPoint: false,
      coarsePoint: false,
      reporterId: false,
      manageTokenHash: false,
    },
    with: { photos: { orderBy: [reportPhotos.sortOrder] } },
  })
}

/** 닮은 제보를 알림함에 올릴 점수 하한. 후보 목록보다 높게 두어 덜 시끄럽게 함 */
export const MATCH_ALERT_MIN_SCORE = 55

/**
 * 새로 올라온 제보와 견줄 실종 신고
 * 후보 모집의 반대 방향. 제보가 들어오는 순간 점수를 캐시에 남겨
 * 보호자가 후보 화면을 열기 전에도 알림함이 셀 수 있게 함
 * 알림을 끈 신고와 이미 끝난 신고는 계산하지 않음
 */
export async function findLostForSighting(input: {
  sightingId: string
  animalType: (typeof reports.animalType.enumValues)[number]
  point: { lat: number; lng: number } | null
  occurredAt: Date
  limit?: number
}) {
  // 제보 시각보다 앞서 잃어버린 신고만 견줌. 하루 뒤까지는 실종 시점이 어림이라 함께 봄
  const since = new Date(
    input.occurredAt.getTime() - CANDIDATE_WINDOW_DAYS * 24 * 3_600_000,
  )
  const until = new Date(input.occurredAt.getTime() + 24 * 3_600_000)

  const withinRadius = input.point
    ? raw`ST_DWithin(${reports.coarsePoint}::geography, ST_SetSRID(ST_MakePoint(${input.point.lng}, ${input.point.lat}), 4326)::geography, ${CANDIDATE_RADIUS_M})`
    : undefined

  return db
    .select({
      id: reports.id,
      animalType: reports.animalType,
      colors: reports.colors,
      size: reports.size,
      collar: reports.collar,
      injury: reports.injury,
      earTip: reports.earTip,
      coarsePoint: reports.coarsePoint,
      locationSource: reports.locationSource,
      occurredAt: reports.occurredAt,
    })
    .from(reports)
    .where(
      and(
        eq(reports.kind, 'lost'),
        eq(reports.visibility, 'public'),
        eq(reports.lifecycle, 'searching'),
        eq(reports.matchAlert, true),
        ne(reports.id, input.sightingId),
        input.animalType === 'unknown'
          ? undefined
          : raw`(${reports.animalType} = ${input.animalType} or ${reports.animalType} = 'unknown')`,
        gte(reports.occurredAt, since),
        lte(reports.occurredAt, until),
        withinRadius,
      ),
    )
    .orderBy(desc(reports.occurredAt))
    .limit(input.limit ?? 50)
}

/**
 * 이 발견 제보와 견줄 공개 실종 신고. 로그인하지 않은 사람이 둘러볼 때 씀
 * matchAlert 로 거르지 않음. 그 값은 알림함 스위치라 공개 노출의 뜻이 아니고
 * 알림을 꺼 둔 보호자가 목록에서 사라지면 찾을 기회만 줄어듦
 * 내주는 값은 제보 상세가 이미 공개하는 항목뿐. 정확 좌표는 읽지 않음
 */
export function findPublicLostForSighting(input: {
  sightingId: string
  animalType: (typeof reports.animalType.enumValues)[number]
  point: { lat: number; lng: number } | null
  occurredAt: Date
  limit?: number
}) {
  const since = new Date(
    input.occurredAt.getTime() - CANDIDATE_WINDOW_DAYS * 24 * 3_600_000,
  )
  const until = new Date(input.occurredAt.getTime() + 24 * 3_600_000)

  const withinRadius = input.point
    ? raw`ST_DWithin(${reports.coarsePoint}::geography, ST_SetSRID(ST_MakePoint(${input.point.lng}, ${input.point.lat}), 4326)::geography, ${CANDIDATE_RADIUS_M})`
    : undefined

  return db
    .select({
      id: reports.id,
      animalType: reports.animalType,
      colors: reports.colors,
      size: reports.size,
      collar: reports.collar,
      injury: reports.injury,
      earTip: reports.earTip,
      coarsePoint: reports.coarsePoint,
      locationSource: reports.locationSource,
      areaName: reports.areaName,
      occurredAt: reports.occurredAt,
      // 이름은 찾는 데 쓰라고 공개하는 값. 제보 상세도 같은 값을 보여 줌
      petName: raw<string | null>`(
        select p.name from ${pets} p where p.id = ${reports}.pet_id
      )`,
    })
    .from(reports)
    .where(
      and(
        eq(reports.kind, 'lost'),
        eq(reports.visibility, 'public'),
        eq(reports.lifecycle, 'searching'),
        ne(reports.id, input.sightingId),
        input.animalType === 'unknown'
          ? undefined
          : raw`(${reports.animalType} = ${input.animalType} or ${reports.animalType} = 'unknown')`,
        gte(reports.occurredAt, since),
        lte(reports.occurredAt, until),
        withinRadius,
      ),
    )
    .orderBy(desc(reports.occurredAt))
    .limit(input.limit ?? 50)
}

/**
 * 이 계정이 낸 실종 신고. 발견 제보 하나와 견주려고 읽음
 * 후보 모집과 달리 반경과 기간으로 좁히지 않음
 * 내 신고는 몇 건뿐이라 미리 걸러 내면 왜 빠졌는지 알 수 없는 빈 화면이 됨
 * 끝난 신고는 뺌. 이미 만난 아이를 다시 견줄 대상으로 올리지 않음
 */
export function findMyLostForSighting(input: { userId: string; limit?: number }) {
  return db
    .select({
      id: reports.id,
      animalType: reports.animalType,
      colors: reports.colors,
      size: reports.size,
      collar: reports.collar,
      injury: reports.injury,
      earTip: reports.earTip,
      coarsePoint: reports.coarsePoint,
      locationSource: reports.locationSource,
      areaName: reports.areaName,
      occurredAt: reports.occurredAt,
      // 적어 둔 이름. 보호자 화면이라 흰색 소형견 대신 이름으로 부름
      petName: raw<string | null>`(
        select p.name from ${pets} p where p.id = ${reports}.pet_id
      )`,
    })
    .from(reports)
    .where(
      and(
        eq(reports.reporterId, input.userId),
        eq(reports.kind, 'lost'),
        eq(reports.lifecycle, 'searching'),
        ne(reports.visibility, 'deleted'),
      ),
    )
    .orderBy(desc(reports.occurredAt))
    .limit(input.limit ?? 20)
}

export type MyLostForSighting = Awaited<
  ReturnType<typeof findMyLostForSighting>
>[number]

/**
 * 점수 계산에 쓸 실종 신고 값. 격자 좌표를 포함해 서버 안에서만 씀
 * 응답에 그대로 넣지 않음. 호출부가 점수만 뽑아 쓰는 것을 전제로 함
 */
export function findReportForScoring(id: string) {
  return db
    .select({
      id: reports.id,
      kind: reports.kind,
      animalType: reports.animalType,
      colors: reports.colors,
      size: reports.size,
      collar: reports.collar,
      injury: reports.injury,
      earTip: reports.earTip,
      coarsePoint: reports.coarsePoint,
      locationSource: reports.locationSource,
      occurredAt: reports.occurredAt,
    })
    .from(reports)
    .where(eq(reports.id, id))
    .limit(1)
}

export function findLostForScoring(id: string) {
  return db
    .select({
      id: reports.id,
      kind: reports.kind,
      animalType: reports.animalType,
      colors: reports.colors,
      size: reports.size,
      collar: reports.collar,
      injury: reports.injury,
      earTip: reports.earTip,
      coarsePoint: reports.coarsePoint,
      locationSource: reports.locationSource,
      occurredAt: reports.occurredAt,
    })
    .from(reports)
    .where(and(eq(reports.id, id), eq(reports.kind, 'lost')))
    .limit(1)
}

/**
 * 후보가 될 목격 제보. 종과 반경, 기간으로 1차만 걸러냄
 * 점수는 서버에서 계산하므로 여기서는 후보 모집만 함
 */
export async function findCandidateSightings(input: {
  lostId: string
  animalType: (typeof reports.animalType.enumValues)[number]
  point: { lat: number; lng: number } | null
  occurredAt: Date
  limit?: number
}) {
  // 실종 시각보다 조금 앞선 목격도 모음. 실종 시점을 정확히 아는 보호자가 드묾
  // 앞선 목격은 점수 계산에서 시간 0점을 받아 뒤로 밀림
  const since = new Date(input.occurredAt.getTime() - 24 * 3_600_000)
  const until = new Date(
    input.occurredAt.getTime() + CANDIDATE_WINDOW_DAYS * 24 * 3_600_000,
  )

  // 좌표가 없으면 반경으로 좁히지 못하므로 기간과 종만으로 모음
  const withinRadius = input.point
    ? raw`ST_DWithin(${reports.coarsePoint}::geography, ST_SetSRID(ST_MakePoint(${input.point.lng}, ${input.point.lat}), 4326)::geography, ${CANDIDATE_RADIUS_M})`
    : undefined

  return db
    .select({
      id: reports.id,
      animalType: reports.animalType,
      appearance: reports.appearance,
      colors: reports.colors,
      size: reports.size,
      collar: reports.collar,
      injury: reports.injury,
      earTip: reports.earTip,
      conditionTags: reports.conditionTags,
      careSituation: reports.careSituation,
      coarsePoint: reports.coarsePoint,
      // 수동 지역이나 정확도가 낮은 GPS 는 거리 점수를 주지 않고 정보 부족으로 표시
      locationSource: reports.locationSource,
      locationAccuracyM: reports.locationAccuracyM,
      areaCode: reports.areaCode,
      areaName: reports.areaName,
      occurredAt: reports.occurredAt,
    })
    .from(reports)
    .where(
      and(
        eq(reports.kind, 'sighting'),
        eq(reports.visibility, 'public'),
        eq(reports.lifecycle, 'active'),
        ne(reports.id, input.lostId),
        // 종이 다르면 후보가 아님. unknown 은 사용자가 판단하게 남김
        input.animalType === 'unknown'
          ? undefined
          : raw`(${reports.animalType} = ${input.animalType} or ${reports.animalType} = 'unknown')`,
        gte(reports.occurredAt, since),
        lte(reports.occurredAt, until),
        withinRadius,
      ),
    )
    .orderBy(desc(reports.occurredAt))
    .limit(input.limit ?? 200)
}

export type CandidateSighting = Awaited<
  ReturnType<typeof findCandidateSightings>
>[number]

/** 계산한 점수를 캐시. 같은 짝이 다시 오면 갱신 */
export async function upsertMatchScores(
  rows: (typeof matchScores.$inferInsert)[],
) {
  if (rows.length === 0) return []
  return db
    .insert(matchScores)
    .values(rows)
    .onConflictDoUpdate({
      target: [matchScores.lostId, matchScores.sightingId],
      set: {
        score: raw`excluded.score`,
        breakdown: raw`excluded.breakdown`,
        createdAt: raw`now()`,
      },
    })
    .returning({ id: matchScores.id })
}

/**
 * 저장된 후보를 점수 내림차순으로. 사진은 서명 URL 발급 경로에서 따로 받음
 * 정렬은 점수 → 목격시각 → id 로 고정. 동점이 섞여도 커서 페이징이 어긋나지 않음
 * 숨겨진 제보는 후보에서 빠짐. 조회 시점의 visibility 를 다시 확인함
 */
export async function findMatchesForLost(lostId: string, limit = 30) {
  return db
    .select({
      sightingId: matchScores.sightingId,
      score: matchScores.score,
      breakdown: matchScores.breakdown,
      appearance: reports.appearance,
      colors: reports.colors,
      size: reports.size,
      careSituation: reports.careSituation,
      conditionTags: reports.conditionTags,
      areaName: reports.areaName,
      occurredAt: reports.occurredAt,
      lifecycle: reports.lifecycle,
    })
    .from(matchScores)
    .innerJoin(reports, eq(matchScores.sightingId, reports.id))
    .where(
      and(eq(matchScores.lostId, lostId), eq(reports.visibility, 'public')),
    )
    .orderBy(
      desc(matchScores.score),
      desc(reports.occurredAt),
      desc(reports.id),
    )
    .limit(limit)
}

/**
 * 경로에 이을 목격 제보. 점수 하한을 넘고 좌표 근거가 있는 것만 시간순으로 냄
 * 수동 지역 제보는 격자 좌표가 제보자가 고른 지역 중심이라 이동 근거로 쓰지 못함
 * 정확 좌표는 고르지 않음. 경로·예측은 전부 격자 좌표로만 계산함
 */
export async function findTrackSightings(lostId: string, minScore: number) {
  return db
    .select({
      id: reports.id,
      score: matchScores.score,
      coarsePoint: reports.coarsePoint,
      occurredAt: reports.occurredAt,
      areaName: reports.areaName,
      locationSource: reports.locationSource,
    })
    .from(matchScores)
    .innerJoin(reports, eq(matchScores.sightingId, reports.id))
    .where(
      and(
        eq(matchScores.lostId, lostId),
        eq(reports.visibility, 'public'),
        gte(matchScores.score, minScore),
        ne(reports.locationSource, 'manual_area'),
      ),
    )
    .orderBy(asc(reports.occurredAt))
}

/**
 * 신고 하나의 격자 좌표. 탐색 조언의 중심점으로만 쓰고 응답에는 내보내지 않음
 * findManagedReport 가 좌표를 빼고 돌려주므로 따로 읽음
 * 접근 확인이 끝난 뒤 부르므로 숨긴 신고도 작성자 화면을 위해 읽음
 */
export async function findLostCoarsePoint(reportId: string) {
  const [row] = await db
    .select({ coarsePoint: reports.coarsePoint })
    .from(reports)
    .where(eq(reports.id, reportId))
    .limit(1)
  return row?.coarsePoint ?? null
}

/**
 * 한 점 주변 반경 안 공개 발견 제보 수. 탐색 조언의 분모와 커버리지에 씀
 * 수동 지역 제보는 격자 좌표가 지역 중심이라 거리 근거가 없어 세지 않음
 */
export async function countSightingsAround(input: {
  center: { lat: number; lng: number }
  radiusM: number
  since: Date
  excludeId?: string
}) {
  const [row] = await db
    .select({ count: raw<number>`count(*)::int` })
    .from(reports)
    .where(
      and(
        eq(reports.kind, 'sighting'),
        eq(reports.visibility, 'public'),
        ne(reports.locationSource, 'manual_area'),
        gte(reports.occurredAt, input.since),
        input.excludeId ? ne(reports.id, input.excludeId) : undefined,
        raw`ST_DWithin(${reports.coarsePoint}::geography, ST_SetSRID(ST_MakePoint(${input.center.lng}, ${input.center.lat}), 4326)::geography, ${input.radiusM})`,
      ),
    )
  return row?.count ?? 0
}

export { CANDIDATE_RADIUS_M, CANDIDATE_WINDOW_DAYS }
