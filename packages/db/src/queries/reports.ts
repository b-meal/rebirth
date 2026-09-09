import 'server-only'

import { and, count, desc, eq, inArray, isNull, sql as raw } from 'drizzle-orm'

import { db } from '../client'
import { reportFlags, reportPhotos, reports } from '../schema/reports'

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

// storagePath 는 서명 URL 발급에만 쓰는 내부 경로. 공개 응답에 넣지 않음
const publicPhotoColumns = {
  id: true,
  width: true,
  height: true,
  sortOrder: true,
  createdAt: true,
} as const

export const publicPhotoSelection = {
  columns: publicPhotoColumns,
  orderBy: [reportPhotos.sortOrder],
}

// 공개 사진 컬럼에 storagePath 나 reportId 가 섞이면 typecheck 가 깨짐
const _noPhotoLeak: Extract<
  keyof typeof publicPhotoColumns,
  'storagePath' | 'reportId'
> extends never
  ? true
  : never = true
void _noPhotoLeak

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
    with: { photos: publicPhotoSelection },
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

/* 쓰기 */

type NewReportRow = typeof reports.$inferInsert

/** 제보와 사진을 한 트랜잭션에 넣음. 사진 insert 가 실패하면 제보도 남지 않음 */
export async function insertReportWithPhotos(
  report: NewReportRow,
  photos: Omit<typeof reportPhotos.$inferInsert, 'reportId'>[],
) {
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(reports).values(report).returning({
      id: reports.id,
      status: reports.status,
      createdAt: reports.createdAt,
    })
    if (!row) throw new Error('제보 insert 가 행을 돌려주지 않았습니다')

    if (photos.length > 0) {
      await tx
        .insert(reportPhotos)
        .values(photos.map((p) => ({ ...p, reportId: row.id })))
    }
    return row
  })
}

/** 사진 서명 URL 발급 전 경로 조회. 숨김 제보는 사진을 내주지 않음 */
export async function findReportPhotoPaths(reportId: string) {
  const rows = await db
    .select({
      storagePath: reportPhotos.storagePath,
      sortOrder: reportPhotos.sortOrder,
      status: reports.status,
    })
    .from(reportPhotos)
    .innerJoin(reports, eq(reportPhotos.reportId, reports.id))
    .where(eq(reportPhotos.reportId, reportId))
    .orderBy(reportPhotos.sortOrder)

  return rows
}

export async function bumpShareCount(id: string) {
  const [row] = await db
    .update(reports)
    .set({ shareCount: raw`${reports.shareCount} + 1` })
    .where(and(eq(reports.id, id), eq(reports.status, 'open')))
    .returning({ shareCount: reports.shareCount })
  return row
}

/* 신고와 검수 */

export async function insertFlag(input: typeof reportFlags.$inferInsert) {
  const [row] = await db
    .insert(reportFlags)
    .values(input)
    .returning({ id: reportFlags.id, createdAt: reportFlags.createdAt })
  return row
}

/** 미판정 신고가 쌓인 제보. 검수 대기 목록의 근거 */
export function listPendingFlags(limit = 50) {
  return db
    .select({
      reportId: reportFlags.reportId,
      flagCount: count(reportFlags.id),
      firstReportedAt: raw<Date>`min(${reportFlags.createdAt})`,
      reasons: raw<string[]>`array_agg(distinct ${reportFlags.reason})`,
    })
    .from(reportFlags)
    .where(isNull(reportFlags.resolvedAt))
    .groupBy(reportFlags.reportId)
    .orderBy(desc(count(reportFlags.id)))
    .limit(limit)
}

/**
 * 운영자 판정. 제보 status 와 해당 제보의 미판정 신고를 함께 닫음
 * hide 는 hidden 으로, keep 은 open 으로 되돌림
 */
export async function resolveFlags(input: {
  reportId: string
  decision: 'hide' | 'keep'
  note?: string
}) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(reports)
      .set({ status: input.decision === 'hide' ? 'hidden' : 'open' })
      .where(eq(reports.id, input.reportId))
      .returning({ id: reports.id, status: reports.status })
    if (!row) return null

    const closed = await tx
      .update(reportFlags)
      .set({
        resolvedAt: new Date(),
        resolution: input.decision,
        note: input.note,
      })
      .where(
        and(
          eq(reportFlags.reportId, input.reportId),
          isNull(reportFlags.resolvedAt),
        ),
      )
      .returning({ id: reportFlags.id })

    return { ...row, closedFlags: closed.length }
  })
}

/* 어드민 조회. 좌표는 내주지 않고 AI 초안과 수정 필드는 포함 */

// 운영 화면에도 정확 좌표를 표시하지 않음. exactPoint 는 여기서도 제외
export const adminReportColumns = {
  ...publicReportColumns,
  aiRaw: reports.aiRaw,
  aiModel: reports.aiModel,
  aiAnalyzedAt: reports.aiAnalyzedAt,
  aiEditedFields: reports.aiEditedFields,
  areaCode: reports.areaCode,
  coarseGridM: reports.coarseGridM,
  updatedAt: reports.updatedAt,
} as const

// 운영 컬럼에도 좌표와 제보자 식별자가 섞이면 typecheck 가 깨짐
const _noAdminLeak: Extract<
  keyof typeof adminReportColumns,
  'exactPoint' | 'reporterId' | 'contactToken'
> extends never
  ? true
  : never = true
void _noAdminLeak

type AdminListOptions = {
  kind?: (typeof reports.kind.enumValues)[number]
  status?: (typeof reports.status.enumValues)[number]
  areaCode?: string
  flaggedOnly?: boolean
  limit?: number
  offset?: number
}

export async function listAdminReports({
  kind,
  status,
  areaCode,
  flaggedOnly,
  limit = 30,
  offset = 0,
}: AdminListOptions) {
  const flagged = flaggedOnly
    ? db
        .selectDistinct({ id: reportFlags.reportId })
        .from(reportFlags)
        .where(isNull(reportFlags.resolvedAt))
    : undefined

  return db
    .select(adminReportColumns)
    .from(reports)
    .where(
      and(
        kind ? eq(reports.kind, kind) : undefined,
        status ? eq(reports.status, status) : undefined,
        areaCode ? eq(reports.areaCode, areaCode) : undefined,
        flagged ? inArray(reports.id, flagged) : undefined,
      ),
    )
    .orderBy(desc(reports.createdAt))
    .limit(limit)
    .offset(offset)
}

export function findAdminReport(id: string) {
  return db.query.reports.findFirst({
    where: eq(reports.id, id),
    columns: { exactPoint: false, contactToken: false, reporterId: false },
    with: {
      photos: { orderBy: [reportPhotos.sortOrder] },
      flags: { orderBy: [desc(reportFlags.createdAt)] },
    },
  })
}

/** 지표 화면. AI 초안을 사용자가 고친 빈도 집계 */
export async function countEditedFields() {
  return db
    .select({
      field: raw<string>`unnest(${reports.aiEditedFields})`,
      edits: raw<number>`count(*)::int`,
    })
    .from(reports)
    .where(raw`cardinality(${reports.aiEditedFields}) > 0`)
    .groupBy(raw`1`)
    .orderBy(raw`2 desc`)
}
