import 'server-only'

import { desc, lt, sql } from 'drizzle-orm'

import { db } from '../client'
import { errorEvents, precheckEvents } from '../schema'

// 선검사 판정 기록. 읽는 쪽은 아직 없고 SQL 로 분포를 직접 봄
// 화면에 영향을 주지 않는 곁가지라 실패를 위로 던지지 않음

export type PrecheckEventInput = typeof precheckEvents.$inferInsert

/** 사진 여러 장을 한 번에 받음. 실패해도 삼키고 넘어감 */
export async function insertPrecheckEvents(rows: PrecheckEventInput[]) {
  if (rows.length === 0) return
  try {
    await db.insert(precheckEvents).values(rows)
  } catch (error) {
    console.error('[precheck-events]', error)
  }
}

/* 서버 오류 기록 */

export type ErrorEventInput = {
  fingerprint: string
  level: 'failure' | 'notice'
  tag: string
  message: string
  stack?: string | null
  context?: Record<string, string | number> | null
  /** 이번에 밀어 넣는 발생 횟수. 부르는 쪽이 모아 두었다가 한 번에 올림 */
  occurrences?: number
}

/**
 * 같은 종류면 count 만 올림. 행 수가 오류 종류 수를 넘지 않음
 * 기록 자체가 실패해도 삼킴. 여기서 던지면 원래 실패 위에 실패가 겹침
 */
export async function recordErrorEvent(event: ErrorEventInput) {
  try {
    await db
      .insert(errorEvents)
      .values({
        fingerprint: event.fingerprint,
        level: event.level,
        tag: event.tag,
        message: event.message,
        stack: event.stack ?? null,
        context: event.context ?? null,
        count: event.occurrences ?? 1,
      })
      .onConflictDoUpdate({
        target: errorEvents.fingerprint,
        set: {
          count: sql`${errorEvents.count} + ${event.occurrences ?? 1}`,
          lastSeenAt: new Date(),
          message: event.message,
          stack: event.stack ?? null,
          context: event.context ?? null,
        },
      })
  } catch (error) {
    // logFailure 를 쓰면 이 실패가 다시 여기로 돌아옴. 콘솔에서 끊음
    console.error('[error-events] 기록 실패', error)
  }
}

/** 운영자 화면용. 최근에 본 순서로 봄 */
export async function listErrorEvents(limit = 50) {
  return db
    .select()
    .from(errorEvents)
    .orderBy(desc(errorEvents.lastSeenAt))
    .limit(limit)
}

/** 오래돼 다시 나타나지 않는 기록을 지움 */
export async function deleteErrorEventsBefore(cutoff: Date) {
  await db.delete(errorEvents).where(lt(errorEvents.lastSeenAt, cutoff))
}
