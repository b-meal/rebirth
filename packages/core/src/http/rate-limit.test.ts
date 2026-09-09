import assert from "node:assert/strict";
import { test } from "node:test";

import { checkRateLimit, clientKey, peekRateLimit } from "./rate-limit.ts";

const rule = { limit: 3, windowSeconds: 60 };

test("상한까지 허용하고 넘으면 거절", () => {
  const key = `t1:${Math.random()}`;
  for (let i = 0; i < 3; i += 1) {
    const r = checkRateLimit(key, rule);
    assert.equal(r.allowed, true);
  }
  const blocked = checkRateLimit(key, rule);
  assert.equal(blocked.allowed, false);
  if (!blocked.allowed) {
    assert.ok(blocked.retryAfterSeconds > 0);
    assert.ok(blocked.retryAfterSeconds <= 60);
  }
});

test("키가 다르면 창이 따로 돎", () => {
  const a = `t2:${Math.random()}`;
  const b = `t3:${Math.random()}`;
  for (let i = 0; i < 3; i += 1) checkRateLimit(a, rule);
  assert.equal(checkRateLimit(a, rule).allowed, false);
  assert.equal(checkRateLimit(b, rule).allowed, true);
});

test("창이 지나면 다시 허용", () => {
  const key = `t4:${Math.random()}`;
  const short = { limit: 1, windowSeconds: 0 };
  assert.equal(checkRateLimit(key, short).allowed, true);
  // windowSeconds 0 이면 resetAt 이 즉시 지나 다음 호출에서 창이 새로 열림
  assert.equal(checkRateLimit(key, short).allowed, true);
});

test("clientKey 는 x-forwarded-for 첫 값을 씀", () => {
  const request = new Request("https://example.com", {
    headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" },
  });
  assert.equal(clientKey(request, "scope"), "scope:203.0.113.9");
});

test("헤더가 없으면 unknown 으로 묶임", () => {
  const request = new Request("https://example.com");
  assert.equal(clientKey(request, "scope"), "scope:unknown");
});

test("peek 은 창을 소모하지 않음", () => {
  const key = `t5:${Math.random()}`;
  for (let i = 0; i < 10; i += 1) {
    assert.equal(peekRateLimit(key, rule).allowed, true);
  }
  // peek 만 했으므로 상한이 그대로 남아 있어야 함
  for (let i = 0; i < 3; i += 1) {
    assert.equal(checkRateLimit(key, rule).allowed, true);
  }
  assert.equal(checkRateLimit(key, rule).allowed, false);
});

test("소모된 뒤 peek 은 거절을 알려줌", () => {
  const key = `t6:${Math.random()}`;
  for (let i = 0; i < 3; i += 1) checkRateLimit(key, rule);
  const peeked = peekRateLimit(key, rule);
  assert.equal(peeked.allowed, false);
});
