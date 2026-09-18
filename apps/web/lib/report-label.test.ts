import assert from "node:assert/strict";
import test from "node:test";

import { densityLine, situationLine, urgencyHint, urgencyLevel } from "./report-label.ts";

const NOW = new Date("2026-09-17T12:00:00+09:00");

/** NOW 기준으로 시간 전 시각을 만듦 */
function hoursAgo(hours: number): Date {
  return new Date(NOW.getTime() - hours * 3_600_000);
}

test("6시간 경계에서 fresh 와 recent 가 갈린다", () => {
  assert.equal(urgencyLevel(hoursAgo(5 + 59 / 60), NOW), "fresh");
  assert.equal(urgencyLevel(hoursAgo(6 + 1 / 60), NOW), "recent");
});

test("24시간과 72시간 경계에서 등급이 한 칸씩 내려간다", () => {
  assert.equal(urgencyLevel(hoursAgo(23 + 59 / 60), NOW), "recent");
  assert.equal(urgencyLevel(hoursAgo(24 + 1 / 60), NOW), "stale");
  assert.equal(urgencyLevel(hoursAgo(71), NOW), "stale");
  assert.equal(urgencyLevel(hoursAgo(73), NOW), "cold");
});

test("등급 문구에 숫자가 없다", () => {
  // 며칠째라는 숫자는 다른 줄이 맡고 행동 문구는 할 일만 말함
  for (const hours of [1, 12, 48, 96]) {
    assert.doesNotMatch(urgencyHint(hoursAgo(hours), NOW), /\d/);
  }
});

test("시계 오차로 미래 시각이 들어와도 fresh 로 눌린다", () => {
  assert.equal(urgencyLevel(hoursAgo(-3), NOW), "fresh");
  assert.equal(urgencyHint(hoursAgo(-3), NOW), urgencyHint(hoursAgo(1), NOW));
});

test("제보 밀도는 0건도 문장으로 말한다", () => {
  assert.equal(densityLine({ count: 0, radiusKm: 1.24 }), "반경 1.2km 안에 새 제보가 없어요");
  assert.equal(densityLine({ count: 3, radiusKm: 2 }), "반경 2.0km 안에 제보 3건");
});

test("상황 한 줄은 밀도가 없으면 등급 문구만 남긴다", () => {
  const lastSeen = hoursAgo(80);
  const withDensity = situationLine({ lastSeen, count: 3, radiusKm: 2, now: NOW });
  const withoutDensity = situationLine({ lastSeen, count: null, radiusKm: null, now: NOW });

  assert.equal(withDensity, "3일 전, 반경 2.0km 안에 제보 3건, 이동 가능 지역을 넓혀 찾아보세요");
  assert.equal(withoutDensity, "3일 전, 이동 가능 지역을 넓혀 찾아보세요");
  // 절대 날짜는 아래 기록 줄이 맡고 이 줄은 경과와 할 일만 말함
  assert.doesNotMatch(withDensity, /년|월/);
  assert.doesNotMatch(withoutDensity, /년|월/);
});
