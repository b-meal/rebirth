import assert from "node:assert/strict";
import { test } from "node:test";

import {
  D_MAX_KM,
  MIN_TRACK_NODES,
  R_MAX_KM,
  buildTrack,
  isFeasibleLeg,
  predictNext,
  straightness,
  straightnessEffective,
  type TrackNode,
} from "./track.ts";

const 서교동 = { lat: 37.5561, lng: 126.9231 };
const 기준시각 = new Date("2026-09-12T00:00:00Z");

// 위도 0.009 도는 약 1km, 경도는 쓰지 않아 보정이 필요 없음
const 북쪽 = (km: number) => ({ lat: 서교동.lat + km / 111.32, lng: 서교동.lng });

// 경도 1도의 실거리는 위도별로 줄어들어 cos 보정 대상
const 북서 = (북km: number, 서km: number) => ({
  lat: 서교동.lat + 북km / 111.32,
  lng: 서교동.lng - 서km / (111.32 * Math.cos((서교동.lat * Math.PI) / 180)),
});

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

test("소형견은 이틀이 지나도 이동 거리 상한 밖 노드를 다리로 잇지 않음", () => {
  const from = node({ id: "a" });
  assert.equal(D_MAX_KM.small, 5);
  assert.equal(
    isFeasibleLeg(from, node({ id: "b", point: 북쪽(20), occurredAt: 시각(48) }), "small"),
    false,
  );
  assert.equal(
    isFeasibleLeg(from, node({ id: "c", point: 북쪽(4), occurredAt: 시각(48) }), "small"),
    true,
  );
});

test("다리가 하나뿐인 경로는 방향성이 절반으로 깎이고 셋이면 살아남음", () => {
  const 한다리 = buildTrack({
    nodes: [node({ id: "a" }), node({ id: "b", point: 북쪽(1), occurredAt: 시각(2) })],
    size: "medium",
  });
  const 세다리 = buildTrack({
    nodes: [
      node({ id: "a" }),
      node({ id: "b", point: 북쪽(1), occurredAt: 시각(2) }),
      node({ id: "c", point: 북쪽(2), occurredAt: 시각(4) }),
      node({ id: "d", point: 북쪽(3), occurredAt: 시각(6) }),
    ],
    size: "medium",
  });
  assert.ok(한다리 !== null && straightnessEffective(한다리.legs) <= 0.5);
  assert.ok(세다리 !== null && straightnessEffective(세다리.legs) >= 0.7);
});

test("표류는 포화 시간까지만 쌓이고 방향은 다리 합벡터를 따름", () => {
  const 직선 = buildTrack({
    nodes: [
      node({ id: "a" }),
      node({ id: "b", point: 북쪽(1), occurredAt: 시각(2) }),
      node({ id: "c", point: 북쪽(2), occurredAt: 시각(4) }),
    ],
    size: "medium",
  });
  assert.ok(직선 !== null);
  const 포화직후 = predictNext({ track: 직선, size: "medium", now: 시각(12) });
  const 한참뒤 = predictNext({ track: 직선, size: "medium", now: 시각(200) });
  assert.ok(포화직후 !== null && 한참뒤 !== null);
  assert.deepEqual(한참뒤.center, 포화직후.center);
  assert.equal(포화직후.straightness, straightnessEffective(직선.legs));

  const 끝만서쪽 = buildTrack({
    nodes: [
      node({ id: "a" }),
      node({ id: "b", point: 북쪽(2), occurredAt: 시각(4) }),
      node({ id: "c", point: 북쪽(4), occurredAt: 시각(8) }),
      node({ id: "d", point: 북서(4, 1), occurredAt: 시각(10) }),
    ],
    size: "medium",
  });
  assert.ok(끝만서쪽 !== null);
  const 예측 = predictNext({ track: 끝만서쪽, size: "medium", now: 시각(14) });
  assert.ok(예측 !== null && 예측.bearingDeg > 315 && 예측.bearingDeg < 360);
});
