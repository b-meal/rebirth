import assert from "node:assert/strict";
import { test } from "node:test";

import type { LatLng } from "../location/geo.ts";
import {
  SPOT_LIMIT,
  rankSpots,
  type SpotCandidate,
} from "./search-spots.ts";

const 중심: LatLng = { lat: 37.5561, lng: 126.9231 };

// 위도 1도는 약 111.32km. 북쪽으로만 옮겨 거리만 바꿈
const 북쪽 = (km: number): LatLng => ({
  lat: 중심.lat + km / 111.32,
  lng: 중심.lng,
});

test("예측 반경 위의 공원이 중심에 붙은 학교보다 앞에 온다", () => {
  const candidates: SpotCandidate[] = [
    { name: "중심초등학교", point: 북쪽(0.02), keyword: "학교" },
    { name: "반경공원", point: 북쪽(1), keyword: "공원" },
  ];
  const spots = rankSpots({ candidates, center: 중심, radiusKm: 1 });
  assert.equal(spots[0]?.name, "반경공원");
  assert.ok(spots[0]!.priority > spots[1]!.priority);
});

test("이름이 같은 후보 둘을 하나로 합친다", () => {
  const candidates: SpotCandidate[] = [
    { name: "한강공원", point: 북쪽(1), keyword: "공원" },
    { name: "한강공원", point: 북쪽(3), keyword: "하천" },
  ];
  const spots = rankSpots({ candidates, center: 중심, radiusKm: 1 });
  assert.equal(spots.length, 1);
  assert.equal(spots[0]?.keyword, "공원");
});

test("후보 10개를 넣어도 SPOT_LIMIT 개만 돌려준다", () => {
  const candidates: SpotCandidate[] = Array.from({ length: 10 }, (_, i) => ({
    name: `공원${i}`,
    point: 북쪽(0.2 * (i + 1)),
    keyword: "공원" as const,
  }));
  const spots = rankSpots({ candidates, center: 중심, radiusKm: 1 });
  assert.equal(spots.length, SPOT_LIMIT);
});
