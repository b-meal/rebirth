import { index, integer, pgTable, real, timestamp, uuid } from 'drizzle-orm/pg-core'

import { precheckSource, precheckVerdict } from './enums'

// 1단계 선검사가 무엇을 어떻게 판정했는지만 남기는 자리
// 문턱을 표본 몇십 장이 아니라 실제로 올라오는 사진의 분포로 다시 잡으려고 둠
//
// 사진, 좌표, 세션, 사용자, IP 를 담지 않음. 숫자와 판정만 남으므로 지울 개인정보가 없음
// 판정을 막거나 늦추지 않는 곁가지라 기록이 실패해도 화면은 그대로 감

export const precheckEvents = pgTable(
  'precheck_events',
  {
    id: uuid().defaultRandom().primaryKey(),

    // 기기 모델이 낸 점수. 모델이 제때 준비되지 않았으면 비어 있음
    deviceScore: real(),
    // 그때 쓰인 문턱. 값을 바꿔도 지난 기록을 그대로 읽을 수 있음
    threshold: real(),
    // 기기 추론에 걸린 시간. 실기기에서 얼마나 걸리는지 보는 값
    deviceMs: integer(),

    // 두 층이 각각 무엇이라고 했는지. 갈린 횟수가 곧 문턱을 고칠 근거가 됨
    deviceVerdict: precheckVerdict(),
    serverVerdict: precheckVerdict(),

    // 화면에 나간 최종 판정과 그 판정을 낸 곳
    verdict: precheckVerdict().notNull(),
    source: precheckSource().notNull(),

    // 모델에 들어간 사진의 크기. 작거나 세로로 긴 사진이 불리한지 보는 값
    photoWidth: integer(),
    photoHeight: integer(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('precheck_events_created_idx').on(t.createdAt)],
)
