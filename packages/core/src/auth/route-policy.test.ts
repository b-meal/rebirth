import assert from "node:assert/strict";
import { test } from "node:test";

import {
  HOME_PATH,
  SIGN_IN_PATH,
  isPublicPath,
  safeNextPath,
} from "./route-policy.ts";

test("로그인 없이 열리는 경로는 막지 않는다", () => {
  // 공유 링크와 익명 제보는 계정 없이 열려야 함
  // 홈은 지도를 둘러보는 자리라 로그인을 요구하지 않음
  for (const path of [
    "/",
    "/sign-in",
    "/auth/callback",
    "/r/abc",
    "/report",
    "/lost/new",
    "/search",
    "/reports",
    "/guide/injured",
    "/privacy",
    // 계정 화면은 로그인 권유를 겸해 비로그인도 열림
    "/mine",
  ]) {
    assert.equal(isPublicPath(path), true, path);
  }
});

test("계정이 있어야 뜻이 통하는 화면은 보호한다", () => {
  for (const path of ["/settings", "/notifications"]) {
    assert.equal(isPublicPath(path), false, path);
  }
});

test("루트를 접두사로 다뤄 모든 경로가 열리지 않는다", () => {
  // "/" 가 접두사로 쓰이면 보호 경로까지 통과해 로그인 벽이 통째로 사라짐
  assert.equal(isPublicPath("/settings"), false);
});

test("다른 출처로 되돌려 보내지 않는다", () => {
  for (const value of [
    "//evil.com",
    "/\\evil.com",
    "https://evil.com",
    "http://evil.com",
    "javascript:alert(1)",
    "",
    undefined,
  ]) {
    assert.equal(safeNextPath(value), HOME_PATH, String(value));
  }
});

test("로그인 화면으로 되돌아가는 고리를 막는다", () => {
  assert.equal(safeNextPath(SIGN_IN_PATH), HOME_PATH);
  assert.equal(safeNextPath(`${SIGN_IN_PATH}?next=%2Fmine`), HOME_PATH);
});

test("같은 출처 경로는 그대로 돌려준다", () => {
  assert.equal(safeNextPath("/mine"), "/mine");
  assert.equal(safeNextPath("/r/abc?from=share"), "/r/abc?from=share");
});
