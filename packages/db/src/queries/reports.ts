import 'server-only'

import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  sql as raw,
} from 'drizzle-orm'

import { db } from '../client'
import { reportFlags, reportPhotos, reports } from '../schema/reports'

// 공개 응답에 나갈 컬럼
// exactPoint·coarsePoint·manageTokenHash·reporterId·aiRaw 는 여기 넣지 않음
// 출시 UI 가 행정구역명만 쓰므로 coarsePoint 도 공개 응답에서 뺐음. POL-09
export const publicReportColumns = {
  id: reports.id,
  kind: reports.kind,
  visibility: reports.visibility,
  lifecycle: reports.lifecycle,
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
  areaName: reports.areaName,
  landmarkNote: reports.landmarkNote,
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
  // 공개 응답이 격자 좌표조차 내주지 않게 함. 반복 질의로 정밀도가 좁아지는 것을 막음
  | 'coarsePoint'
  | 'reporterId'
  | 'manageTokenHash'
  | 'manageTokenIssuedAt'
  | 'manageTokenRotatedAt'
  | 'aiRaw'
  | 'aiEditedFields'
  | 'locationAccuracyM'

// 민감 필드가 공개 컬럼에 섞이면 typecheck 가 깨짐
const _noLeak: Extract<keyof typeof publicReportColumns, SensitiveKey> extends never
  ? true
  : never = true
void _noLeak

/**
 * 공개 상세. visibility 가 public 이 아니거나 행이 없으면 똑같이 undefined
 * 숨김·삭제·없는 ID 를 구분해 알려주면 신고 남용의 정찰 수단이 됨. WEB-07-E01
 */
export function findPublicReport(id: string) {
  return db.query.reports.findFirst({
    where: and(eq(reports.id, id), eq(reports.visibility, 'public')),
    columns: {
      exactPoint: false,
      coarsePoint: false,
      reporterId: false,
      manageTokenHash: false,
      manageTokenIssuedAt: false,
      manageTokenRotatedAt: false,
      aiRaw: false,
      aiEditedFields: false,
      locationAccuracyM: false,
    },
    with: { photos: publicPhotoSelection },
  })
}

export type PublicListOptions = {
  kind?: (typeof reports.kind.enumValues)[number]
  // 행정구역 코드. 상위 코드를 주면 하위를 접두 일치로 포함함
  areaCode?: string
  animalType?: (typeof reports.animalType.enumValues)[number]
  size?: (typeof reports.size.enumValues)[number]
  colors?: string[]
  // 목격 시각 기준 기간. 기본 7일, 확장 30·90일
  fromOccurredAt?: Date
  toOccurredAt?: Date
  // 종료 기록은 기본 제외하고 필터로만 확인 가능
  includeClosed?: boolean
  cursor?: PublicListCursor
  limit?: number
}

/**
 * 최신순 커서. 목격 시각이 같은 행이 섞여도 같은 카드가 두 번 나오지 않게
 * id 까지 함께 비교함
 */
export type PublicListCursor = { occurredAt: Date; id: string }

const PUBLIC_LIST_LIMIT = 20

/** 공개 목록. 좌표가 아니라 행정구역 코드로 좁힘. WEB-08 */
export function listPublicReports({
  kind,
  areaCode,
  animalType,
  size,
  colors,
  fromOccurredAt,
  toOccurredAt,
  includeClosed = false,
  cursor,
  limit = PUBLIC_LIST_LIMIT,
}: PublicListOptions = {}) {
  return db
    .select(publicReportColumns)
    .from(reports)
    .where(
      and(
        eq(reports.visibility, 'public'),
        kind ? eq(reports.kind, kind) : undefined,
        includeClosed
          ? undefined
          : raw`${reports.lifecycle} in ('active', 'searching')`,
        // 접두 일치로 상위 행정구역을 포함. like 인젝션은 드라이버가 파라미터로 막음
        areaCode ? raw`${reports.areaCode} like ${areaCode + '%'}` : undefined,
        animalType ? eq(reports.animalType, animalType) : undefined,
        size ? eq(reports.size, size) : undefined,
        // 고른 털색 중 하나라도 겹치면 후보. 교집합이 아니라 합집합 조건
        colors?.length ? raw`${reports.colors} && ${colors}` : undefined,
        fromOccurredAt ? gte(reports.occurredAt, fromOccurredAt) : undefined,
        toOccurredAt ? lte(reports.occurredAt, toOccurredAt) : undefined,
        cursor
          ? raw`(${reports.occurredAt}, ${reports.id}) < (${cursor.occurredAt}, ${cursor.id})`
          : undefined,
      ),
    )
    .orderBy(desc(reports.occurredAt), desc(reports.id))
    .limit(limit)
}

/** 홈 지도 마커 상한. 한 화면에 그릴 수 있는 수를 넘기지 않음 */
const MAP_LIMIT = 100

export type MapListOptions = {
  fromOccurredAt?: Date
  limit?: number
}

/**
 * 홈 지도 마커. 격자 스냅 좌표만 고르고 exactPoint 는 선택하지 않음
 * 공개 응답은 POL-09 대로 좌표를 내주지 않으므로 서버 컴포넌트에서만 부름
 */
export function listMapReports({
  fromOccurredAt,
  limit = MAP_LIMIT,
}: MapListOptions = {}) {
  return db
    .select({
      id: reports.id,
      animalType: reports.animalType,
      size: reports.size,
      colors: reports.colors,
      careSituation: reports.careSituation,
      injury: reports.injury,
      areaName: reports.areaName,
      occurredAt: reports.occurredAt,
      coarsePoint: reports.coarsePoint,
      coarseGridM: reports.coarseGridM,
      // 카드에 쓸 첫 사진 경로. 서명 URL 은 호출자가 한 번에 만듦
      photoPath: raw<string | null>`(
        select p.storage_path from ${reportPhotos} p
        where p.report_id = ${reports}.id
        order by p.sort_order limit 1
      )`,
    })
    .from(reports)
    .where(
      and(
        eq(reports.kind, 'sighting'),
        eq(reports.visibility, 'public'),
        eq(reports.lifecycle, 'active'),
        // 지역만 고른 제보는 격자 좌표가 없어 마커로 찍지 않음
        isNotNull(reports.coarsePoint),
        fromOccurredAt ? gte(reports.occurredAt, fromOccurredAt) : undefined,
      ),
    )
    .orderBy(desc(reports.occurredAt), desc(reports.id))
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
      visibility: reports.visibility,
      lifecycle: reports.lifecycle,
      version: reports.version,
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

/**
 * 사진 서명 URL 발급 전 경로 조회
 * 발급마다 visibility 를 다시 확인함. 숨김 처리 후 신규 발급이 멈춰야 함. POL-10
 */
export async function findReportPhotoPaths(reportId: string) {
  const rows = await db
    .select({
      storagePath: reportPhotos.storagePath,
      sortOrder: reportPhotos.sortOrder,
      visibility: reports.visibility,
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
    .where(and(eq(reports.id, id), eq(reports.visibility, 'public')))
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
 * 운영자 판정. 제보 visibility 와 해당 제보의 미판정 신고를 함께 닫음
 * hide 는 hidden 으로, keep 은 public 으로 되돌림
 * lifecycle 은 건드리지 않음. 종료 사실을 운영자가 대신 인증하지 않기 때문. POL-06
 */
export async function resolveFlags(input: {
  reportId: string
  decision: (typeof reportFlags.resolution.enumValues)[number]
  note?: string
}) {
  // 판정이 공개 상태를 바꾸는 경우만 반영. request_edit·escalate 는 노출을 유지
  const nextVisibility =
    input.decision === 'hide'
      ? ('hidden' as const)
      : input.decision === 'keep'
        ? ('public' as const)
        : undefined

  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(reports)
      .set(
        nextVisibility
          ? { visibility: nextVisibility, version: raw`${reports.version} + 1` }
          // 변경이 없어도 판정 시각을 남기려면 행을 잠가야 하므로 updatedAt 만 올림
          : { updatedAt: new Date() },
      )
      .where(eq(reports.id, input.reportId))
      .returning({
        id: reports.id,
        visibility: reports.visibility,
        version: reports.version,
      })
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

// 운영 화면에도 정확 좌표를 표시하지 않음. 권한 승격으로도 지도 핀을 주지 않음. POL-25
export const adminReportColumns = {
  ...publicReportColumns,
  version: reports.version,
  aiRaw: reports.aiRaw,
  aiModel: reports.aiModel,
  aiAnalyzedAt: reports.aiAnalyzedAt,
  aiEditedFields: reports.aiEditedFields,
  areaCode: reports.areaCode,
  areaCodeSystem: reports.areaCodeSystem,
  coarseGridM: reports.coarseGridM,
  locationSource: reports.locationSource,
  closedAt: reports.closedAt,
  closeReason: reports.closeReason,
  updatedAt: reports.updatedAt,
} as const

// 운영 컬럼에도 좌표와 제보자 식별자가 섞이면 typecheck 가 깨짐
const _noAdminLeak: Extract<
  keyof typeof adminReportColumns,
  'exactPoint' | 'coarsePoint' | 'reporterId' | 'manageTokenHash'
> extends never
  ? true
  : never = true
void _noAdminLeak

type AdminListOptions = {
  kind?: (typeof reports.kind.enumValues)[number]
  visibility?: (typeof reports.visibility.enumValues)[number]
  lifecycle?: (typeof reports.lifecycle.enumValues)[number]
  areaCode?: string
  flaggedOnly?: boolean
  limit?: number
  offset?: number
}

export async function listAdminReports({
  kind,
  visibility,
  lifecycle,
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
        visibility ? eq(reports.visibility, visibility) : undefined,
        lifecycle ? eq(reports.lifecycle, lifecycle) : undefined,
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
    columns: {
      exactPoint: false,
      coarsePoint: false,
      reporterId: false,
      manageTokenHash: false,
      manageTokenIssuedAt: false,
      manageTokenRotatedAt: false,
    },
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
