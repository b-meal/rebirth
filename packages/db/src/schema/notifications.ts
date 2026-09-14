import { relations } from 'drizzle-orm'
import { index, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { areaCodeSystem } from './enums'
import { userProfiles } from './accounts'

// 동네 구독과 안 읽은 수. REQ-019 의 지역 알림을 앱 안 알림함으로만 제공함
// 제보가 올라올 때 구독자마다 알림 행을 뿌리지 않음
// lastReadAt 이후 제보를 세면 같은 숫자가 나오고 배치도 크론도 필요 없음

/** 한 계정이 구독할 수 있는 동네 수. 안 읽은 수 질의가 구독마다 한 번 도는 비용 상한 */
export const AREA_SUBSCRIPTION_LIMIT = 10

export const areaSubscriptions = pgTable(
  'area_subscriptions',
  {
    // user_profiles.id 와 같은 값. 익명 세션은 수명이 24시간·7일이라 구독을 담지 못함
    userId: uuid().notNull(),

    // 접두 일치로 비교하므로 상위 구역을 구독하면 하위 동이 모두 포함됨
    areaCode: text().notNull(),
    areaCodeSystem: areaCodeSystem().notNull(),
    // 행정구역 개편으로 코드가 바뀌어도 구독 목록에 이름이 남도록 저장 시점 값을 둠
    areaName: text().notNull(),

    // 이 시각 이후 올라온 제보가 안 읽음. 알림함을 열면 지금 시각으로 올라감
    lastReadAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.areaCode] }),
    index('area_subscriptions_user_idx').on(t.userId, t.createdAt.desc()),
  ],
)

export const areaSubscriptionsRelations = relations(areaSubscriptions, ({ one }) => ({
  user: one(userProfiles, {
    fields: [areaSubscriptions.userId],
    references: [userProfiles.id],
  }),
}))

export type AreaSubscription = typeof areaSubscriptions.$inferSelect
export type NewAreaSubscription = typeof areaSubscriptions.$inferInsert
