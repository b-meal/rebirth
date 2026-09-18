import 'server-only'

import { and, eq, sql as raw } from 'drizzle-orm'

import { db } from '../client'
import { shelters } from '../schema'

/* 보호·구조 기관 조회. 공공데이터 사본이라 개인정보가 없고 좌표를 그대로 내보냄 */

// 안내할 최대 거리. 이보다 멀면 연락해도 관할이 아니라 도움이 되지 않음
export const NEARBY_RADIUS_M = 50_000

export type NearbyShelter = Awaited<ReturnType<typeof findNearbyShelters>>[number]

/**
 * 좌표에서 가까운 순으로 기관을 찾음. 좌표가 없는 행은 대상에서 빠짐
 * kind 를 주면 동물보호센터와 야생동물구조센터 중 한쪽만 봄
 */
export function findNearbyShelters(input: {
  point: { lat: number; lng: number }
  kind?: (typeof shelters.kind.enumValues)[number]
  limit?: number
  /** 이어 읽을 자리. 기관 목록은 거의 바뀌지 않아 건너뛴 수로 셈 */
  offset?: number
}) {
  const origin = raw`ST_SetSRID(ST_MakePoint(${input.point.lng}, ${input.point.lat}), 4326)::geography`
  const distance = raw`ST_Distance(${shelters.point}::geography, ${origin})`

  return db
    .select({
      id: shelters.id,
      kind: shelters.kind,
      name: shelters.name,
      orgName: shelters.orgName,
      targetAnimals: shelters.targetAnimals,
      roadAddress: shelters.roadAddress,
      lotAddress: shelters.lotAddress,
      tel: shelters.tel,
      weekdayOpen: shelters.weekdayOpen,
      weekdayClose: shelters.weekdayClose,
      weekendOpen: shelters.weekendOpen,
      weekendClose: shelters.weekendClose,
      closedDay: shelters.closedDay,
      distanceM: raw<number>`round(${distance})`.mapWith(Number),
    })
    .from(shelters)
    .where(
      and(
        raw`${shelters.point} is not null`,
        raw`ST_DWithin(${shelters.point}::geography, ${origin}, ${NEARBY_RADIUS_M})`,
        input.kind ? eq(shelters.kind, input.kind) : undefined,
      ),
    )
    // 거리가 같은 기관이 쪽을 넘나들지 않도록 id 까지 순서를 못 박음
    .orderBy(distance, shelters.id)
    .limit(input.limit ?? 3)
    .offset(input.offset ?? 0)
}

// 시드가 여러 번 돌아도 같은 행을 다시 쌓지 않게 출처 키로 덮어씀
export function upsertShelters(rows: (typeof shelters.$inferInsert)[]) {
  if (rows.length === 0) return Promise.resolve([])
  return db
    .insert(shelters)
    .values(rows)
    .onConflictDoUpdate({
      target: [shelters.kind, shelters.externalId],
      set: {
        name: raw`excluded.name`,
        orgName: raw`excluded.org_name`,
        targetAnimals: raw`excluded.target_animals`,
        roadAddress: raw`excluded.road_address`,
        lotAddress: raw`excluded.lot_address`,
        point: raw`excluded.point`,
        tel: raw`excluded.tel`,
        weekdayOpen: raw`excluded.weekday_open`,
        weekdayClose: raw`excluded.weekday_close`,
        weekendOpen: raw`excluded.weekend_open`,
        weekendClose: raw`excluded.weekend_close`,
        closedDay: raw`excluded.closed_day`,
        vetCount: raw`excluded.vet_count`,
        keeperCount: raw`excluded.keeper_count`,
        dataDate: raw`excluded.data_date`,
        syncedAt: raw`now()`,
      },
    })
    .returning({ id: shelters.id })
}

/** 좌표 없이 지역으로 찾는 경로. 위치 권한을 주지 않은 사람도 목록을 봄 */
export function listSheltersByRegion(input: {
  region?: string
  kind?: (typeof shelters.kind.enumValues)[number]
  limit?: number
  /** 이어 읽을 자리. 기관 목록은 거의 바뀌지 않아 건너뛴 수로 셈 */
  offset?: number
}) {
  return db
    .select({
      id: shelters.id,
      kind: shelters.kind,
      name: shelters.name,
      orgName: shelters.orgName,
      targetAnimals: shelters.targetAnimals,
      roadAddress: shelters.roadAddress,
      lotAddress: shelters.lotAddress,
      tel: shelters.tel,
      weekdayOpen: shelters.weekdayOpen,
      weekdayClose: shelters.weekdayClose,
      weekendOpen: shelters.weekendOpen,
      weekendClose: shelters.weekendClose,
      closedDay: shelters.closedDay,
    })
    .from(shelters)
    .where(
      and(
        input.region
          ? raw`coalesce(${shelters.roadAddress}, ${shelters.orgName}, '') like ${input.region + '%'}`
          : undefined,
        input.kind ? eq(shelters.kind, input.kind) : undefined,
      ),
    )
    // 이름이 같은 기관이 쪽을 넘나들지 않도록 id 까지 순서를 못 박음
    .orderBy(shelters.name, shelters.id)
    .limit(input.limit ?? 50)
    .offset(input.offset ?? 0)
}

export function countShelters() {
  return db
    .select({
      kind: shelters.kind,
      total: raw<number>`count(*)`.mapWith(Number),
      withPoint: raw<number>`count(${shelters.point})`.mapWith(Number),
    })
    .from(shelters)
    .groupBy(shelters.kind)
}
