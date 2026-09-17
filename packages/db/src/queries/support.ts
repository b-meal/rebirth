import 'server-only'

import { and, desc, eq, isNotNull, sql as raw } from 'drizzle-orm'

import { db } from '../client'
import {
  flagReceipts,
  legalDocuments,
  supportReplies,
  supportRequests,
} from '../schema'

// 문의·권리 요청과 법적 고지 조회

/* 문의 */

export async function insertSupportRequest(
  input: typeof supportRequests.$inferInsert,
) {
  const [row] = await db
    .insert(supportRequests)
    .values(input)
    .returning({
      id: supportRequests.id,
      reference: supportRequests.reference,
      createdAt: supportRequests.createdAt,
    })
  if (!row) throw new Error('문의 insert 가 행을 돌려주지 않았습니다')
  return row
}

/**
 * 조회 토큰으로 접수 상태와 공개 답변만 돌려줌
 * 내부 메모는 여기서 조회하지 않음. 실수로 새는 경로를 만들지 않기 위함
 */
export async function findSupportRequestByTokenHash(tokenHash: string) {
  const request = await db.query.supportRequests.findFirst({
    where: eq(supportRequests.tokenHash, tokenHash),
    columns: { tokenHash: false },
  })
  if (!request) return undefined

  const replies = await db
    .select({
      body: supportReplies.publicBody,
      createdAt: supportReplies.createdAt,
    })
    .from(supportReplies)
    .where(
      and(
        eq(supportReplies.requestId, request.id),
        isNotNull(supportReplies.publicBody),
      ),
    )
    .orderBy(desc(supportReplies.createdAt))

  return { ...request, replies }
}

/* 신고 접수 조회 */

export async function insertFlagReceipt(
  input: typeof flagReceipts.$inferInsert,
) {
  const [row] = await db
    .insert(flagReceipts)
    .values(input)
    .returning({
      id: flagReceipts.id,
      reference: flagReceipts.reference,
    })
  if (!row) throw new Error('신고 접수 insert 가 행을 돌려주지 않았습니다')
  return row
}

/* 법적 고지 */

/**
 * 현재 발행본. 시행일이 지난 것 중 가장 최근 버전
 * 예약 발행은 시행일이 오기 전까지 노출되지 않음
 */
export function findPublishedLegalDocument(
  docType: (typeof legalDocuments.docType.enumValues)[number],
) {
  return db.query.legalDocuments.findFirst({
    where: and(
      eq(legalDocuments.docType, docType),
      eq(legalDocuments.status, 'published'),
      raw`${legalDocuments.effectiveAt} <= now()`,
    ),
    orderBy: [desc(legalDocuments.effectiveAt)],
  })
}

/** 특정 버전 조회. 과거 버전을 그대로 재현할 수 있어야 함. POL-38 */
export function findLegalDocumentVersion(input: {
  docType: (typeof legalDocuments.docType.enumValues)[number]
  version: string
}) {
  return db.query.legalDocuments.findFirst({
    where: and(
      eq(legalDocuments.docType, input.docType),
      eq(legalDocuments.version, input.version),
    ),
  })
}

/** 발행 이력. 시행일과 변경 요약만 보여주고 폐기본은 제외 */
export function listLegalDocumentVersions(
  docType: (typeof legalDocuments.docType.enumValues)[number],
) {
  return db
    .select({
      version: legalDocuments.version,
      effectiveAt: legalDocuments.effectiveAt,
      changeSummary: legalDocuments.changeSummary,
      publishedAt: legalDocuments.publishedAt,
    })
    .from(legalDocuments)
    .where(
      and(
        eq(legalDocuments.docType, docType),
        eq(legalDocuments.status, 'published'),
      ),
    )
    .orderBy(desc(legalDocuments.effectiveAt))
}
