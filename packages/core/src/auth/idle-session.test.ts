import assert from "node:assert/strict";
import { test } from "node:test";

import {
  IDLE_LIMIT_DAYS,
  isIdleExpired,
  shouldRefreshSeenAt,
} from "./idle-session.ts";

const NOW = Date.UTC(2026, 8, 12, 0, 0, 0);
const DAY = 24 * 3_600_000;

function daysAgo(days: number): string {
  return String(NOW - days * DAY);
}

test("한도 안이면 만료가 아니다", () => {
  for (const days of [0, 1, 15, IDLE_LIMIT_DAYS - 1]) {
    assert.equal(isIdleExpired(daysAgo(days), NOW), false, `${days}일`);
  }
});

test("한도를 넘기면 만료다", () => {
  assert.equal(isIdleExpired(daysAgo(IDLE_LIMIT_DAYS + 1), NOW), true);
  assert.equal(isIdleExpired(daysAgo(90), NOW), true);
});

test("한도 경계에서는 아직 만료가 아니다", () => {
  // 정확히 30일은 초과가 아니므로 통과해야 함
  assert.equal(isIdleExpired(String(NOW - IDLE_LIMIT_DAYS * DAY), NOW), false);
  assert.equal(isIdleExpired(String(NOW - IDLE_LIMIT_DAYS * DAY - 1), NOW), true);
});

test("쿠키가 없거나 깨졌으면 만료로 보지 않는다", () => {
  // 판정 근거가 없을 때 로그아웃시키면 정상 사용자를 끊게 됨
  for (const raw of [undefined, "", "abc", "-1", "0", "1e999", "12.5"]) {
    assert.equal(isIdleExpired(raw, NOW), false, JSON.stringify(raw));
  }
});

test("미래 시각은 지금 본 것으로 취급한다", () => {
  // 기기 시계가 앞서 있어도 로그아웃시키지 않음
  assert.equal(isIdleExpired(String(NOW + 10 * DAY), NOW), false);
});

test("하루가 지나야 쿠키를 다시 쓴다", () => {
  assert.equal(shouldRefreshSeenAt(daysAgo(0), NOW), false);
  assert.equal(shouldRefreshSeenAt(String(NOW - 3_600_000), NOW), false);
  assert.equal(shouldRefreshSeenAt(daysAgo(2), NOW), true);
});

test("쿠키가 없으면 새로 쓴다", () => {
  assert.equal(shouldRefreshSeenAt(undefined, NOW), true);
  assert.equal(shouldRefreshSeenAt("깨진값", NOW), true);
});
