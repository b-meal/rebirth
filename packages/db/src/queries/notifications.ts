import 'server-only'

import { and, desc, eq, sql as raw } from 'drizzle-orm'

import type { AreaCodeSystem } from '@rebirth/types'

import { db } from '../client'
import { AREA_SUBSCRIPTION_LIMIT, areaSubscriptions, reports } from '../schema'
import { publicReportColumns, type PublicReport } from './reports'

// 동네 구독과 안 읽은 수
// 알림 행을 만들지 않고 lastReadAt 이후 제보를 세어 같은 숫자를 냄

/** 구독 지역에서 안 읽은 제보를 세는 조건. 내가 올린 제보는 나에게 알리지 않음 */
const unreadCondition = raw`
  ${reports.visibility} = 'public'
  and ${reports.lifecycle} in ('active', 'searching')
  and ${reports.areaCode} like ${areaSubscriptions.areaCode} || '%'
  and ${reports.createdAt} > ${areaSubscriptions.lastReadAt}
  and (${reports.reporterId} is null
       or ${reports.reporterId} <> ${areaSubscriptions.userId})
`

export type AreaSubscriptionRow = {
  areaCode: string
  areaCodeSystem: AreaCodeSystem
  areaName: string
  lastReadAt: Date
  unread: number
}

/** 구독 목록과 동네별 안 읽은 수. 알림함 화면이 이 한 번으로 그려짐 */
export async function listAreaSubscriptions(
  userId: string,
): Promise<AreaSubscriptionRow[]> {
  const rows = await db
    .select({
      areaCode: areaSubscriptions.areaCode,
      areaCodeSystem: areaSubscriptions.areaCodeSystem,
      areaName: areaSubscriptions.areaName,
      lastReadAt: areaSubscriptions.lastReadAt,
      unread: raw<number>`(
        select count(*)::int from ${reports} where ${unreadCondition}
      )`,
    })
    .from(areaSubscriptions)
    .where(eq(areaSubscriptions.userId, userId))
    .orderBy(desc(areaSubscriptions.createdAt))

  return rows
}

/** 하단 탭과 마이페이지에 붙는 배지 숫자. 구독이 없으면 0 */
export async function countUnreadAreaReports(userId: string): Promise<number> {
  const [row] = await db
    .select({
      unread: raw<number>`coalesce(sum((
        select count(*) from ${reports} where ${unreadCondition}
      )), 0)::int`,
    })
    .from(areaSubscriptions)
    .where(eq(areaSubscriptions.userId, userId))

  return row?.unread ?? 0
}

/** 알림함 한 줄. readAt 보다 나중에 올라왔으면 안 읽음 */
export type SubscribedAreaReport = PublicReport & { readAt: Date | null }

/** 구독한 동네에 올라온 제보를 최신순으로. 알림함 목록이 이 결과를 그대로 그림 */
export async function listSubscribedAreaReports(
  userId: string,
  limit = 30,
): Promise<SubscribedAreaReport[]> {
  const subscribed = raw`
    exists (
      select 1 from ${areaSubscriptions} s
      where s.user_id = ${userId}
        and ${reports.areaCode} like s.area_code || '%'
    )
  `

  return db
    .select({
      ...publicReportColumns,
      // 구와 동을 겹쳐 구독했으면 더 최근에 읽은 쪽을 기준으로 삼아 덜 시끄럽게 함
      readAt: raw<Date | null>`(
        select max(s.last_read_at) from ${areaSubscriptions} s
        where s.user_id = ${userId}
          and ${reports.areaCode} like s.area_code || '%'
      )`,
    })
    .from(reports)
    .where(
      and(
        eq(reports.visibility, 'public'),
        raw`${reports.lifecycle} in ('active', 'searching')`,
        raw`(${reports.reporterId} is null or ${reports.reporterId} <> ${userId})`,
        subscribed,
      ),
    )
    .orderBy(desc(reports.createdAt))
    .limit(limit)
}

export type AddAreaSubscriptionInput = {
  userId: string
  areaCode: string
  areaCodeSystem: AreaCodeSystem
  areaName: string
}

/**
 * 동네를 구독함. 이미 구독한 동네면 이름만 최신으로 맞추고 읽은 시각은 건드리지 않음
 * 상한을 넘으면 false 를 돌려주고 화면이 정리를 안내함
 */
export async function addAreaSubscription(
  input: AddAreaSubscriptionInput,
): Promise<boolean> {
  // 상한이 10 이라 전부 읽어도 한 줌이고 개수와 중복 여부를 한 번에 봄
  const owned = await db
    .select({ areaCode: areaSubscriptions.areaCode })
    .from(areaSubscriptions)
    .where(eq(areaSubscriptions.userId, input.userId))

  const already = owned.some((row) => row.areaCode === input.areaCode)
  if (!already && owned.length >= AREA_SUBSCRIPTION_LIMIT) return false

  await db
    .insert(areaSubscriptions)
    .values(input)
    .onConflictDoUpdate({
      target: [areaSubscriptions.userId, areaSubscriptions.areaCode],
      set: { areaName: input.areaName, areaCodeSystem: input.areaCodeSystem },
    })

  return true
}

export async function removeAreaSubscription(userId: string, areaCode: string) {
  await db
    .delete(areaSubscriptions)
    .where(
      and(
        eq(areaSubscriptions.userId, userId),
        eq(areaSubscriptions.areaCode, areaCode),
      ),
    )
}

/** 알림함을 열면 전체를 읽음 처리함. 항목별 읽음은 두지 않아 상태가 하나로 유지됨 */
export async function markAreaSubscriptionsRead(userId: string) {
  await db
    .update(areaSubscriptions)
    .set({ lastReadAt: new Date() })
    .where(eq(areaSubscriptions.userId, userId))
}
