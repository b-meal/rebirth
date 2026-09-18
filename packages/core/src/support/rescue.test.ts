import assert from "node:assert/strict";
import { test } from "node:test";

import {
  RESCUE_LIMIT,
  composeRescueBody,
  fitRescueField,
  rescueRequestInput,
} from "./rescue.ts";

const valid = {
  where: "광교중앙공원 놀이터 옆",
  what: "흰색 소형견, 말티즈 계열 추정",
  condition: "다리를 절어요",
};

const REPORT_ID = "6f0a9c3e-2b1d-4c58-9f7a-1d2e3f4a5b6c";

test("세 칸만 채우면 통과한다", () => {
  const result = rescueRequestInput.safeParse(valid);
  assert.equal(result.success, true);
});

test("제보에서 온 접수는 제보 id 를 함께 받는다", () => {
  const result = rescueRequestInput.safeParse({ ...valid, reportId: REPORT_ID });
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.reportId, REPORT_ID);
});

test("형식이 어긋난 제보 id 는 오류 대신 버린다", () => {
  // 사용자가 적는 칸이 아니라 이것 때문에 급한 사람을 멈춰 세우면 안 됨
  const result = rescueRequestInput.safeParse({ ...valid, reportId: "망가진값" });
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.reportId, undefined);
});

test("본문은 위치, 동물, 상태 세 줄로만 묶인다", () => {
  const body = composeRescueBody(valid);
  assert.deepEqual(body.split("\n"), [
    `위치: ${valid.where}`,
    `동물: ${valid.what}`,
    `상태: ${valid.condition}`,
  ]);
});

test("어느 제보 건인지는 본문에 적지 않는다", () => {
  // 제보 참조는 related_report_id 열이 가짐. 본문에 또 적으면 같은 사실이 두 곳에 남음
  const body = composeRescueBody({ ...valid, reportId: REPORT_ID });
  assert.equal(body.includes(REPORT_ID), false);
  assert.equal(body.includes("제보:"), false);
});

test("상태를 비운 접수는 상태 줄을 내지 않는다", () => {
  const body = composeRescueBody({ where: valid.where, what: valid.what });
  assert.equal(body.includes("상태:"), false);
});

test("채워 넣는 값은 칸 길이에 맞춰 줄인다", () => {
  // 사용자가 적지도 않은 값으로 짧게 적어 달라는 오류를 보면 안 됨
  const long = "가".repeat(RESCUE_LIMIT.what + 40);
  const fitted = fitRescueField(long, "what");
  assert.equal(fitted?.length, RESCUE_LIMIT.what);
  assert.equal(rescueRequestInput.safeParse({ ...valid, what: fitted }).success, true);
});

test("채울 값이 없으면 자리표시 문구가 보이게 비워 둔다", () => {
  assert.equal(fitRescueField("   ", "where"), undefined);
});
