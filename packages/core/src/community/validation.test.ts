import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BODY_MAX,
  TITLE_MAX,
  communityCommentInput,
  communityPostInput,
  fieldErrors,
} from "./validation.ts";

const valid = {
  category: "sighting_talk",
  title: "흰색 소형견을 봤습니다",
  body: "어젯밤 공원 근처에서 흰 강아지를 봤는데 목줄이 없었습니다",
};

test("제대로 채운 글은 통과한다", () => {
  const result = communityPostInput.safeParse(valid);
  assert.equal(result.success, true);
});

test("공백만 넣은 제목은 빈 값으로 본다", () => {
  // 공백을 지우지 않으면 제목이 비어 보이는 글이 목록에 남음
  const result = communityPostInput.safeParse({ ...valid, title: "    " });
  assert.equal(result.success, false);
});

test("앞뒤 공백은 저장 전에 지운다", () => {
  const result = communityPostInput.safeParse({
    ...valid,
    title: "  제목입니다  ",
  });
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.title, "제목입니다");
});

test("길이 상한을 넘기면 막는다", () => {
  // 상한이 없으면 목록 카드가 한 글에 밀려 무너짐
  assert.equal(
    communityPostInput.safeParse({ ...valid, title: "가".repeat(TITLE_MAX + 1) })
      .success,
    false,
  );
  assert.equal(
    communityPostInput.safeParse({ ...valid, body: "가".repeat(BODY_MAX + 1) })
      .success,
    false,
  );
});

test("상한과 같은 길이는 받는다", () => {
  // 경계에서 한 글자 차이로 막히면 글자 수 안내가 거짓말이 됨
  assert.equal(
    communityPostInput.safeParse({ ...valid, title: "가".repeat(TITLE_MAX) })
      .success,
    true,
  );
});

test("모르는 주제는 막는다", () => {
  const result = communityPostInput.safeParse({ ...valid, category: "gossip" });
  assert.equal(result.success, false);
});

test("동네 이름을 비우면 null 이 된다", () => {
  // 빈 문자열을 그대로 넣으면 목록에서 빈 배지가 생김
  const result = communityPostInput.safeParse({ ...valid, areaName: "   " });
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.areaName, null);
});

test("빈 댓글은 막는다", () => {
  assert.equal(communityCommentInput.safeParse({ body: " " }).success, false);
  assert.equal(communityCommentInput.safeParse({ body: "좋네요" }).success, true);
});

test("오류는 필드마다 한 개만 남긴다", () => {
  const result = communityPostInput.safeParse({
    category: "gossip",
    title: "",
    body: "",
  });
  assert.equal(result.success, false);
  if (result.success) return;

  const errors = fieldErrors(result.error);
  assert.ok(errors.title);
  assert.ok(errors.body);
  assert.ok(errors.category);
  // 값이 메시지 하나짜리 문자열이어야 화면이 그대로 그릴 수 있음
  for (const message of Object.values(errors)) {
    assert.equal(typeof message, "string");
  }
});
