import { relations } from 'drizzle-orm'
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { animalSize, animalType, authProvider } from './enums'

// SNS 로그인 계정. 신원 확인과 토큰 갱신은 Supabase Auth 가 맡고
// 이 테이블은 서비스가 쓰는 표시 정보만 둠. auth.users 를 직접 조인하지 않음
// Supabase 가 관리하는 스키마에 의존하면 마이그레이션이 그쪽 변경에 묶임

export const userProfiles = pgTable(
  'user_profiles',
  {
    // auth.users.id 와 같은 값. FK 를 걸지 않아 auth 스키마와 결합하지 않음
    id: uuid().primaryKey(),
    // 최초 로그인에 쓴 제공자. 계정 연동 후에도 처음 경로를 남김
    provider: authProvider().notNull(),
    // 화면에 보일 이름. 제공자가 주지 않으면 비움
    displayName: text(),
    avatarUrl: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastSignedInAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    // 탈퇴 요청 시각. 행을 지우지 않아 제보와의 연결이 끊기지 않음
    deletedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index('user_profiles_last_signed_in_idx').on(t.lastSignedInAt)],
)

// 내가 키우는 동물. 실종 신고를 빠르게 채우려고 미리 적어 두는 기록
// 발견 제보와 열을 공유하지 않음. 목적이 달라 수명과 공개 범위가 다름
export const pets = pgTable(
  'pets',
  {
    id: uuid().defaultRandom().primaryKey(),
    // user_profiles.id 와 같은 값. 계정이 지워져도 기록은 남김
    ownerId: uuid().notNull(),
    name: text().notNull(),
    animalType: animalType().notNull().default('unknown'),
    // 품종 추정. 화면에서는 계열 추정으로만 표기함
    breedGuess: text(),
    size: animalSize().notNull().default('unknown'),
    colors: text().array().notNull().default([]),
    // 목줄 색이나 습관처럼 찾을 때 쓸 메모
    note: text(),
    // Supabase Storage 오브젝트 키. 서명 URL 로만 노출
    photoPath: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index('pets_owner_idx').on(t.ownerId, t.createdAt.desc())],
)

export const userProfilesRelations = relations(userProfiles, () => ({}))

export type UserProfile = typeof userProfiles.$inferSelect
export type NewUserProfile = typeof userProfiles.$inferInsert
export type Pet = typeof pets.$inferSelect
export type NewPet = typeof pets.$inferInsert
