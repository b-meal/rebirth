import 'server-only'

import { asc, desc, eq, sql as raw } from 'drizzle-orm'

import { db } from '../client'
import { animalKinds, govRegions, reports, rescueStats } from '../schema'

/* 국가동물보호정보시스템 코드와 공고 집계 */

export function upsertAnimalKinds(rows: (typeof animalKinds.$inferInsert)[]) {
  if (rows.length === 0) return Promise.resolve([])
  return db
    .insert(animalKinds)
    .values(rows)
    .onConflictDoUpdate({
      target: animalKinds.kindCd,
      set: {
        kindNm: raw`excluded.kind_nm`,
        upKindCd: raw`excluded.up_kind_cd`,
        upKindNm: raw`excluded.up_kind_nm`,
      },
    })
    .returning({ kindCd: animalKinds.kindCd })
}

export function upsertGovRegions(rows: (typeof govRegions.$inferInsert)[]) {
  if (rows.length === 0) return Promise.resolve([])
  return db
    .insert(govRegions)
    .values(rows)
    .onConflictDoUpdate({
      target: govRegions.orgCd,
      set: { orgNm: raw`excluded.org_nm`, parentCd: raw`excluded.parent_cd` },
    })
    .returning({ orgCd: govRegions.orgCd })
}

/** 같은 날 다시 수집하면 덮어씀. 하루 한 줄이 그 날의 상태임 */
export function upsertRescueStats(rows: (typeof rescueStats.$inferInsert)[]) {
  if (rows.length === 0) return Promise.resolve([])
  return db
    .insert(rescueStats)
    .values(rows)
    .onConflictDoUpdate({
      target: [
        rescueStats.collectedOn,
        rescueStats.sidoCd,
        rescueStats.upKindNm,
        rescueStats.processState,
      ],
      set: { total: raw`excluded.total`, sidoNm: raw`excluded.sido_nm` },
    })
    .returning({ total: rescueStats.total })
}

export async function govDataSummary() {
  const [row] = await db
    .select({
      kinds: raw<number>`(select count(*) from ${animalKinds})::int`.mapWith(Number),
      sido: raw<number>`(select count(*) from ${govRegions} where parent_cd is null)::int`.mapWith(
        Number,
      ),
      sigungu: raw<number>`(select count(*) from ${govRegions} where parent_cd is not null)::int`.mapWith(
        Number,
      ),
      statDays: raw<number>`(select count(distinct collected_on) from ${rescueStats})::int`.mapWith(
        Number,
      ),
      lastCollectedOn: raw<string | null>`(select max(collected_on)::text from ${rescueStats})`,
    })
    .from(raw`(select 1) as t`)
  return row
}

/** 가장 최근 수집분만. 하루 안에서 처리상태별로 묶음 */
export function rescueStateTotals() {
  return db
    .select({
      processState: rescueStats.processState,
      total: raw<number>`sum(${rescueStats.total})::int`.mapWith(Number),
    })
    .from(rescueStats)
    .where(raw`${rescueStats.collectedOn} = (select max(collected_on) from ${rescueStats})`)
    .groupBy(rescueStats.processState)
    .orderBy(raw`2 desc`)
}

export function rescueKindTotals() {
  return db
    .select({
      upKindNm: rescueStats.upKindNm,
      total: raw<number>`sum(${rescueStats.total})::int`.mapWith(Number),
    })
    .from(rescueStats)
    .where(raw`${rescueStats.collectedOn} = (select max(collected_on) from ${rescueStats})`)
    .groupBy(rescueStats.upKindNm)
    .orderBy(raw`2 desc`)
}

export function rescueSidoTotals(limit = 12) {
  return db
    .select({
      sidoNm: rescueStats.sidoNm,
      total: raw<number>`sum(${rescueStats.total})::int`.mapWith(Number),
      sheltered: raw<number>`sum(${rescueStats.total}) filter (where ${rescueStats.processState} = '보호중')::int`.mapWith(
        Number,
      ),
    })
    .from(rescueStats)
    .where(raw`${rescueStats.collectedOn} = (select max(collected_on) from ${rescueStats})`)
    .groupBy(rescueStats.sidoNm)
    .orderBy(raw`2 desc`)
    .limit(limit)
}

/**
 * 표기 흔들림을 눌러 맞춘 대조 조건
 * 계열 추정 같은 꼬리말을 떼고 공백을 지운 뒤 어느 쪽이 어느 쪽을 품어도 맞다고 봄
 * 웰시 코기 는 웰시 코기 카디건 에, 슈나우저 는 미니어쳐 슈나우저 에 걸림
 *
 * 다듬는 식을 제보 행마다 걸면 제보 수 × 품종 수 만큼 돌아 제보가 늘수록 그대로 느려짐
 * 표기 종류로 먼저 묶어 종류마다 한 번만 다듬음. 같은 표기가 백 번 올라와도 한 번만 봄
 * 실측: 854건 700ms → 90ms, 17,080건 13.3초 → 99ms. 결과는 같음
 */
const BREED_MATCH_CTE = raw`
  guesses as (
    select breed_guess,
           replace(lower(regexp_replace(breed_guess, '\\s*(계열|믹스|추정)\\s*$', '')), ' ', '') as guess,
           count(*)::int as total
    from ${reports}
    where breed_guess is not null and breed_guess <> ''
    group by breed_guess
  ),
  kinds as (
    select distinct replace(lower(kind_nm), ' ', '') as kind from ${animalKinds}
  ),
  scored as (
    select guesses.*,
           exists (
             select 1 from kinds
             where kinds.kind like '%' || guesses.guess || '%'
                or guesses.guess like '%' || kinds.kind || '%'
           ) as matched
    from guesses
  )`

export type BreedCodeCoverage = {
  withGuess: number
  matched: number
  distinct: number
}

/**
 * 우리 breedGuess 가 표준 품종 코드에 몇 건이나 걸리는지
 * 품종을 단정하지 않으므로 맞추는 것이 목적이 아니라 표기 흔들림을 재는 것이 목적임
 */
export async function breedCodeCoverage(): Promise<BreedCodeCoverage> {
  const rows = await db.execute<BreedCodeCoverage>(raw`
    with ${BREED_MATCH_CTE}
    select coalesce(sum(total), 0)::int                       as "withGuess",
           coalesce(sum(total) filter (where matched), 0)::int as "matched",
           count(*)::int                                       as "distinct"
    from scored`)
  // 묶음 없는 집계라 늘 한 줄이지만 타입에는 그 사실이 없음
  return rows[0] ?? { withGuess: 0, matched: 0, distinct: 0 }
}

export type UnmatchedBreedGuess = { breedGuess: string; total: number }

/** 표준 코드에 걸리지 않는 표기. 프롬프트를 고칠 대상이 여기서 나옴 */
export async function unmatchedBreedGuesses(limit = 12): Promise<UnmatchedBreedGuess[]> {
  return db.execute<UnmatchedBreedGuess>(raw`
    with ${BREED_MATCH_CTE}
    select breed_guess as "breedGuess", total
    from scored
    where not matched
    -- 건수가 같은 표기가 많아 잘라 내는 자리에서 순서가 흔들림. 표기까지 못 박음
    order by total desc, breed_guess
    limit ${limit}`)
}

export function listAnimalKinds(upKindCd?: string) {
  return db
    .select({ kindCd: animalKinds.kindCd, kindNm: animalKinds.kindNm, upKindNm: animalKinds.upKindNm })
    .from(animalKinds)
    .where(upKindCd ? eq(animalKinds.upKindCd, upKindCd) : undefined)
    .orderBy(asc(animalKinds.kindNm))
}

export function listSidoRegions() {
  return db
    .select({ orgCd: govRegions.orgCd, orgNm: govRegions.orgNm })
    .from(govRegions)
    .where(raw`${govRegions.parentCd} is null`)
    .orderBy(desc(govRegions.orgCd))
}
