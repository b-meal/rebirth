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
  ne,
  sql as raw,
} from 'drizzle-orm'

import { COMMENT_PAGE_SIZE } from '@rebirth/types'

import { db } from '../client'
import { draftSessions } from '../schema/drafts'
import {
  reportComments,
  reportFlags,
  reportInterests,
  reportPhotos,
  reports,
} from '../schema/reports'

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
  breedGuess: reports.breedGuess,
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
  // 자유 검색어. 외형·지역명·털색을 부분 일치로 봄
  q?: string
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
  q,
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
        // 대소문자와 자모 분해는 다루지 않음. 한글 부분 일치면 충분함
        q
          ? raw`(${reports.appearance} ilike ${'%' + q + '%'}
              or ${reports.areaName} ilike ${'%' + q + '%'}
              or ${reports.breedGuess} ilike ${'%' + q + '%'}
              or exists (
                select 1 from unnest(${reports.colors}) as color
                where color ilike ${'%' + q + '%'}
              ))`
          : undefined,
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

/** 카드용 첫 사진 경로. 경로는 공개 응답에 넣지 않고 서명에만 씀 */
export async function findFirstPhotoPaths(reportIds: string[]) {
  const found = new Map<string, string>()
  if (reportIds.length === 0) return found

  const rows = await db
    .select({
      reportId: reportPhotos.reportId,
      storagePath: reportPhotos.storagePath,
    })
    .from(reportPhotos)
    .where(inArray(reportPhotos.reportId, reportIds))
    .orderBy(reportPhotos.reportId, reportPhotos.sortOrder)

  for (const row of rows) {
    if (!found.has(row.reportId)) found.set(row.reportId, row.storagePath)
  }
  return found
}

/* 마이페이지 */

// 카드에 쓸 첫 사진 경로를 함께 읽는 목록 컬럼
const myReportColumns = {
  id: reports.id,
  animalType: reports.animalType,
  breedGuess: reports.breedGuess,
  colors: reports.colors,
  size: reports.size,
  careSituation: reports.careSituation,
  injury: reports.injury,
  areaName: reports.areaName,
  occurredAt: reports.occurredAt,
  visibility: reports.visibility,
  lifecycle: reports.lifecycle,
  photoPath: raw<string | null>`(
    select p.storage_path from ${reportPhotos} p
    where p.report_id = ${reports}.id
    order by p.sort_order limit 1
  )`,
} as const

/** 최근 본 목록처럼 id 를 들고 있는 화면이 카드를 되받을 때 씀 */
export function listReportCards(ids: string[]) {
  if (ids.length === 0) return Promise.resolve([])
  return db
    .select(myReportColumns)
    .from(reports)
    .where(and(inArray(reports.id, ids), eq(reports.visibility, 'public')))
    .limit(ids.length)
}

/** 내가 남긴 제보. 로그인 계정으로 저장된 것만 찾음 */
export function listReportsByReporter(userId: string, limit = 30) {
  return db
    .select(myReportColumns)
    .from(reports)
    .where(and(eq(reports.reporterId, userId), ne(reports.visibility, 'deleted')))
    .orderBy(desc(reports.occurredAt))
    .limit(limit)
}

/** 내가 관심을 누른 제보. 숨겨진 제보는 목록에서 빠짐 */
export function listInterestedReports(userId: string, limit = 30) {
  return db
    .select(myReportColumns)
    .from(reportInterests)
    .innerJoin(reports, eq(reports.id, reportInterests.reportId))
    .where(and(eq(reportInterests.userId, userId), eq(reports.visibility, 'public')))
    .orderBy(desc(reportInterests.createdAt))
    .limit(limit)
}

/* 실시간 차트 */

export type TrendingSort = 'interest' | 'help'

export type TrendingOptions = {
  sort?: TrendingSort
  days?: number
  limit?: number
}

/**
 * 검색 화면의 실시간 차트. 관심·댓글 수를 함께 세고 좌표는 고르지 않음
 * help 는 부상 제보와 오래 배회 중인 제보를 먼저 올려 도움이 급한 순서로 봄
 */
export function listTrendingReports({
  sort = 'interest',
  days = 7,
  limit = 10,
}: TrendingOptions = {}) {
  const interestCount = raw<number>`(
    select count(*)::int from ${reportInterests} i where i.report_id = ${reports}.id
  )`
  const commentCount = raw<number>`(
    select count(*)::int from ${reportComments} c where c.report_id = ${reports}.id
  )`

  return db
    .select({
      id: reports.id,
      animalType: reports.animalType,
      breedGuess: reports.breedGuess,
      colors: reports.colors,
      size: reports.size,
      careSituation: reports.careSituation,
      injury: reports.injury,
      areaName: reports.areaName,
      occurredAt: reports.occurredAt,
      interestCount,
      commentCount,
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
        gte(reports.occurredAt, new Date(Date.now() - days * 86_400_000)),
      ),
    )
    .orderBy(
      ...(sort === 'help'
        ? [
            raw`(${reports.injury} is true) desc`,
            raw`${interestCount} asc`,
            reports.occurredAt,
          ]
        : [
            raw`${interestCount} desc`,
            raw`${commentCount} desc`,
            desc(reports.occurredAt),
          ]),
    )
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

/* 댓글 */

// 세션 id 는 어떤 응답에도 넣지 않음. 표시명은 제보 안에서만 유효한 번호로만 나감
const commentColumns = {
  id: reportComments.id,
  authorSeq: reportComments.authorSeq,
  body: reportComments.body,
  createdAt: reportComments.createdAt,
} as const

export type ReportCommentRow = {
  [K in keyof typeof commentColumns]: (typeof reportComments.$inferSelect)[K]
}

/** 상세 화면의 댓글. 대화 순서대로 읽히게 오래된 것부터 */
export function listReportComments(reportId: string, limit = COMMENT_PAGE_SIZE) {
  return db
    .select(commentColumns)
    .from(reportComments)
    .where(eq(reportComments.reportId, reportId))
    .orderBy(reportComments.createdAt)
    .limit(limit)
}

/**
 * 댓글 저장. 같은 세션이 이 제보에서 이미 받은 번호가 있으면 그 번호를 다시 씀
 * 번호는 제보 안에서만 의미가 있어 다른 제보의 댓글과 같은 사람으로 묶이지 않음
 */
export async function insertReportComment(input: {
  reportId: string
  sessionId: string
  body: string
}) {
  return db.transaction(async (tx) => {
    // 같은 제보에 동시 작성이 겹치면 번호가 중복돼 두 사람이 한 이름으로 보임
    await tx.execute(raw`select pg_advisory_xact_lock(hashtext(${input.reportId}))`)

    const [mine] = await tx
      .select({ authorSeq: reportComments.authorSeq })
      .from(reportComments)
      .where(
        and(
          eq(reportComments.reportId, input.reportId),
          eq(reportComments.sessionId, input.sessionId),
        ),
      )
      .limit(1)

    const [next] = await tx
      .select({
        seq: raw<number>`coalesce(max(${reportComments.authorSeq}), 0) + 1`,
      })
      .from(reportComments)
      .where(eq(reportComments.reportId, input.reportId))

    const [row] = await tx
      .insert(reportComments)
      .values({
        reportId: input.reportId,
        sessionId: input.sessionId,
        authorSeq: mine?.authorSeq ?? next?.seq ?? 1,
        body: input.body,
      })
      .returning(commentColumns)

    return row
  })
}

/* 관심 표시 */

/** 이 제보의 관심 수. 누가 눌렀는지는 세지 않고 합계만 씀 */
export async function countReportInterests(reportId: string) {
  const [row] = await db
    .select({ count: raw<number>`count(*)::int` })
    .from(reportInterests)
    .where(eq(reportInterests.reportId, reportId))
  return row?.count ?? 0
}

/**
 * 서버 렌더가 하트 상태를 알아야 해 쿠키 해시로 바로 조회함
 * 세션을 새로 만들지 않아 단순 열람이 세션 수를 늘리지 않음
 */
export async function hasReportInterest(input: {
  reportId: string
  tokenHash: string
}) {
  const [row] = await db
    .select({ reportId: reportInterests.reportId })
    .from(reportInterests)
    .innerJoin(draftSessions, eq(draftSessions.id, reportInterests.sessionId))
    .where(
      and(
        eq(reportInterests.reportId, input.reportId),
        eq(draftSessions.tokenHash, input.tokenHash),
      ),
    )
    .limit(1)
  return row !== undefined
}

/** 관심 켜고 끄기. 같은 세션이 두 번 눌러도 행이 하나만 남음 */
export async function toggleReportInterest(input: {
  reportId: string
  sessionId: string
  userId?: string
  interested: boolean
}) {
  if (input.interested) {
    await db
      .insert(reportInterests)
      .values({
        reportId: input.reportId,
        sessionId: input.sessionId,
        userId: input.userId ?? null,
      })
      // 이미 눌러 둔 뒤 로그인했으면 계정만 채워 마이페이지에서 보이게 함
      .onConflictDoUpdate({
        target: [reportInterests.reportId, reportInterests.sessionId],
        set: { userId: input.userId ?? null },
      })
  } else {
    await db
      .delete(reportInterests)
      .where(
        and(
          eq(reportInterests.reportId, input.reportId),
          eq(reportInterests.sessionId, input.sessionId),
        ),
      )
  }
  return countReportInterests(input.reportId)
}

/**
 * 상세 화면 지도에 쓸 격자 좌표. 공개 API 는 좌표를 내주지 않아 여기서만 읽음. POL-09
 */
export async function findReportCoarsePoint(id: string) {
  const [row] = await db
    .select({
      coarsePoint: reports.coarsePoint,
      coarseGridM: reports.coarseGridM,
    })
    .from(reports)
    .where(and(eq(reports.id, id), eq(reports.visibility, 'public')))
    .limit(1)
  return row
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
