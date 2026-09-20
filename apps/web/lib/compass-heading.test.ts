import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeDegrees,
  readHeading,
  shortestDelta,
  toCompassHeading,
} from "./compass-heading.ts";

test("alpha 는 반시계라 뒤집어서 시계 방향 각도로 만든다", () => {
  assert.equal(toCompassHeading(0), 0);
  assert.equal(toCompassHeading(270), 90);
  assert.equal(toCompassHeading(90), 270);
  assert.equal(toCompassHeading(360), 0);
});

test("화면이 돌아가 있으면 화면 위쪽 기준으로 보정한다", () => {
  // 기기 위쪽이 동쪽, 화면은 시계로 90도 돌아 화면 위쪽이 북쪽
  assert.equal(toCompassHeading(270, 270), 0);
  assert.equal(normalizeDegrees(-30), 330);
  assert.equal(normalizeDegrees(725), 5);
});

test("Safari 필드가 있으면 그 값을 그대로 쓴다", () => {
  const sample = readHeading({ alpha: 100, webkitCompassHeading: 45, webkitCompassAccuracy: 10 });
  assert.deepEqual(sample, { heading: 45, source: "webkit" });
});

test("Safari 가 못 믿는다고 한 표본만 버리고 오차가 커도 쓴다", () => {
  assert.equal(readHeading({ alpha: 0, webkitCompassHeading: 45, webkitCompassAccuracy: -1 }), null);
  // 보정 중의 큰 오차는 버리면 화살촉이 아예 안 떠 값으로 씀
  assert.deepEqual(readHeading({ alpha: 0, webkitCompassHeading: 45, webkitCompassAccuracy: 90 }), {
    heading: 45,
    source: "webkit",
  });
});

test("북쪽을 모르는 상대 각도는 쓰지 않는다", () => {
  assert.equal(readHeading({ alpha: 120, absolute: false }), null);
  assert.equal(readHeading({ alpha: 120 }), null);
  assert.equal(readHeading({ alpha: null, absolute: true }), null);
  assert.deepEqual(readHeading({ alpha: 120, absolute: true }), { heading: 240, source: "absolute" });
});

test("359 에서 1 로 갈 때 한 바퀴 돌지 않고 2 도만 움직인다", () => {
  assert.equal(shortestDelta(359, 1), 2);
  assert.equal(shortestDelta(1, 359), -2);
  assert.equal(shortestDelta(0, 180), 180);
  assert.equal(shortestDelta(90, 90), 0);
});
