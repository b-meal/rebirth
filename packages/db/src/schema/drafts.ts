import { relations, sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

import { areaCodeSystem, locationSource, uploadStatus } from './enums'
import { reports } from './reports'

// 제출 전 임시 자료. POL-49
// 사진·위치·AI 작업을 초안 세션에 묶어 남의 uploadId 를 자기 제보에 붙이지 못하게 함
// 브라우저에는 HttpOnly 쿠키만 두고 원본 사진과 정확 좌표를 내려보내지 않음

/** 미제출 자료의 권장 수명. 만료된 항목은 해당 것만 다시 받음 */
export const DRAFT_TTL_HOURS = 24

export const draftSessions = pgTable(
  'draft_sessions',
  {
    id: uuid().defaultRandom().primaryKey(),
    // 쿠키에 담기는 값의 해시. 원문은 저장하지 않음
    tokenHash: text().notNull().unique(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [index('draft_sessions_expiry_idx').on(t.expiresAt)],
)

// 업로드된 사진. 제보 저장 시 report_photos 로 옮겨지고 미제출은 24시간 뒤 파기
export const draftUploads = pgTable(
  'draft_uploads',
  {
    id: uuid().defaultRandom().primaryKey(),
    sessionId: uuid()
      .notNull()
      .references(() => draftSessions.id, { onDelete: 'cascade' }),

    // 파일 검증 상태. 분석 경고와는 다른 축이라 섞지 않음
    status: uploadStatus().notNull().default('processing'),
    // 검증 실패 사유. 화면이 같은 자리에서 재선택을 안내함
    failureCode: text(),

    storagePath: text(),
    contentType: text(),
    bytes: integer(),
    width: integer(),
    height: integer(),

    // 대표 사진 교체마다 올라가는 값. 늦게 온 이전 revision 결과를 버리는 기준
    revision: integer().notNull().default(1),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    // 제보로 옮겨지면 채워짐. 채워진 업로드는 파기 대상에서 빠짐
    claimedAt: timestamp({ withTimezone: true }),
    claimedByReportId: uuid().references(() => reports.id, {
      onDelete: 'set null',
    }),
  },
  (t) => [
    index('draft_uploads_session_idx').on(t.sessionId, t.createdAt),
    index('draft_uploads_sweep_idx').on(t.claimedAt, t.expiresAt),
    // 검증을 통과한 업로드는 반드시 저장 경로를 가짐
    check(
      'draft_uploads_ready_has_path',
      sql`${t.status} <> 'ready' or ${t.storagePath} is not null`,
    ),
  ],
)

// 서버가 발급한 위치 참조. 클라이언트는 좌표 대신 이 id 만 들고 다님
// 정확 좌표가 브라우저와 sessionStorage 에 남지 않게 하는 장치
export const draftLocations = pgTable(
  'draft_locations',
  {
    id: uuid().defaultRandom().primaryKey(),
    sessionId: uuid()
      .notNull()
      .references(() => draftSessions.id, { onDelete: 'cascade' }),

    source: locationSource().notNull(),
    // gps·place 만 값을 가짐. manual_area 는 좌표를 만들지 않음
    lat: text(),
    lng: text(),
    accuracyM: integer(),

    areaCodeSystem: areaCodeSystem(),
    areaCode: text(),
    areaName: text(),
    areaCodeVersion: text(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [
    index('draft_locations_session_idx').on(t.sessionId, t.createdAt),
    index('draft_locations_sweep_idx').on(t.expiresAt),
    // 수동 지역 선택이 좌표를 만들어내지 않게 막음. POL-08
    check(
      'draft_locations_manual_area_has_no_point',
      sql`${t.source} <> 'manual_area' or (${t.lat} is null and ${t.lng} is null)`,
    ),
    // gps·place 는 좌표가 있어야 위치 참조로 쓸 수 있음
    check(
      'draft_locations_point_pairs',
      sql`(${t.lat} is null) = (${t.lng} is null)`,
    ),
  ],
)

// AI 분석 작업. 늦게 도착한 응답이 사용자 수정값을 덮지 않게 revision 을 함께 둠
export const analysisJobs = pgTable(
  'analysis_jobs',
  {
    id: uuid().defaultRandom().primaryKey(),
    sessionId: uuid()
      .notNull()
      .references(() => draftSessions.id, { onDelete: 'cascade' }),
    uploadId: uuid()
      .notNull()
      .references(() => draftUploads.id, { onDelete: 'cascade' }),
    // 이 작업이 대상으로 삼은 업로드 revision
    revision: integer().notNull(),

    status: text().notNull().default('running'),
    // 검증을 통과한 AI 원본. 좌표·토큰·사진 원본을 담지 않음
    result: jsonb(),
    failureCode: text(),

    model: text(),
    promptVersion: text(),
    latencyMs: integer(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    // 같은 사진의 같은 revision 을 두 번 분석하지 않음
    unique('analysis_jobs_upload_revision_uk').on(t.uploadId, t.revision),
    index('analysis_jobs_session_idx').on(t.sessionId, t.createdAt),
  ],
)

// 저장 요청 멱등 키. 응답이 유실돼도 같은 키로 결과를 먼저 확인함
// 이중 탭과 재시도가 제보를 두 건 만들지 않게 하는 장치
export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    key: text().primaryKey(),
    sessionId: uuid()
      .notNull()
      .references(() => draftSessions.id, { onDelete: 'cascade' }),
    // 저장에 성공한 제보. 같은 키로 다시 오면 이 값을 그대로 돌려줌
    reportId: uuid().references(() => reports.id, { onDelete: 'cascade' }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [index('idempotency_keys_sweep_idx').on(t.expiresAt)],
)

export const draftSessionsRelations = relations(draftSessions, ({ many }) => ({
  uploads: many(draftUploads),
  locations: many(draftLocations),
}))

export const draftUploadsRelations = relations(draftUploads, ({ one }) => ({
  session: one(draftSessions, {
    fields: [draftUploads.sessionId],
    references: [draftSessions.id],
  }),
}))

export const draftLocationsRelations = relations(draftLocations, ({ one }) => ({
  session: one(draftSessions, {
    fields: [draftLocations.sessionId],
    references: [draftSessions.id],
  }),
}))

export type DraftSession = typeof draftSessions.$inferSelect
export type DraftUpload = typeof draftUploads.$inferSelect
export type NewDraftUpload = typeof draftUploads.$inferInsert
export type DraftLocation = typeof draftLocations.$inferSelect
export type NewDraftLocation = typeof draftLocations.$inferInsert
export type AnalysisJob = typeof analysisJobs.$inferSelect
