import assert from "node:assert/strict";
import { test } from "node:test";

import { STALE_RUNNING_MS, isRetryableAnalysisJob } from "./job-retry.ts";

const now = new Date("2026-09-18T12:00:00Z");
const at = (msAgo: number) => new Date(now.getTime() - msAgo);

test("실패한 행은 시각과 무관하게 되살림", () => {
  assert.equal(isRetryableAnalysisJob({ status: "failed", createdAt: at(0) }, now), true);
  assert.equal(isRetryableAnalysisJob({ status: "failed", createdAt: at(STALE_RUNNING_MS * 10) }, now), true);
});

test("성공한 행은 되살리지 않음", () => {
  assert.equal(isRetryableAnalysisJob({ status: "succeeded", createdAt: at(STALE_RUNNING_MS * 10) }, now), false);
});

test("진행 중인 행은 정체 기준을 넘긴 뒤에만 되살림", () => {
  assert.equal(isRetryableAnalysisJob({ status: "running", createdAt: at(STALE_RUNNING_MS) }, now), false);
  assert.equal(isRetryableAnalysisJob({ status: "running", createdAt: at(STALE_RUNNING_MS + 1) }, now), true);
});
