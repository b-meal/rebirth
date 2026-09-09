import { relations, sql } from 'drizzle-orm'
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import {
  legalDocType,
  legalDocStatus,
  supportRequestKind,
  supportStatus,
} from './enums'
import { reportFlags } from './reports'

// 문의·권리 요청과 법적 고지. WEB-22~24
// 관리 주소를 잃은 사람도 접수할 수 있어야 하므로 관리 권한에 의존하지 않음

/* 문의와 권리 요청 */

export const supportRequests = pgTable(
  'support_requests',
  {
    id: uuid().defaultRandom().primaryKey(),
    // 화면에 보여주는 접수번호. 추측이 어려운 짧은 문자열
    reference: text().notNull().unique(),
    // 처리 조회용 토큰 해시. 계정이 없으므로 이 토큰이 유일한 재조회 수단
    tokenHash: text().notNull().unique(),

    kind: supportRequestKind().notNull(),
    status: supportStatus().notNull().default('received'),

    // 요청 내용. 신분증 원문과 개인 연락처는 받지 않음
    body: text().notNull(),
    // 관련 공개 기록. 관리 토큰이 아니라 공개 ID 만 참조함
    relatedReportId: uuid(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    // 내부 목표 기한. 법정 기한 적용은 요청별로 검토함
    dueAt: timestamp({ withTimezone: true }),
    closedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    index('support_requests_queue_idx').on(t.status, t.createdAt),
    index('support_requests_report_idx').on(t.relatedReportId),
  ],
)

// 운영자 답변. 수정해도 원본이 남아야 하므로 리비전으로 쌓음
export const supportReplies = pgTable(
  'support_replies',
  {
    id: uuid().defaultRandom().primaryKey(),
    requestId: uuid()
      .notNull()
      .references(() => supportRequests.id, { onDelete: 'cascade' }),
    // 요청자에게 보이는 답변과 내부 메모를 분리함. 실수로 새는 경로를 만들지 않음
    publicBody: text(),
    internalNote: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('support_replies_request_idx').on(t.requestId, t.createdAt)],
)

/* 신고 접수 조회 */

// 신고자도 계정이 없어 결과를 다시 보려면 토큰이 필요함
// 작성자가 자기 제보의 검수 결과를 보는 경로(관리 토큰)와는 별개
export const flagReceipts = pgTable(
  'flag_receipts',
  {
    id: uuid().defaultRandom().primaryKey(),
    flagId: uuid()
      .notNull()
      .references(() => reportFlags.id, { onDelete: 'cascade' }),
    reference: text().notNull().unique(),
    tokenHash: text().notNull().unique(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('flag_receipts_flag_idx').on(t.flagId)],
)

/* 법적 고지 */

// 버전별 원문을 보관. 본문을 갱신하지 않고 새 행을 추가해 과거 버전을 재현함
export const legalDocuments = pgTable(
  'legal_documents',
  {
    id: uuid().defaultRandom().primaryKey(),
    docType: legalDocType().notNull(),
    version: text().notNull(),
    status: legalDocStatus().notNull().default('draft'),

    title: text().notNull(),
    body: text().notNull(),
    changeSummary: text(),

    // KST 기준 시행일. 예약 발행이면 미래 시각
    effectiveAt: timestamp({ withTimezone: true }),
    // 안내문 최종확인일. POL-37 이 검사 항목으로 요구함
    lastVerifiedAt: timestamp({ withTimezone: true }),
    sourceUrl: text(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp({ withTimezone: true }),
    retiredAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    uniqueIndex('legal_documents_type_version_uk').on(t.docType, t.version),
    index('legal_documents_lookup_idx').on(t.docType, t.status, t.effectiveAt),
    // 발행본은 시행일이 있어야 함. 미정 상태로 공개되는 것을 막음
    check(
      'legal_documents_published_has_effective_at',
      sql`${t.status} <> 'published' or ${t.effectiveAt} is not null`,
    ),
  ],
)

export const supportRequestsRelations = relations(
  supportRequests,
  ({ many }) => ({ replies: many(supportReplies) }),
)

export const supportRepliesRelations = relations(supportReplies, ({ one }) => ({
  request: one(supportRequests, {
    fields: [supportReplies.requestId],
    references: [supportRequests.id],
  }),
}))

export const flagReceiptsRelations = relations(flagReceipts, ({ one }) => ({
  flag: one(reportFlags, {
    fields: [flagReceipts.flagId],
    references: [reportFlags.id],
  }),
}))

export type SupportRequest = typeof supportRequests.$inferSelect
export type NewSupportRequest = typeof supportRequests.$inferInsert
export type SupportReply = typeof supportReplies.$inferSelect
export type FlagReceipt = typeof flagReceipts.$inferSelect
export type LegalDocument = typeof legalDocuments.$inferSelect
