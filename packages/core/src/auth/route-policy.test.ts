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
  // 홈은 둘러보는 자리라 로그인을 요구하지 않음
  for (const path of [
    "/",
    "/sign-in",
    "/auth/callback",
    "/home",
    "/r/abc",
    "/report",
    "/lost/new",
    "/guide/injured",
    "/privacy",
  ]) {
    assert.equal(isPublicPath(path), true, path);
  }
});

test("계정이 있어야 뜻이 통하는 화면은 보호한다", () => {
  for (const path of ["/mine", "/settings"]) {
    assert.equal(isPublicPath(path), false, path);
  }
});

test("접두사만 같은 경로를 공개로 오인하지 않는다", () => {
  // "/reports" 는 "/report" 로 시작하지만 다른 경로임
  assert.equal(isPublicPath("/reports"), false);
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
  assert.equal(safeNextPath("/"), HOME_PATH);
});

test("같은 출처 경로는 그대로 돌려준다", () => {
  assert.equal(safeNextPath("/home"), "/home");
  assert.equal(safeNextPath("/r/abc?from=share"), "/r/abc?from=share");
});
