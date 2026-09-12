import { relations } from 'drizzle-orm'
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { authProvider } from './enums'

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

export const userProfilesRelations = relations(userProfiles, () => ({}))

export type UserProfile = typeof userProfiles.$inferSelect
export type NewUserProfile = typeof userProfiles.$inferInsert
