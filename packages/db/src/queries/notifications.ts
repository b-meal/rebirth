import 'server-only'

import { and, desc, eq, gte, sql as raw } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import type { AreaCodeSystem } from '@rebirth/types'

import { db } from '../client'
import {
  AREA_SUBSCRIPTION_LIMIT,
  areaSubscriptions,
  matchScores,
  reports,
} from '../schema'
import { MATCH_ALERT_MIN_SCORE } from './lost'
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
  // 구독 전에 올라온 제보는 알림이 아니므로 목록에 넣지 않음
  const subscribed = raw`
    exists (
      select 1 from ${areaSubscriptions} s
      where s.user_id = ${userId}
        and ${reports.areaCode} like s.area_code || '%'
        and ${reports.createdAt} > s.created_at
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
          and ${reports.createdAt} > s.created_at
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

/**
 * 구독에 쓸 제보의 행정구역
 * 공개 응답은 areaName 까지만 내보내므로 화면은 제보 id 만 넘기고 코드는 서버가 읽음
 */
export async function findPublicReportArea(reportId: string) {
  const [row] = await db
    .select({
      areaCode: reports.areaCode,
      areaCodeSystem: reports.areaCodeSystem,
      areaName: reports.areaName,
    })
    .from(reports)
    .where(and(eq(reports.id, reportId), eq(reports.visibility, 'public')))

  return row
}

/** 그 제보의 동네를 이미 구독했는지. 상위 구역을 구독한 경우도 켜진 것으로 봄 */
export async function isReportAreaSubscribed(userId: string, reportId: string) {
  const [row] = await db
    .select({ subscribed: raw<boolean>`true` })
    .from(reports)
    .where(
      and(
        eq(reports.id, reportId),
        raw`exists (
          select 1 from ${areaSubscriptions} s
          where s.user_id = ${userId}
            and ${reports.areaCode} like s.area_code || '%'
        )`,
      ),
    )

  return Boolean(row?.subscribed)
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

  // 이미 구독한 동네를 다시 누르면 구독 시각과 읽은 시각을 되돌리지 않음
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

/* 닮은 제보 알림. 동네 구독과 같이 알림 행을 만들지 않고 셀 때 계산함 */

// 한 표를 두 번 쓰므로 이름을 나눠 붙임
const lost = alias(reports, 'lost')
const sighting = alias(reports, 'sighting')

/**
 * 알림에 올릴 짝을 고르는 조건
 * 알림을 켜 둔 내 찾는 중 신고만 보고, 확인 시각 뒤에 올라온 제보만 안 읽음으로 셈
 * 점수는 제보가 들어올 때 캐시에 남으므로 여기서는 읽기만 함
 */
function unreadMatchWhere(userId: string) {
  return and(
    eq(lost.reporterId, userId),
    eq(lost.kind, 'lost'),
    eq(lost.visibility, 'public'),
    eq(lost.lifecycle, 'searching'),
    eq(lost.matchAlert, true),
    gte(matchScores.score, MATCH_ALERT_MIN_SCORE),
    eq(sighting.visibility, 'public'),
    eq(sighting.lifecycle, 'active'),
    raw`${sighting.createdAt} > ${lost.matchAlertReadAt}`,
  )
}

/** 하단 배지에 더할 수. 실종 신고가 없으면 0 */
export async function countUnreadMatchAlerts(userId: string): Promise<number> {
  const [row] = await db
    .select({ unread: raw<number>`count(*)::int` })
    .from(matchScores)
    .innerJoin(lost, eq(lost.id, matchScores.lostId))
    .innerJoin(sighting, eq(sighting.id, matchScores.sightingId))
    .where(unreadMatchWhere(userId))

  return row?.unread ?? 0
}

/** 알림함 한 줄. 어느 신고와 닮았는지 함께 넘겨 무엇과 견준 점수인지 밝힘 */
export type MatchAlertRow = PublicReport & {
  score: number
  lostId: string
  /** 보호자가 적어 둔 이름. 없으면 화면이 생김새로 부름 */
  lostName: string | null
  /** 이 시각 뒤에 올라온 제보가 안 읽음. 동네 알림과 같은 기준 */
  lostReadAt: Date
}

/**
 * 닮은 제보 목록. 점수가 높은 순
 * 같은 제보가 여러 신고에 걸리면 가장 높은 점수 한 줄로만 보여 목록이 겹치지 않음
 */
export async function listMatchAlerts(
  userId: string,
  limit = 30,
): Promise<MatchAlertRow[]> {
  const rows = await db
    .select({
      ...publicReportColumns,
      id: sighting.id,
      kind: sighting.kind,
      visibility: sighting.visibility,
      lifecycle: sighting.lifecycle,
      careSituation: sighting.careSituation,
      animalType: sighting.animalType,
      breedGuess: sighting.breedGuess,
      appearance: sighting.appearance,
      colors: sighting.colors,
      size: sighting.size,
      sex: sighting.sex,
      neutered: sighting.neutered,
      conditionTags: sighting.conditionTags,
      collar: sighting.collar,
      injury: sighting.injury,
      earTip: sighting.earTip,
      areaName: sighting.areaName,
      landmarkNote: sighting.landmarkNote,
      occurredAt: sighting.occurredAt,
      shareCount: sighting.shareCount,
      createdAt: sighting.createdAt,
      score: matchScores.score,
      lostId: lost.id,
      lostReadAt: lost.matchAlertReadAt,
      lostName: raw<string | null>`(
        select p.name from pets p where p.id = lost.pet_id
      )`,
    })
    .from(matchScores)
    .innerJoin(lost, eq(lost.id, matchScores.lostId))
    .innerJoin(sighting, eq(sighting.id, matchScores.sightingId))
    .where(
      and(
        eq(lost.reporterId, userId),
        eq(lost.kind, 'lost'),
        eq(lost.visibility, 'public'),
        eq(lost.lifecycle, 'searching'),
        eq(lost.matchAlert, true),
        gte(matchScores.score, MATCH_ALERT_MIN_SCORE),
        eq(sighting.visibility, 'public'),
        eq(sighting.lifecycle, 'active'),
      ),
    )
    .orderBy(desc(matchScores.score), desc(sighting.createdAt))
    .limit(limit)

  // 한 제보가 여러 신고에 걸리면 첫 줄만 남김. 점수 높은 순으로 읽었으므로 첫 줄이 가장 높음
  const seen = new Set<string>()
  return rows.filter((row) => {
    if (seen.has(row.id)) return false
    seen.add(row.id)
    return true
  })
}

/** 알림함을 열면 전체를 읽음 처리함. 동네 구독과 같은 방식 */
export async function markMatchAlertsRead(userId: string) {
  await db
    .update(reports)
    .set({ matchAlertReadAt: new Date() })
    .where(and(eq(reports.reporterId, userId), eq(reports.kind, 'lost')))
}

/** 신고별 알림 스위치. 내 기록이 아니면 아무것도 바꾸지 않고 false 를 돌려줌 */
export async function setMatchAlert(input: {
  reportId: string
  userId: string
  enabled: boolean
}): Promise<boolean> {
  const [row] = await db
    .update(reports)
    .set({ matchAlert: input.enabled })
    .where(
      and(
        eq(reports.id, input.reportId),
        eq(reports.reporterId, input.userId),
        eq(reports.kind, 'lost'),
      ),
    )
    .returning({ id: reports.id })

  return Boolean(row)
}
