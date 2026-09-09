import 'server-only'

import { and, desc, eq, gte, lte, ne, sql as raw } from 'drizzle-orm'

import { db } from '../client'
import { matchScores, reportPhotos, reports } from '../schema/reports'

/* 실종 신고와 후보 조회. 연락처를 받지 않고 토큰으로만 접근 */

// 후보를 찾을 반경. 이 밖은 거리 점수가 0이라 조회하지 않음
const CANDIDATE_RADIUS_M = 15_000
// 실종 시각 기준으로 후보를 모을 기간. 이후 목격만 점수를 받음
const CANDIDATE_WINDOW_DAYS = 14

/** 토큰으로 내 신고를 찾음. 토큰이 유일한 접근 수단 */
export function findLostByToken(token: string) {
  return db.query.reports.findFirst({
    where: and(eq(reports.contactToken, token), eq(reports.kind, 'lost')),
    // 자기 신고라 정확 좌표도 내주지 않음. 화면이 좌표를 쓰지 않기 때문
    columns: { exactPoint: false, reporterId: false },
    with: { photos: { orderBy: [reportPhotos.sortOrder] } },
  })
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
      areaName: reports.areaName,
      occurredAt: reports.occurredAt,
    })
    .from(reports)
    .where(
      and(
        eq(reports.kind, 'sighting'),
        eq(reports.status, 'open'),
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

/** 저장된 후보를 점수 내림차순으로. 사진은 서명 URL 발급 경로에서 따로 받음 */
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
      status: reports.status,
    })
    .from(matchScores)
    .innerJoin(reports, eq(matchScores.sightingId, reports.id))
    .where(and(eq(matchScores.lostId, lostId), eq(reports.status, 'open')))
    .orderBy(desc(matchScores.score), desc(reports.occurredAt))
    .limit(limit)
}

/** 후보가 생기면 실종 신고를 matched 로 올림. 이미 종료된 신고는 건드리지 않음 */
export async function markLostMatched(lostId: string) {
  const [row] = await db
    .update(reports)
    .set({ status: 'matched' })
    .where(and(eq(reports.id, lostId), eq(reports.status, 'open')))
    .returning({ id: reports.id, status: reports.status })
  return row
}

export { CANDIDATE_RADIUS_M, CANDIDATE_WINDOW_DAYS }
