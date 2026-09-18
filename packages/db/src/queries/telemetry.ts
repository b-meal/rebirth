import 'server-only'

import { db } from '../client'
import { precheckEvents } from '../schema'

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
