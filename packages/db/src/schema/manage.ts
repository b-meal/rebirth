import { relations } from 'drizzle-orm'
import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import { consentKind } from './enums'
import { reports } from './reports'

// 익명 작성자의 관리 권한. POL-03, POL-04
// 공개 기록 ID 는 열람 식별자일 뿐이고 수정 권한은 세션에서만 나옴
// 관리 URL 로 한 번 들어와 세션으로 교환한 뒤에는 쿠키로만 인증함

/** 세션 유휴 한도. POL-04 는 최대 30일까지 승인 필요로 두어 보수적으로 잡음 */
export const MANAGE_SESSION_IDLE_DAYS = 7

export const manageSessions = pgTable(
  'manage_sessions',
  {
    id: uuid().defaultRandom().primaryKey(),
    // 쿠키 값의 해시. 원문은 저장하지 않음
    tokenHash: text().notNull().unique(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    // 공용 기기 로그아웃. 다른 기기 세션은 자동으로 회수하지 않음
    revokedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index('manage_sessions_expiry_idx').on(t.expiresAt)],
)

// 세션 하나가 여러 기록의 권한을 누적함. 토큰을 교환할 때마다 행이 늘어남
export const manageGrants = pgTable(
  'manage_grants',
  {
    sessionId: uuid()
      .notNull()
      .references(() => manageSessions.id, { onDelete: 'cascade' }),
    reportId: uuid()
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    grantedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.sessionId, t.reportId] }),
    index('manage_grants_report_idx').on(t.reportId),
  ],
)

// 동의 기록. POL-22 는 버전과 일시를 함께 남기도록 요구함
// boolean 한 칸으로는 "그때 어떤 문구에 동의했는가" 를 답할 수 없어 이력으로 둠
export const consentRecords = pgTable(
  'consent_records',
  {
    id: uuid().defaultRandom().primaryKey(),
    reportId: uuid()
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    kind: consentKind().notNull(),
    // 동의 시점에 발행되어 있던 문서 버전
    documentVersion: text().notNull(),
    agreedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    // 선택 동의는 나중에 철회할 수 있음. 필수 동의는 철회 대신 삭제 요청으로 감
    withdrawnAt: timestamp({ withTimezone: true }),
  },
  (t) => [index('consent_records_report_idx').on(t.reportId, t.kind)],
)

export const manageSessionsRelations = relations(manageSessions, ({ many }) => ({
  grants: many(manageGrants),
}))

export const manageGrantsRelations = relations(manageGrants, ({ one }) => ({
  session: one(manageSessions, {
    fields: [manageGrants.sessionId],
    references: [manageSessions.id],
  }),
  report: one(reports, {
    fields: [manageGrants.reportId],
    references: [reports.id],
  }),
}))

export const consentRecordsRelations = relations(consentRecords, ({ one }) => ({
  report: one(reports, {
    fields: [consentRecords.reportId],
    references: [reports.id],
  }),
}))

export type ManageSession = typeof manageSessions.$inferSelect
export type ManageGrant = typeof manageGrants.$inferSelect
export type ConsentRecord = typeof consentRecords.$inferSelect
export type NewConsentRecord = typeof consentRecords.$inferInsert
