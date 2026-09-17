import assert from "node:assert/strict";
import { test } from "node:test";

import { bareBreed } from "../reports/breed.ts";

test("품종명만 오면 그대로 둠", () => {
  assert.equal(bareBreed("비글"), "비글");
  assert.equal(bareBreed("웰시 코기"), "웰시 코기");
});

test("모델이 붙여 보낸 꼬리말을 떼어 냄", () => {
  assert.equal(bareBreed("비글 계열 추정"), "비글");
  assert.equal(bareBreed("말티즈 계열추정"), "말티즈");
  assert.equal(bareBreed("시바, 추정"), "시바");
  assert.equal(bareBreed("푸들 추정"), "푸들");
});

test("값이 없거나 꼬리말만 남으면 null", () => {
  assert.equal(bareBreed(null), null);
  assert.equal(bareBreed(undefined), null);
  assert.equal(bareBreed(""), null);
  assert.equal(bareBreed("계열 추정"), null);
});

test("이름 안쪽의 추정은 건드리지 않음", () => {
  assert.equal(bareBreed("추정 불가 품종"), "추정 불가 품종");
});
