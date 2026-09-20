import assert from "node:assert/strict";
import test from "node:test";

import { promptTime } from "./prompt-time.ts";

test("프롬프트 시각은 한국 시간으로 적고 시간대를 밝힌다", () => {
  // UTC 로는 17일 저녁 6시지만 한국은 18일 새벽 3시임
  assert.equal(promptTime(new Date("2026-09-17T18:00:00Z")), "2026-09-18 03:00 KST");
  assert.equal(promptTime(new Date("2026-09-17T06:00:00Z")), "2026-09-17 15:00 KST");
});

test("자정을 24시로 적지 않는다", () => {
  assert.equal(promptTime(new Date("2026-09-17T15:00:00Z")), "2026-09-18 00:00 KST");
});
