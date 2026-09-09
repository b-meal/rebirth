import 'server-only'

import { and, desc, eq, sql as raw } from 'drizzle-orm'

import { db } from '../client'
import { reportPhotos, reports } from '../schema/reports'

// 공개 응답에 나갈 컬럼. exactPoint, contactToken, reporterId, aiRaw 는 여기 넣지 않음
export const publicReportColumns = {
  id: reports.id,
  kind: reports.kind,
  status: reports.status,
  careSituation: reports.careSituation,
  animalType: reports.animalType,
  appearance: reports.appearance,
  colors: reports.colors,
  size: reports.size,
  sex: reports.sex,
  neutered: reports.neutered,
  conditionTags: reports.conditionTags,
  collar: reports.collar,
  injury: reports.injury,
  earTip: reports.earTip,
  coarsePoint: reports.coarsePoint,
  areaName: reports.areaName,
  occurredAt: reports.occurredAt,
  shareCount: reports.shareCount,
  createdAt: reports.createdAt,
} as const

export type PublicReport = {
  [K in keyof typeof publicReportColumns]: (typeof reports.$inferSelect)[K]
}

type SensitiveKey =
  | 'exactPoint'
  | 'reporterId'
  | 'contactToken'
  | 'aiRaw'
  | 'aiEditedFields'

// 민감 필드가 공개 컬럼에 섞이면 typecheck 가 깨짐
const _noLeak: Extract<keyof typeof publicReportColumns, SensitiveKey> extends never
  ? true
  : never = true
void _noLeak

type NearbyOptions = {
  lat: number
  lng: number
  radiusM?: number
  kind?: (typeof reports.kind.enumValues)[number]
  limit?: number
}

const asPoint = (lat: number, lng: number) =>
  raw`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`

/** 반경 내 공개 제보. 거리는 격자 좌표 기준이라 정확 위치가 역산되지 않음 */
export function findNearbyReports({
  lat,
  lng,
  radiusM = 3000,
  kind,
  limit = 50,
}: NearbyOptions) {
  const origin = asPoint(lat, lng)
  const distance = raw<number>`round(ST_Distance(${reports.coarsePoint}::geography, ${origin}))`

  return db
    .select({ ...publicReportColumns, approxDistanceM: distance })
    .from(reports)
    .where(
      and(
        eq(reports.status, 'open'),
        kind ? eq(reports.kind, kind) : undefined,
        raw`ST_DWithin(${reports.coarsePoint}::geography, ${origin}, ${radiusM})`,
      ),
    )
    .orderBy(distance)
    .limit(limit)
}

export function findPublicReport(id: string) {
  return db.query.reports.findFirst({
    where: and(eq(reports.id, id), eq(reports.status, 'open')),
    columns: {
      exactPoint: false,
      contactToken: false,
      reporterId: false,
      aiRaw: false,
      aiEditedFields: false,
    },
    with: { photos: { orderBy: [reportPhotos.sortOrder] } },
  })
}

export function listPublicReports(
  kind?: (typeof reports.kind.enumValues)[number],
  limit = 30,
) {
  return db
    .select(publicReportColumns)
    .from(reports)
    .where(and(eq(reports.status, 'open'), kind ? eq(reports.kind, kind) : undefined))
    .orderBy(desc(reports.occurredAt))
    .limit(limit)
}
