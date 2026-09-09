import 'server-only'

import { and, eq, isNull, lt, or, sql as raw } from 'drizzle-orm'

import { db } from '../client'
import {
  DRAFT_TTL_HOURS,
  analysisJobs,
  draftLocations,
  draftSessions,
  draftUploads,
  idempotencyKeys,
} from '../schema/drafts'

// 제출 전 임시 자료 조회. 모든 질의가 sessionId 로 좁혀짐
// 남의 uploadId·locationId 를 자기 제보에 붙이지 못하게 하는 경계

const ttl = () => new Date(Date.now() + DRAFT_TTL_HOURS * 3_600_000)

/* 세션 */

export async function insertDraftSession(tokenHash: string) {
  const [row] = await db
    .insert(draftSessions)
    .values({ tokenHash, expiresAt: ttl() })
    .returning({ id: draftSessions.id, expiresAt: draftSessions.expiresAt })
  if (!row) throw new Error('초안 세션 insert 가 행을 돌려주지 않았습니다')
  return row
}

/** 유효한 세션만 돌려줌. 만료된 세션은 없는 것과 같게 취급 */
export async function touchDraftSession(tokenHash: string) {
  const [row] = await db
    .update(draftSessions)
    .set({ lastSeenAt: new Date(), expiresAt: ttl() })
    .where(
      and(
        eq(draftSessions.tokenHash, tokenHash),
        raw`${draftSessions.expiresAt} > now()`,
      ),
    )
    .returning({ id: draftSessions.id })
  return row
}

/* 업로드 */

export async function insertDraftUpload(input: {
  sessionId: string
  revision?: number
}) {
  const [row] = await db
    .insert(draftUploads)
    .values({
      sessionId: input.sessionId,
      revision: input.revision ?? 1,
      expiresAt: ttl(),
    })
    .returning({
      id: draftUploads.id,
      revision: draftUploads.revision,
      status: draftUploads.status,
    })
  if (!row) throw new Error('업로드 insert 가 행을 돌려주지 않았습니다')
  return row
}

export async function markDraftUploadReady(input: {
  id: string
  sessionId: string
  storagePath: string
  contentType: string
  bytes: number
  width?: number
  height?: number
}) {
  const [row] = await db
    .update(draftUploads)
    .set({
      status: 'ready',
      storagePath: input.storagePath,
      contentType: input.contentType,
      bytes: input.bytes,
      width: input.width,
      height: input.height,
      failureCode: null,
    })
    .where(
      and(
        eq(draftUploads.id, input.id),
        eq(draftUploads.sessionId, input.sessionId),
      ),
    )
    .returning({ id: draftUploads.id, revision: draftUploads.revision })
  return row
}

export async function markDraftUploadFailed(input: {
  id: string
  sessionId: string
  failureCode: string
}) {
  const [row] = await db
    .update(draftUploads)
    .set({ status: 'failed', failureCode: input.failureCode })
    .where(
      and(
        eq(draftUploads.id, input.id),
        eq(draftUploads.sessionId, input.sessionId),
      ),
    )
    .returning({ id: draftUploads.id })
  return row
}

/** 세션 소유이고 아직 만료·사용되지 않은 업로드만 돌려줌 */
export function findUsableUploads(input: {
  sessionId: string
  ids: string[]
}) {
  if (input.ids.length === 0) return Promise.resolve([])
  return db
    .select({
      id: draftUploads.id,
      storagePath: draftUploads.storagePath,
      contentType: draftUploads.contentType,
      width: draftUploads.width,
      height: draftUploads.height,
      revision: draftUploads.revision,
    })
    .from(draftUploads)
    .where(
      and(
        eq(draftUploads.sessionId, input.sessionId),
        raw`${draftUploads.id} = any(${input.ids}::uuid[])`,
        eq(draftUploads.status, 'ready'),
        isNull(draftUploads.claimedAt),
        raw`${draftUploads.expiresAt} > now()`,
      ),
    )
}

/** 제보로 옮겨진 업로드를 사용 처리. 파기 대상에서 빠짐 */
export function claimUploads(input: {
  sessionId: string
  ids: string[]
  reportId: string
}) {
  return db
    .update(draftUploads)
    .set({ claimedAt: new Date(), claimedByReportId: input.reportId })
    .where(
      and(
        eq(draftUploads.sessionId, input.sessionId),
        raw`${draftUploads.id} = any(${input.ids}::uuid[])`,
      ),
    )
    .returning({ id: draftUploads.id })
}

/* 위치 참조 */

export async function insertDraftLocation(
  input: Omit<typeof draftLocations.$inferInsert, 'expiresAt'>,
) {
  const [row] = await db
    .insert(draftLocations)
    .values({ ...input, expiresAt: ttl() })
    .returning({ id: draftLocations.id, expiresAt: draftLocations.expiresAt })
  if (!row) throw new Error('위치 참조 insert 가 행을 돌려주지 않았습니다')
  return row
}

export function findDraftLocation(input: { sessionId: string; id: string }) {
  return db.query.draftLocations.findFirst({
    where: and(
      eq(draftLocations.id, input.id),
      eq(draftLocations.sessionId, input.sessionId),
      raw`${draftLocations.expiresAt} > now()`,
    ),
  })
}

/* AI 분석 작업 */

export async function insertAnalysisJob(input: {
  sessionId: string
  uploadId: string
  revision: number
  model?: string
  promptVersion?: string
}) {
  const [row] = await db
    .insert(analysisJobs)
    .values(input)
    // 같은 사진의 같은 revision 을 두 번 분석하지 않음. 두 번째 요청은 기존 작업을 받음
    .onConflictDoNothing({
      target: [analysisJobs.uploadId, analysisJobs.revision],
    })
    .returning({ id: analysisJobs.id })
  return row
}

export function findAnalysisJob(input: { sessionId: string; id: string }) {
  return db.query.analysisJobs.findFirst({
    where: and(
      eq(analysisJobs.id, input.id),
      eq(analysisJobs.sessionId, input.sessionId),
    ),
  })
}

export function findAnalysisJobByUpload(input: {
  sessionId: string
  uploadId: string
  revision: number
}) {
  return db.query.analysisJobs.findFirst({
    where: and(
      eq(analysisJobs.sessionId, input.sessionId),
      eq(analysisJobs.uploadId, input.uploadId),
      eq(analysisJobs.revision, input.revision),
    ),
  })
}

export async function finishAnalysisJob(input: {
  id: string
  status: 'succeeded' | 'failed'
  result?: unknown
  failureCode?: string
  model?: string
  latencyMs?: number
}) {
  const [row] = await db
    .update(analysisJobs)
    .set({
      status: input.status,
      result: input.result,
      failureCode: input.failureCode,
      model: input.model,
      latencyMs: input.latencyMs,
      finishedAt: new Date(),
    })
    .where(eq(analysisJobs.id, input.id))
    .returning({ id: analysisJobs.id })
  return row
}

/* 멱등 키 */

/**
 * 키를 선점함. 이미 있으면 undefined 를 돌려주고 호출부가 기존 결과를 조회함
 * 이중 탭과 재시도가 제보를 두 건 만들지 않게 하는 지점
 */
export async function claimIdempotencyKey(input: {
  key: string
  sessionId: string
}) {
  const [row] = await db
    .insert(idempotencyKeys)
    .values({ key: input.key, sessionId: input.sessionId, expiresAt: ttl() })
    .onConflictDoNothing({ target: idempotencyKeys.key })
    .returning({ key: idempotencyKeys.key })
  return row
}

export function findIdempotencyKey(input: { key: string; sessionId: string }) {
  return db.query.idempotencyKeys.findFirst({
    where: and(
      eq(idempotencyKeys.key, input.key),
      eq(idempotencyKeys.sessionId, input.sessionId),
    ),
  })
}

export async function attachIdempotencyResult(input: {
  key: string
  reportId: string
}) {
  await db
    .update(idempotencyKeys)
    .set({ reportId: input.reportId })
    .where(eq(idempotencyKeys.key, input.key))
}

/** 선점만 하고 저장에 실패한 키를 풀어줌. 사용자가 고쳐서 다시 시도할 수 있게 함 */
export async function releaseIdempotencyKey(key: string) {
  await db
    .delete(idempotencyKeys)
    .where(and(eq(idempotencyKeys.key, key), isNull(idempotencyKeys.reportId)))
}

/* 파기 */

/**
 * 만료된 미제출 자료. 저장 경로를 함께 돌려줘 스토리지도 지울 수 있게 함
 * POL-21 의 미제출 업로드 24시간 기준
 */
export function findExpiredUploads(limit = 200) {
  return db
    .select({ id: draftUploads.id, storagePath: draftUploads.storagePath })
    .from(draftUploads)
    .where(
      and(isNull(draftUploads.claimedAt), lt(draftUploads.expiresAt, new Date())),
    )
    .limit(limit)
}

export async function deleteExpiredDrafts() {
  const now = new Date()
  await db.transaction(async (tx) => {
    await tx
      .delete(draftUploads)
      .where(and(isNull(draftUploads.claimedAt), lt(draftUploads.expiresAt, now)))
    await tx.delete(draftLocations).where(lt(draftLocations.expiresAt, now))
    await tx.delete(idempotencyKeys).where(lt(idempotencyKeys.expiresAt, now))
    // 세션은 자식 행이 정리된 뒤에 지움. cascade 로 남은 것도 함께 사라짐
    await tx.delete(draftSessions).where(lt(draftSessions.expiresAt, now))
  })
}
