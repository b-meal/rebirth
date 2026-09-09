import 'server-only'

import { and, desc, eq, gte, lte, ne, sql as raw } from 'drizzle-orm'

import { db } from '../client'
import { matchScores, reportPhotos, reports } from '../schema/reports'

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

/**
 * 점수 계산에 쓸 실종 신고 값. 격자 좌표를 포함해 서버 안에서만 씀
 * 응답에 그대로 넣지 않음. 호출부가 점수만 뽑아 쓰는 것을 전제로 함
 */
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

export { CANDIDATE_RADIUS_M, CANDIDATE_WINDOW_DAYS }
