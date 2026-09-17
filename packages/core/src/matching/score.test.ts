import assert from "node:assert/strict";
import { test } from "node:test";

import { MAX_SCORE, WEIGHTS, isComparable, scoreMatch, type MatchInput } from "./score.ts";

const 서교동 = { lat: 37.5561, lng: 126.9231 };
const 연남동 = { lat: 37.5626, lng: 126.9257 }; // 약 0.75km
const 부산 = { lat: 35.1796, lng: 129.0756 };

const 실종시각 = new Date("2026-09-08T04:30:00Z");

function lostPet(over: Partial<MatchInput> = {}): MatchInput {
  return {
    animalType: "dog",
    colors: ["흰색"],
    size: "small",
    collar: true,
    injury: false,
    earTip: null,
    point: 서교동,
    occurredAt: 실종시각,
    ...over,
  };
}

function sighting(over: Partial<MatchInput> = {}): MatchInput {
  return {
    animalType: "dog",
    colors: ["흰색"],
    size: "small",
    collar: true,
    injury: false,
    earTip: null,
    point: 연남동,
    // 실종 3시간 뒤
    occurredAt: new Date(실종시각.getTime() + 3 * 3_600_000),
    ...over,
  };
}

test("가깝고 최근이며 특징이 같으면 높은 점수", () => {
  const result = scoreMatch(lostPet(), sighting());
  assert.ok(result.score >= 80, `점수가 낮음: ${result.score}`);
  assert.ok(result.score <= MAX_SCORE);
});

test("먼 거리는 거리 점수가 0", () => {
  const result = scoreMatch(lostPet(), sighting({ point: 부산 }));
  assert.equal(result.breakdown.distance, 0);
  // 다른 항목은 그대로 남음
  assert.ok(result.breakdown.color > 0);
});

test("실종보다 앞선 목격은 시간 점수가 0", () => {
  const before = new Date(실종시각.getTime() - 5 * 3_600_000);
  const result = scoreMatch(lostPet(), sighting({ occurredAt: before }));
  assert.equal(result.breakdown.time, 0);
  assert.match(result.breakdown.reason, /앞선 목격/);
});

test("시간이 지날수록 시간 점수가 낮아짐", () => {
  const at = (hours: number) =>
    scoreMatch(lostPet(), sighting({ occurredAt: new Date(실종시각.getTime() + hours * 3_600_000) }))
      .breakdown.time;
  assert.ok(at(1) > at(24));
  assert.ok(at(24) > at(24 * 7));
  assert.equal(at(24 * 20), 0);
});

test("털색이 전부 겹치면 만점, 하나도 없으면 0", () => {
  const all = scoreMatch(lostPet({ colors: ["흰색", "갈색"] }), sighting({ colors: ["흰색", "갈색"] }));
  assert.equal(all.breakdown.color, WEIGHTS.color);

  const none = scoreMatch(lostPet({ colors: ["검정색"] }), sighting({ colors: ["흰색"] }));
  assert.equal(none.breakdown.color, 0);
});

test("색 이름이 포함 관계면 일치로 봄", () => {
  const result = scoreMatch(lostPet({ colors: ["흰색"] }), sighting({ colors: ["흰색 얼룩"] }));
  assert.equal(result.breakdown.color, WEIGHTS.color);
});

test("크기가 한 단계 차이면 절반만 깎음", () => {
  const same = scoreMatch(lostPet({ size: "small" }), sighting({ size: "small" }));
  const near = scoreMatch(lostPet({ size: "small" }), sighting({ size: "medium" }));
  const far = scoreMatch(lostPet({ size: "small" }), sighting({ size: "large" }));
  assert.equal(same.breakdown.size, WEIGHTS.size);
  assert.ok(near.breakdown.size > 0 && near.breakdown.size < WEIGHTS.size);
  assert.equal(far.breakdown.size, 0);
});

test("모르겠음은 감점하지 않고 절반을 줌", () => {
  const result = scoreMatch(lostPet({ size: "unknown" }), sighting({ size: "large" }));
  assert.equal(result.breakdown.size, WEIGHTS.size / 2);
});

test("좌표가 없으면 거리로 판단하지 않고 절반을 줌", () => {
  const result = scoreMatch(lostPet({ point: null }), sighting());
  // breakdown 은 정수로 반올림해 담김
  assert.equal(result.breakdown.distance, Math.round(WEIGHTS.distance / 2));
  assert.equal(result.distanceKm, null);
  assert.match(result.breakdown.reason, /위치 비교 불가/);
});

test("특징이 어긋나면 특징 점수가 깎임", () => {
  const agree = scoreMatch(lostPet({ collar: true, injury: false }), sighting({ collar: true, injury: false }));
  const disagree = scoreMatch(lostPet({ collar: true, injury: false }), sighting({ collar: false, injury: true }));
  assert.ok(agree.breakdown.features > disagree.breakdown.features);
  assert.equal(disagree.breakdown.features, 0);
});

test("배점 합이 100을 넘지 않음", () => {
  const result = scoreMatch(
    lostPet({ point: 서교동, colors: ["흰색"], size: "small", collar: true, injury: false, earTip: false }),
    sighting({ point: 서교동, colors: ["흰색"], size: "small", collar: true, injury: false, earTip: false, occurredAt: 실종시각 }),
  );
  assert.ok(result.score <= MAX_SCORE, `${result.score}`);
  const sum =
    result.breakdown.distance +
    result.breakdown.time +
    result.breakdown.color +
    result.breakdown.size +
    result.breakdown.features;
  assert.ok(sum <= MAX_SCORE);
});

test("근거 문장에 거리와 시간이 사람 말로 들어감", () => {
  const result = scoreMatch(lostPet(), sighting());
  assert.match(result.breakdown.reason, /마지막 위치에서/);
  assert.match(result.breakdown.reason, /실종 3시간 뒤/);
  assert.match(result.breakdown.reason, /흰색/);
});

test("근거 문장에 확정 표현을 쓰지 않음", () => {
  const result = scoreMatch(lostPet(), sighting());
  for (const banned of ["같은 개체", "동일", "확실", "맞습니다", "발견된 개체입니다"]) {
    assert.doesNotMatch(result.breakdown.reason, new RegExp(banned));
  }
});

test("종이 다르면 비교 대상이 아님", () => {
  assert.equal(isComparable(lostPet({ animalType: "dog" }), sighting({ animalType: "cat" })), false);
  assert.equal(isComparable(lostPet({ animalType: "dog" }), sighting({ animalType: "dog" })), true);
  // 한쪽이 모르겠음이면 후보로 남겨 사용자가 판단하게 함
  assert.equal(isComparable(lostPet({ animalType: "unknown" }), sighting({ animalType: "cat" })), true);
});

test("가까운 목격이 먼 목격보다 항상 앞섬", () => {
  const near = scoreMatch(lostPet(), sighting({ point: 연남동 }));
  const far = scoreMatch(lostPet(), sighting({ point: { lat: 37.65, lng: 127.05 } }));
  assert.ok(near.score > far.score);
});
