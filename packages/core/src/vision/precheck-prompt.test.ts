import assert from "node:assert/strict";
import { test } from "node:test";

import { readVerdict } from "./precheck-prompt.ts";

// 판정을 못 읽으면 통과. 선검사가 애매해서 제보를 막는 일이 없어야 함

test("no 만 걸러냄", () => {
  assert.equal(readVerdict("no"), false);
  assert.equal(readVerdict("No"), false);
  assert.equal(readVerdict("No."), false);
  assert.equal(readVerdict(" NO \n"), false);
  assert.equal(readVerdict('"no"'), false);
});

test("yes 는 통과", () => {
  assert.equal(readVerdict("yes"), true);
  assert.equal(readVerdict("Yes."), true);
});

test("읽을 수 없는 응답은 통과", () => {
  assert.equal(readVerdict(""), true);
  assert.equal(readVerdict("nope"), true);
  assert.equal(readVerdict("not sure"), true);
  assert.equal(readVerdict("동물이 보입니다"), true);
});
