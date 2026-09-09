import 'server-only'

import { and, desc, eq, isNull, lt, sql as raw } from 'drizzle-orm'

import { db } from '../client'
import {
  MANAGE_SESSION_IDLE_DAYS,
  consentRecords,
  manageGrants,
  manageSessions,
} from '../schema/manage'
import { reportPhotos, reports } from '../schema/reports'

// 익명 관리 권한. 공개 ID 는 열람 식별자일 뿐이고 권한은 세션에서만 나옴

const idle = () =>
  new Date(Date.now() + MANAGE_SESSION_IDLE_DAYS * 24 * 3_600_000)

/* 세션과 권한 */

export async function insertManageSession(tokenHash: string) {
  const [row] = await db
    .insert(manageSessions)
    .values({ tokenHash, expiresAt: idle() })
    .returning({ id: manageSessions.id, expiresAt: manageSessions.expiresAt })
  if (!row) throw new Error('관리 세션 insert 가 행을 돌려주지 않았습니다')
  return row
}

/** 유효한 세션만 돌려주고 유휴 만료를 갱신함 */
export async function touchManageSession(tokenHash: string) {
  const [row] = await db
    .update(manageSessions)
    .set({ lastSeenAt: new Date(), expiresAt: idle() })
    .where(
      and(
        eq(manageSessions.tokenHash, tokenHash),
        isNull(manageSessions.revokedAt),
        raw`${manageSessions.expiresAt} > now()`,
      ),
    )
    .returning({ id: manageSessions.id })
  return row
}

export async function revokeManageSession(tokenHash: string) {
  const [row] = await db
    .update(manageSessions)
    .set({ revokedAt: new Date() })
    .where(eq(manageSessions.tokenHash, tokenHash))
    .returning({ id: manageSessions.id })
  return row
}

/** 토큰 교환으로 권한을 누적함. 한 세션이 여러 기록을 관리할 수 있음 */
export async function grantManageAccess(input: {
  sessionId: string
  reportId: string
}) {
  await db
    .insert(manageGrants)
    .values(input)
    .onConflictDoNothing({
      target: [manageGrants.sessionId, manageGrants.reportId],
    })
}

/** 이 세션이 그 기록의 권한을 갖는지 확인. 모든 관리 API 의 관문 */
export async function hasManageAccess(input: {
  sessionId: string
  reportId: string
}) {
  const row = await db.query.manageGrants.findFirst({
    where: and(
      eq(manageGrants.sessionId, input.sessionId),
      eq(manageGrants.reportId, input.reportId),
    ),
  })
  return row !== undefined
}

/**
 * 현재 세션이 관리할 수 있는 기록만. WEB-16
 * 일반 공개 목록과 다른 질의라 삭제된 기록도 상태를 보여줌
 */
export function listManagedReports(sessionId: string) {
  return db
    .select({
      id: reports.id,
      kind: reports.kind,
      visibility: reports.visibility,
      lifecycle: reports.lifecycle,
      version: reports.version,
      animalType: reports.animalType,
      appearance: reports.appearance,
      colors: reports.colors,
      size: reports.size,
      careSituation: reports.careSituation,
      areaName: reports.areaName,
      occurredAt: reports.occurredAt,
      createdAt: reports.createdAt,
      closedAt: reports.closedAt,
      closeReason: reports.closeReason,
    })
    .from(manageGrants)
    .innerJoin(reports, eq(manageGrants.reportId, reports.id))
    .where(eq(manageGrants.sessionId, sessionId))
    .orderBy(desc(reports.createdAt))
}

/** 관리 화면의 단건 조회. 정확 좌표는 자기 기록이라도 내주지 않음 */
export function findManagedReport(reportId: string) {
  return db.query.reports.findFirst({
    where: eq(reports.id, reportId),
    columns: {
      exactPoint: false,
      coarsePoint: false,
      reporterId: false,
      manageTokenHash: false,
      manageTokenIssuedAt: false,
      manageTokenRotatedAt: false,
    },
    with: { photos: { orderBy: [reportPhotos.sortOrder] } },
  })
}

/* 토큰 발급과 회전 */

export async function setManageTokenHash(input: {
  reportId: string
  tokenHash: string
  rotated?: boolean
}) {
  const now = new Date()
  const [row] = await db
    .update(reports)
    .set({
      manageTokenHash: input.tokenHash,
      manageTokenIssuedAt: now,
      ...(input.rotated && { manageTokenRotatedAt: now }),
    })
    .where(eq(reports.id, input.reportId))
    .returning({ id: reports.id })
  return row
}

/**
 * 토큰 회전. 이전 세션의 권한을 모두 끊음
 * 유출 의심 시 권한 보유자가 실행함. POL-04
 */
export async function rotateManageToken(input: {
  reportId: string
  tokenHash: string
}) {
  return db.transaction(async (tx) => {
    const now = new Date()
    const [row] = await tx
      .update(reports)
      .set({
        manageTokenHash: input.tokenHash,
        manageTokenIssuedAt: now,
        manageTokenRotatedAt: now,
      })
      .where(eq(reports.id, input.reportId))
      .returning({ id: reports.id })
    if (!row) return null

    // 이 기록에 걸린 모든 권한을 제거. 새 토큰으로 다시 교환해야 함
    await tx.delete(manageGrants).where(eq(manageGrants.reportId, input.reportId))
    return row
  })
}

/* 수정과 상태 변경 */

/**
 * 낙관적 락으로 수정. version 이 어긋나면 undefined 를 돌려주고 호출부가 409 로 답함
 * 운영자 검수와 작성자 수정이 동시에 일어나는 경우를 위한 것
 */
export async function updateManagedReport(input: {
  reportId: string
  version: number
  patch: Partial<typeof reports.$inferInsert>
}) {
  const [row] = await db
    .update(reports)
    .set({ ...input.patch, version: raw`${reports.version} + 1` })
    .where(
      and(eq(reports.id, input.reportId), eq(reports.version, input.version)),
    )
    .returning({
      id: reports.id,
      version: reports.version,
      visibility: reports.visibility,
      lifecycle: reports.lifecycle,
    })
  return row
}

/**
 * 종료·찾음 기록. 다른 작성자의 기록을 자동 종료하지 않음. POL-06
 * 찾음은 보호자 자기보고로만 저장하고 앱이 사실을 인증하지 않음
 */
export async function closeManagedReport(input: {
  reportId: string
  version: number
  lifecycle: 'closed' | 'resolved'
  closeReason: (typeof reports.closeReason.enumValues)[number]
  closeNote?: string
}) {
  const [row] = await db
    .update(reports)
    .set({
      lifecycle: input.lifecycle,
      closedAt: new Date(),
      closeReason: input.closeReason,
      closeNote: input.closeNote,
      version: raw`${reports.version} + 1`,
    })
    .where(
      and(eq(reports.id, input.reportId), eq(reports.version, input.version)),
    )
    .returning({
      id: reports.id,
      version: reports.version,
      lifecycle: reports.lifecycle,
      closedAt: reports.closedAt,
    })
  return row
}

/**
 * 삭제 요청. 즉시 비공개로 바꾸고 실제 파기는 별도 작업으로 넘김
 * 공개 중단과 파기 완료를 구분해 추적함. POL-21
 */
export async function markReportDeleted(input: {
  reportId: string
  version: number
}) {
  const [row] = await db
    .update(reports)
    .set({
      visibility: 'deleted',
      closedAt: new Date(),
      version: raw`${reports.version} + 1`,
    })
    .where(
      and(eq(reports.id, input.reportId), eq(reports.version, input.version)),
    )
    .returning({ id: reports.id, version: reports.version })
  return row
}

/* 동의 기록 */

export function insertConsentRecords(
  rows: (typeof consentRecords.$inferInsert)[],
) {
  if (rows.length === 0) return Promise.resolve([])
  return db
    .insert(consentRecords)
    .values(rows)
    .returning({ id: consentRecords.id })
}

export function listConsentRecords(reportId: string) {
  return db
    .select({
      kind: consentRecords.kind,
      documentVersion: consentRecords.documentVersion,
      agreedAt: consentRecords.agreedAt,
      withdrawnAt: consentRecords.withdrawnAt,
    })
    .from(consentRecords)
    .where(eq(consentRecords.reportId, reportId))
    .orderBy(desc(consentRecords.agreedAt))
}

/** 선택 동의 철회. 필수 동의는 철회 대신 삭제 요청으로 처리함 */
export async function withdrawConsent(input: {
  reportId: string
  kind: 'optional_ai' | 'optional_location'
}) {
  const [row] = await db
    .update(consentRecords)
    .set({ withdrawnAt: new Date() })
    .where(
      and(
        eq(consentRecords.reportId, input.reportId),
        eq(consentRecords.kind, input.kind),
        isNull(consentRecords.withdrawnAt),
      ),
    )
    .returning({ id: consentRecords.id })
  return row
}

export async function deleteExpiredManageSessions() {
  await db.delete(manageSessions).where(lt(manageSessions.expiresAt, new Date()))
}
