import assert from "node:assert/strict";
import { test } from "node:test";

import {
  MIN_TRACK_NODES,
  R_MAX_KM,
  buildTrack,
  isFeasibleLeg,
  predictNext,
  straightness,
  type TrackNode,
} from "./track.ts";

const 서교동 = { lat: 37.5561, lng: 126.9231 };
const 기준시각 = new Date("2026-09-12T00:00:00Z");

// 위도 0.009 도는 약 1km, 경도는 쓰지 않아 보정이 필요 없음
const 북쪽 = (km: number) => ({ lat: 서교동.lat + km / 111.32, lng: 서교동.lng });

function node(over: Partial<TrackNode> = {}): TrackNode {
  return {
    id: "n",
    point: 서교동,
    occurredAt: 기준시각,
    score: 70,
    areaName: "서교동",
    ...over,
  };
}

const 시각 = (hours: number) => new Date(기준시각.getTime() + hours * 3_600_000);

test("소형견이 3시간에 2km 는 이동 가능, 30분에 10km 는 불가", () => {
  const from = node({ id: "a" });
  assert.equal(
    isFeasibleLeg(from, node({ id: "b", point: 북쪽(2), occurredAt: 시각(3) }), "small"),
    true,
  );
  assert.equal(
    isFeasibleLeg(from, node({ id: "c", point: 북쪽(10), occurredAt: 시각(0.5) }), "small"),
    false,
  );
});

test("한 방향 직선은 방향성이 높고 왕복은 낮음", () => {
  const 직선 = buildTrack({
    nodes: [
      node({ id: "a" }),
      node({ id: "b", point: 북쪽(1), occurredAt: 시각(2) }),
      node({ id: "c", point: 북쪽(2), occurredAt: 시각(4) }),
    ],
    size: "medium",
  });
  const 왕복 = buildTrack({
    nodes: [
      node({ id: "a" }),
      node({ id: "b", point: 북쪽(1), occurredAt: 시각(2) }),
      node({ id: "c", point: 서교동, occurredAt: 시각(4) }),
    ],
    size: "medium",
  });
  assert.ok(직선 !== null && straightness(직선.legs) >= 0.95);
  assert.ok(왕복 !== null && straightness(왕복.legs) <= 0.3);
});

test("예측 반경은 경과 시간이 길수록 커지고 상한을 넘지 않음", () => {
  const track = buildTrack({
    nodes: [
      node({ id: "a" }),
      node({ id: "b", point: 북쪽(1), occurredAt: 시각(2) }),
      node({ id: "c", point: 북쪽(2), occurredAt: 시각(4) }),
    ],
    size: "medium",
  });
  assert.ok(track !== null);
  const 네시간 = predictNext({ track, size: "medium", now: 시각(8) });
  const 열여섯시간 = predictNext({ track, size: "medium", now: 시각(20) });
  const 아주뒤 = predictNext({ track, size: "medium", now: 시각(4 + 2000) });
  assert.ok(네시간 !== null && 열여섯시간 !== null && 아주뒤 !== null);
  assert.ok(열여섯시간.radiusKm > 네시간.radiusKm);
  assert.ok(아주뒤.radiusKm <= R_MAX_KM);
});

test("노드가 최소 개수 미만이거나 점수 미달이면 경로가 없음", () => {
  assert.equal(buildTrack({ nodes: [node({ id: "a" })], size: "small" }), null);
  assert.equal(MIN_TRACK_NODES, 2);
  assert.equal(
    buildTrack({
      nodes: [
        node({ id: "a", score: 40 }),
        node({ id: "b", score: 30, point: 북쪽(1), occurredAt: 시각(2) }),
      ],
      size: "small",
    }),
    null,
  );
});
