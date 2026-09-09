import type { AnalyzeResult } from '@rebirth/types'
import { relations } from 'drizzle-orm'
import {
  boolean,
  geometry,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

import {
  animalSex,
  animalSize,
  animalType,
  careSituation,
  neuterStatus,
  reportKind,
  reportStatus,
} from './enums'

// POST /api/analyze 응답 원본. 사용자 확정값과 분리해 평가용으로 보관
export type AiDraft = AnalyzeResult

export const reports = pgTable(
  'reports',
  {
    id: uuid().defaultRandom().primaryKey(),
    kind: reportKind().notNull().default('sighting'),
    status: reportStatus().notNull().default('draft'),

    // 비로그인 제보 허용이라 nullable. Supabase auth.users.id 를 FK 없이 참조
    reporterId: uuid(),
    // 연락처는 저장하지 않음. 익명 조회·수정용 토큰만 발급
    contactToken: text().unique(),

    // 제보 1단계 필수 입력. condition_tags 에 섞으면 분기할 수 없어 열로 둠
    careSituation: careSituation().notNull().default('unknown'),

    // 사용자가 확정한 값. AI 초안을 그대로 두거나 고쳐서 저장
    animalType: animalType().notNull().default('unknown'),
    appearance: text(),
    colors: text().array().notNull().default([]),
    size: animalSize().notNull().default('unknown'),
    sex: animalSex().notNull().default('unknown'),
    neutered: neuterStatus().notNull().default('unknown'),
    conditionTags: text().array().notNull().default([]),
    collar: boolean(),
    injury: boolean(),
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
    areaCode: text(),
    areaName: text(),

    occurredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    shareCount: integer().notNull().default(0),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('reports_exact_point_idx').using('gist', t.exactPoint),
    index('reports_coarse_point_idx').using('gist', t.coarsePoint),
    index('reports_feed_idx').on(t.kind, t.status, t.occurredAt.desc()),
    index('reports_area_idx').on(t.areaCode),
    index('reports_reporter_idx').on(t.reporterId),
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

export const reportsRelations = relations(reports, ({ many }) => ({
  photos: many(reportPhotos),
  matchesAsLost: many(matchScores, { relationName: 'lost' }),
  matchesAsSighting: many(matchScores, { relationName: 'sighting' }),
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
