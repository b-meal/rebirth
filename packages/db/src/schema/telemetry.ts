import {
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import { errorLevel, precheckSource, precheckVerdict } from './enums'

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

// 서버에서 난 실패를 종류별로 묶어 세는 자리
//
// Vercel 무료 플랜의 런타임 로그는 한 시간만 남아 화면에서 사라진 뒤에는 볼 방법이 없음
// 같은 오류가 천 번 나도 행은 하나이고 count 만 오르므로, 저장 공간은 오류 종류 수에 비례함
//
// 사진, 좌표, 토큰, 키는 담지 않음. 메시지는 잘라 넣고 넣기 전에 한 번 더 지움
export const errorEvents = pgTable(
  'error_events',
  {
    // 태그와 메시지에서 숫자와 식별자를 지운 뒤 만든 해시. 같은 종류를 한 행에 모음
    fingerprint: text().primaryKey(),

    level: errorLevel().notNull(),
    // 기능.동작 꼴. 어디서 난 것인지가 먼저 읽힘
    tag: text().notNull(),
    // 마지막으로 본 메시지. 종류가 같아도 값은 달라질 수 있어 최근 것으로 덮음
    message: text().notNull(),
    stack: text(),
    context: jsonb(),

    count: integer().notNull().default(1),
    firstSeenAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  // 운영자 화면은 늘 최근에 본 순서로 읽음
  (t) => [index('error_events_last_seen_idx').on(t.lastSeenAt)],
)
