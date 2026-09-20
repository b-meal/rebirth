import { sql } from 'drizzle-orm'
import {
  geometry,
  index,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { shelterKind } from './enums'

// 공공데이터포털에서 한 번 내려받아 쌓는 보호·구조 기관 사본
// 런타임에 외부 API 를 부르지 않는 이유는 주소와 전화가 거의 바뀌지 않아서임

export const shelters = pgTable(
  'shelters',
  {
    id: uuid().defaultRandom().primaryKey(),
    kind: shelterKind().notNull(),
    // 보호센터등록번호. 야생동물구조센터는 번호가 없어 이름 기반 키로 대체
    externalId: text().notNull(),
    name: text().notNull(),
    // 관할 지자체명. 보호센터가 응답하지 않을 때 다음 연락처
    orgName: text(),
    // 구조대상동물 원문. 값이 자유 문자열이라 분해하지 않고 그대로 보관
    targetAnimals: text(),

    roadAddress: text(),
    lotAddress: text(),
    // 좌표가 빠진 행이 있어 nullable. 근처 조회 대상에서는 제외됨
    point: geometry({ type: 'point', mode: 'xy', srid: 4326 }),

    tel: text(),
    weekdayOpen: text(),
    weekdayClose: text(),
    weekendOpen: text(),
    weekendClose: text(),
    closedDay: text(),

    vetCount: smallint(),
    keeperCount: smallint(),

    // 공공데이터 기준일자. 재시드 때 갱신 여부 판단 근거
    dataDate: text(),
    syncedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('shelters_source_idx').on(t.kind, t.externalId),
    index('shelters_point_idx').using('gist', t.point),
    // 반경 질의가 ::geography 로 캐스팅해 위 인덱스는 쓰이지 못함
    // 389 행에서도 통째 훑기가 146ms, 식 인덱스로는 2.2ms
    index('shelters_point_geog_idx').using('gist', sql`(${t.point}::geography)`),
  ],
)
