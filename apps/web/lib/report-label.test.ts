import assert from "node:assert/strict";
import test from "node:test";

import {
  densityLine,
  formatMonthDay,
  searchingDays,
  sinceLabel,
  urgencyHint,
  urgencyLevel,
} from "./report-label.ts";

const NOW = new Date("2026-09-17T12:00:00+09:00");

/** NOW 기준으로 시간 전 시각을 만듦 */
function hoursAgo(hours: number): Date {
  return new Date(NOW.getTime() - hours * 3_600_000);
}

/** 한국 시간으로 읽은 시각. 달력 경계를 보는 검사에 씀 */
function kst(iso: string): Date {
  return new Date(`${iso}+09:00`);
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

test("하루가 지나지 않으면 자정을 넘어도 경과 시간으로 말한다", () => {
  // 새벽 2시에 보는 어제 저녁 8시 목격은 어제보다 6시간 전이 정확함
  assert.equal(sinceLabel(kst("2026-09-17T20:00:00"), kst("2026-09-18T02:00:00")), "6시간 전");
  assert.equal(sinceLabel(kst("2026-09-17T15:00:00"), kst("2026-09-18T08:00:00")), "17시간 전");
});

test("어제와 그저께를 경과 시간이 아니라 달력으로 가른다", () => {
  const 아침 = kst("2026-09-18T10:00:00");
  // 35시간 전이지만 그저께 밤이라 어제가 아님
  assert.match(sinceLabel(kst("2026-09-16T23:00:00"), 아침), /^그저께/);
  assert.match(sinceLabel(kst("2026-09-17T09:00:00"), 아침), /^어제/);

  const 밤 = kst("2026-09-18T23:00:00");
  // 38시간 전이지만 어제 아침이라 그저께가 아님
  assert.match(sinceLabel(kst("2026-09-17T09:00:00"), 밤), /^어제/);
  assert.match(sinceLabel(kst("2026-09-16T09:00:00"), 밤), /^그저께/);
});

test("하루가 넘은 목격은 낮과 새벽을 가려 적는다", () => {
  const 아침 = kst("2026-09-18T10:00:00");
  assert.equal(sinceLabel(kst("2026-09-17T09:00:00"), 아침), "어제 아침");
  assert.equal(sinceLabel(kst("2026-09-16T23:00:00"), 아침), "그저께 밤");
  assert.equal(sinceLabel(kst("2026-09-16T00:30:00"), 아침), "그저께 새벽");
  assert.equal(sinceLabel(kst("2026-09-13T21:00:00"), 아침), "5일 전 밤");

  // 19시간 전은 자정을 넘었어도 하루 안이라 경과 시간이 남음
  assert.equal(sinceLabel(kst("2026-09-17T15:00:00"), 아침), "19시간 전");
  // 32시간 전이 되면 달력 낱말과 시각대로 바뀜
  assert.equal(sinceLabel(kst("2026-09-17T15:00:00"), kst("2026-09-18T23:00:00")), "어제 오후");
});

test("자정 목격을 24시로 읽어 시각대를 놓치지 않는다", () => {
  // 판에 따라 자정 시각을 24 로 내주면 새벽이 아니라 밤으로 떨어짐
  assert.equal(sinceLabel(kst("2026-09-16T00:00:00"), kst("2026-09-18T10:00:00")), "그저께 새벽");
});

test("반올림으로 24시간이 돼도 달력으로 같은 날이면 어제라고 하지 않는다", () => {
  // 23시간 45분 전, 자정을 넘지 않아 같은 날임
  assert.doesNotMatch(sinceLabel(kst("2026-09-18T00:05:00"), kst("2026-09-18T23:50:00")), /어제/);
});

test("며칠째는 잃어버린 날을 1일째로 세고 자정마다 하루 올린다", () => {
  const 아침 = kst("2026-09-18T10:00:00");
  assert.equal(searchingDays(kst("2026-09-18T09:00:00"), 아침), 1);
  // 어제 저녁 신고는 20시간 전이어도 오늘 잃어버린 게 아님
  assert.equal(searchingDays(kst("2026-09-17T14:00:00"), 아침), 2);
  assert.equal(searchingDays(kst("2026-09-16T23:00:00"), 아침), 3);
});

test("며칠째는 시계 오차로 미래 시각이 들어와도 1일째로 눌린다", () => {
  assert.equal(searchingDays(hoursAgo(-3), NOW), 1);
});

test("공유 카드 날짜는 한국 시간으로 적는다", () => {
  // UTC 로는 17일 저녁이지만 한국은 이미 18일임. 서버 시간대가 UTC 라도 흔들리지 않아야 함
  assert.equal(formatMonthDay(new Date("2026-09-17T16:00:00Z")), "9월 18일");
  assert.equal(formatMonthDay("2026-09-17T14:59:00Z"), "9월 17일");
});

test("제보 밀도는 0건도 문장으로 말한다", () => {
  assert.equal(densityLine({ count: 0, radiusKm: 1.24 }), "반경 1.2km 안에 새 제보가 없어요");
  assert.equal(densityLine({ count: 3, radiusKm: 2 }), "반경 2.0km 안에 제보 3건");
});
