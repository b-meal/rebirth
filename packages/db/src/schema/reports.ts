import type { AnalyzeResult } from '@rebirth/types'
import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  check,
  geometry,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import {
  animalSex,
  animalSize,
  animalType,
  areaCodeSystem,
  careSituation,
  closeReason,
  flagReason,
  flagResolution,
  lifecycle,
  locationSource,
  neuterStatus,
  reportKind,
  visibility,
} from './enums'

// POST /api/analyze 응답 원본. 사용자 확정값과 분리해 평가용으로 보관
export type AiDraft = AnalyzeResult

export const reports = pgTable(
  'reports',
  {
    id: uuid().defaultRandom().primaryKey(),
    kind: reportKind().notNull().default('sighting'),

    // 공개 여부와 진행 상태를 분리한 두 축. POL-06
    // 한쪽 전이가 다른 쪽을 바꾸지 않음. 후보 있음은 계산 배지라 열로 두지 않음
    visibility: visibility().notNull().default('public'),
    lifecycle: lifecycle().notNull().default('active'),

    // 낙관적 락. PATCH 가 보낸 값과 다르면 409 로 최신값을 돌려줌
    version: integer().notNull().default(1),

    // 비로그인 제보 허용이라 nullable. Supabase auth.users.id 를 FK 없이 참조
    reporterId: uuid(),
    // 관리 토큰 해시. 원문은 발급 응답에서 한 번만 나가고 저장하지 않음
    manageTokenHash: text().unique(),
    manageTokenIssuedAt: timestamp({ withTimezone: true }),
    // 유출 의심 시 회전. 이전 세션은 이 시각 기준으로 거부됨
    manageTokenRotatedAt: timestamp({ withTimezone: true }),

    // 제보 1단계 필수 입력. condition_tags 에 섞으면 분기할 수 없어 열로 둠
    careSituation: careSituation().notNull().default('unknown'),

    // 사용자가 확정한 값. AI 초안을 그대로 두거나 고쳐서 저장
    animalType: animalType().notNull().default('unknown'),
    // AI 라벨링이 채우는 품종 추정값. 화면에서는 계열 추정으로만 표기함
    breedGuess: text(),
    appearance: text(),
    colors: text().array().notNull().default([]),
    size: animalSize().notNull().default('unknown'),
    sex: animalSex().notNull().default('unknown'),
    neutered: neuterStatus().notNull().default('unknown'),
    conditionTags: text().array().notNull().default([]),
    // 있음/없음/모름 3값. null 은 모름이고 false 와 다름
    collar: boolean(),
    injury: boolean(),
    // 고양이가 아니면 해당 없음. WEB-05. 중성화 여부를 확정하는 값이 아님
    earTip: boolean(),

    aiRaw: jsonb().$type<AiDraft>(),
    aiModel: text(),
    aiAnalyzedAt: timestamp({ withTimezone: true }),
    // 사용자가 고친 필드명. AI 정확도 측정용
    aiEditedFields: text().array().notNull().default([]),

    // 정확 좌표. 공개 응답과 공유 카드에서 제외
    exactPoint: geometry({ type: 'point', mode: 'xy', srid: 4326 }),
    // 격자 스냅한 공개용 좌표. 지도 표시는 이것만 씀
    coarsePoint: geometry({ type: 'point', mode: 'xy', srid: 4326 }),
    // 스냅에 쓴 격자 크기. 품종견·어린 개체·부상 제보는 1000
    coarseGridM: integer().notNull().default(300),

    // 위치 출처와 정밀도. POL-08
    // manual_area 는 중심점을 실제 목격 좌표로 쓰지 않아 거리 계산에서 빠짐
    locationSource: locationSource().notNull().default('manual_area'),
    // GPS 가 보고한 오차 반경. 임계값을 넘으면 거리 점수를 주지 않음
    locationAccuracyM: integer(),

    // 행정동과 법정동을 섞지 않게 코드 체계를 함께 저장. 지역명 변경에도 표기가 유지됨
    areaCodeSystem: areaCodeSystem(),
    areaCode: text(),
    areaName: text(),
    areaCodeVersion: text(),

    // 지형물 메모. 좌표보다 찾아가기 쉽고 정밀도가 낮아 오히려 안전
    landmarkNote: text(),

    occurredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    shareCount: integer().notNull().default(0),

    // 종료·찾음 기록. 보호자 자기보고이며 앱이 사실을 인증하지 않음
    closedAt: timestamp({ withTimezone: true }),
    closeReason: closeReason(),
    closeNote: text(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('reports_exact_point_idx').using('gist', t.exactPoint),
    index('reports_coarse_point_idx').using('gist', t.coarsePoint),
    // 공개 목록의 기본 질의. 최신순 커서 페이징이 이 인덱스를 탐
    index('reports_feed_idx').on(
      t.kind,
      t.visibility,
      t.lifecycle,
      t.occurredAt.desc(),
    ),
    index('reports_area_idx').on(t.areaCode),
    index('reports_reporter_idx').on(t.reporterId),
    // 발견에 resolved, 실종에 active 가 들어오는 것을 DB 가 거부함
    check(
      'reports_lifecycle_by_kind',
      sql`(${t.kind} = 'lost' and ${t.lifecycle} in ('searching', 'resolved', 'closed'))
          or (${t.kind} <> 'lost' and ${t.lifecycle} in ('active', 'closed'))`,
    ),
    // 수동 지역 선택은 정확 좌표를 만들어내지 않음. 허위 정밀도 방지
    check(
      'reports_manual_area_has_no_exact_point',
      sql`${t.locationSource} <> 'manual_area' or ${t.exactPoint} is null`,
    ),
    // 개 제보에 귀 끝 값이 들어오면 의미가 없음. 고양이만 관찰값을 가짐
    check(
      'reports_ear_tip_only_for_cats',
      sql`${t.animalType} = 'cat' or ${t.earTip} is null`,
    ),
  ],
)

export const reportPhotos = pgTable(
  'report_photos',
  {
    id: uuid().defaultRandom().primaryKey(),
    reportId: uuid()
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    // Supabase Storage 오브젝트 키. 서명 URL 로만 노출
    storagePath: text().notNull(),
    width: integer(),
    height: integer(),
    sortOrder: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('report_photos_report_idx').on(t.reportId, t.sortOrder)],
)

// 실종 신고와 목격 제보의 매칭 결과 캐시. 유사도일 뿐 개체 동일성 확정이 아님
export const matchScores = pgTable(
  'match_scores',
  {
    id: uuid().defaultRandom().primaryKey(),
    lostId: uuid()
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    sightingId: uuid()
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    score: smallint().notNull(),
    // 거리·시간·털색·크기·특징 항목별 점수와 근거 문장
    breakdown: jsonb().$type<MatchBreakdown>().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('match_scores_pair_uk').on(t.lostId, t.sightingId),
    index('match_scores_lost_idx').on(t.lostId, t.score.desc()),
  ],
)

export type MatchBreakdown = {
  distance: number
  time: number
  color: number
  size: number
  features: number
  reason: string
}

// 제3자 신고. 같은 제보에 여러 건이 쌓이고 운영자가 한 번에 판정
export const reportFlags = pgTable(
  'report_flags',
  {
    id: uuid().defaultRandom().primaryKey(),
    reportId: uuid()
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    reason: flagReason().notNull(),
    detail: text(),
    // 신고자를 식별하지 않음. 중복 신고 억제는 레이트리밋으로만 함
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    // 운영자가 판정하면 채워짐. null 이면 검수 대기
    resolvedAt: timestamp({ withTimezone: true }),
    resolution: flagResolution(),
    note: text(),
  },
  (t) => [
    index('report_flags_pending_idx').on(t.reportId, t.resolvedAt),
    index('report_flags_queue_idx').on(t.resolvedAt, t.createdAt.desc()),
  ],
)

// 제보에 달리는 공개 댓글. 비로그인이라 작성자 대신 초안 세션만 붙임
export const reportComments = pgTable(
  'report_comments',
  {
    id: uuid().defaultRandom().primaryKey(),
    reportId: uuid()
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    // 초안 세션 id. drafts 가 reports 를 참조해 순환을 피하려 FK 없이 참조
    sessionId: uuid(),
    // 이 제보 안에서만 유효한 작성자 번호. 다른 제보의 댓글과 이어 볼 수 없음
    authorSeq: integer().notNull(),
    body: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('report_comments_thread_idx').on(t.reportId, t.createdAt),
    // 같은 세션이 이 제보에서 이미 받은 번호를 찾는 질의
    index('report_comments_author_idx').on(t.reportId, t.sessionId),
  ],
)

// 관심 표시. 비로그인이라 초안 세션 단위로 한 번만 남고 취소하면 지움
export const reportInterests = pgTable(
  'report_interests',
  {
    reportId: uuid()
      .notNull()
      .references(() => reports.id, { onDelete: 'cascade' }),
    // 초안 세션 id. drafts 가 reports 를 참조해 순환을 피하려 FK 없이 참조
    sessionId: uuid().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.reportId, t.sessionId] }),
    index('report_interests_session_idx').on(t.sessionId),
  ],
)

export const reportsRelations = relations(reports, ({ many }) => ({
  photos: many(reportPhotos),
  flags: many(reportFlags),
  comments: many(reportComments),
  matchesAsLost: many(matchScores, { relationName: 'lost' }),
  matchesAsSighting: many(matchScores, { relationName: 'sighting' }),
}))

export const reportCommentsRelations = relations(reportComments, ({ one }) => ({
  report: one(reports, {
    fields: [reportComments.reportId],
    references: [reports.id],
  }),
}))

export const reportFlagsRelations = relations(reportFlags, ({ one }) => ({
  report: one(reports, {
    fields: [reportFlags.reportId],
    references: [reports.id],
  }),
}))

export const reportPhotosRelations = relations(reportPhotos, ({ one }) => ({
  report: one(reports, {
    fields: [reportPhotos.reportId],
    references: [reports.id],
  }),
}))

export const matchScoresRelations = relations(matchScores, ({ one }) => ({
  lost: one(reports, {
    fields: [matchScores.lostId],
    references: [reports.id],
    relationName: 'lost',
  }),
  sighting: one(reports, {
    fields: [matchScores.sightingId],
    references: [reports.id],
    relationName: 'sighting',
  }),
}))

export type Report = typeof reports.$inferSelect
export type NewReport = typeof reports.$inferInsert
export type ReportPhoto = typeof reportPhotos.$inferSelect
export type NewReportPhoto = typeof reportPhotos.$inferInsert
export type MatchScore = typeof matchScores.$inferSelect
export type NewMatchScore = typeof matchScores.$inferInsert
export type ReportFlag = typeof reportFlags.$inferSelect
export type NewReportFlag = typeof reportFlags.$inferInsert
export type ReportComment = typeof reportComments.$inferSelect
export type NewReportComment = typeof reportComments.$inferInsert
export type ReportInterest = typeof reportInterests.$inferSelect
