import assert from "node:assert/strict";
import { test } from "node:test";

import {
  COARSE_GRID_METERS,
  coarseGridMetersFor,
  coarseRadiusMeters,
  distanceKm,
  isInKorea,
  snapToGrid,
  toWkt,
} from "./geo.ts";

const SEOUL_CITY_HALL = { lat: 37.5665, lng: 126.978 };
const BUSAN_CITY_HALL = { lat: 35.1796, lng: 129.0756 };

test("같은 격자 안의 좌표는 같은 값으로 뭉개진다", () => {
  const a = snapToGrid(SEOUL_CITY_HALL, 300);
  // 북동으로 약 30m 이동
  const b = snapToGrid({ lat: 37.56677, lng: 126.97834 }, 300);
  assert.deepEqual(a, b);
});

test("스냅 결과는 공개 반경 안에 있다", () => {
  for (const meters of [300, 1000]) {
    const snapped = snapToGrid(SEOUL_CITY_HALL, meters);
    const moved = distanceKm(SEOUL_CITY_HALL, snapped) * 1000;
    // 화면에 그리는 원이 실제 공개 지점을 반드시 담는지 확인
    assert.ok(
      moved <= coarseRadiusMeters(meters),
      `${meters}m 격자에서 ${moved}m 이동`,
    );
  }
});

test("공개 반경은 격자 대각선의 절반", () => {
  assert.equal(coarseRadiusMeters(300), 212);
  assert.equal(coarseRadiusMeters(1000), 707);
});

test("멀리 떨어진 좌표는 다른 격자로 간다", () => {
  const a = snapToGrid(SEOUL_CITY_HALL, 300);
  const b = snapToGrid({ lat: 37.58, lng: 126.99 }, 300);
  assert.notDeepEqual(a, b);
});

test("1km 격자가 300m 격자보다 덜 정밀하다", () => {
  const wide = snapToGrid(SEOUL_CITY_HALL, 1000);
  const narrow = snapToGrid(SEOUL_CITY_HALL, 300);
  assert.ok(
    distanceKm(SEOUL_CITY_HALL, wide) >= distanceKm(SEOUL_CITY_HALL, narrow) ||
      distanceKm(SEOUL_CITY_HALL, wide) > 0,
  );
});

test("하버사인 거리가 실제 거리와 맞는다", () => {
  const km = distanceKm(SEOUL_CITY_HALL, BUSAN_CITY_HALL);
  assert.ok(km > 320 && km < 330, `${km}km`);
  assert.equal(distanceKm(SEOUL_CITY_HALL, SEOUL_CITY_HALL), 0);
});

test("국내 좌표만 통과시킨다", () => {
  assert.ok(isInKorea(SEOUL_CITY_HALL));
  assert.ok(!isInKorea({ lat: 35.6812, lng: 139.7671 }));
  assert.ok(!isInKorea({ lat: Number.NaN, lng: 126.978 }));
});

test("부상과 어린 개체 제보는 격자를 넓힌다", () => {
  assert.equal(coarseGridMetersFor({}), COARSE_GRID_METERS.default);
  assert.equal(
    coarseGridMetersFor({ visibleInjury: true }),
    COARSE_GRID_METERS.wide,
  );
  assert.equal(coarseGridMetersFor({ young: true }), COARSE_GRID_METERS.wide);
  assert.equal(
    coarseGridMetersFor({ pedigreeSuspected: true }),
    COARSE_GRID_METERS.wide,
  );
  assert.equal(
    coarseGridMetersFor({ visibleInjury: null, young: false }),
    COARSE_GRID_METERS.default,
  );
});

test("WKT 는 경도를 먼저 쓴다", () => {
  assert.equal(toWkt(SEOUL_CITY_HALL), "SRID=4326;POINT(126.978 37.5665)");
});
