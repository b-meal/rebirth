import { date, index, integer, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core'

// 국가동물보호정보시스템이 쓰는 코드와 공고 통계
// 공고 원본 7천여 건을 통째로 들고 있지 않고 집계만 남김. 개체 정보는 우리 것이 아님

/** 품종 코드. 우리 breedGuess 는 자유 문자열이라 표준 코드에 맞춰 볼 기준이 필요함 */
export const animalKinds = pgTable(
  'animal_kinds',
  {
    kindCd: text().primaryKey(),
    kindNm: text().notNull(),
    // 417000 개, 422400 고양이, 429900 기타
    upKindCd: text().notNull(),
    upKindNm: text().notNull(),
  },
  (t) => [index('animal_kinds_up_idx').on(t.upKindCd, t.kindNm)],
)

/** 시도와 시군구 코드. 우리 areaCode 는 행정동이라 체계가 달라 이름으로 맞춰 봄 */
export const govRegions = pgTable(
  'gov_regions',
  {
    orgCd: text().primaryKey(),
    orgNm: text().notNull(),
    // 시도는 null, 시군구는 상위 시도 코드
    parentCd: text(),
  },
  (t) => [index('gov_regions_parent_idx').on(t.parentCd, t.orgNm)],
)

/**
 * 공고 구조동물 집계. 수집한 날짜별로 한 줄씩 쌓아 추이를 봄
 * 개체 단위를 저장하지 않는 이유는 우리가 보관 주체가 아니기 때문임
 */
export const rescueStats = pgTable(
  'rescue_stats',
  {
    collectedOn: date().notNull(),
    sidoCd: text().notNull(),
    sidoNm: text().notNull(),
    // 개 고양이 기타
    upKindNm: text().notNull(),
    // 보호중 종료(입양) 종료(반환) 종료(자연사) 등
    processState: text().notNull(),
    total: integer().notNull(),
  },
  (t) => [
    uniqueIndex('rescue_stats_key_uk').on(
      t.collectedOn,
      t.sidoCd,
      t.upKindNm,
      t.processState,
    ),
    index('rescue_stats_day_idx').on(t.collectedOn),
  ],
)

export type AnimalKind = typeof animalKinds.$inferSelect
export type GovRegion = typeof govRegions.$inferSelect
export type RescueStat = typeof rescueStats.$inferSelect
