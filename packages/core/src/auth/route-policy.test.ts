import assert from "node:assert/strict";
import { test } from "node:test";

import {
  HOME_PATH,
  SIGN_IN_PATH,
  isProtectedPath,
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

test("계정에 묶인 기록만 보호한다", () => {
  for (const path of [
    "/mine/profile",
    "/mine/pets",
    "/mine/pets/new",
    "/mine/reports",
    "/mine/notifications",
    "/mine/lost/abc",
  ]) {
    assert.equal(isProtectedPath(path), true, path);
  }
});

test("없는 주소는 로그인으로 보내지 않는다", () => {
  // 로그인 벽이 404 를 가리면 오타를 친 사람이 로그인 화면을 봄
  for (const path of ["/not-a-real-page", "/settings", "/notifications", "/mine-x"]) {
    assert.equal(isProtectedPath(path), false, path);
  }
});

test("커뮤니티는 읽기가 열려 있다", () => {
  // 목록과 상세는 받은 링크로 열려야 함
  // 글쓰기는 시트라 주소가 없고 저장할 때 서버 액션이 계정을 확인함
  assert.equal(isPublicPath("/community"), true);
  assert.equal(isPublicPath("/community/abc"), true);
});

test("보호 접두사가 이름만 겹치는 경로를 삼키지 않는다", () => {
  // "/mine/pets" 가 "/mine/petsitter" 까지 걸면 엉뚱한 화면에 로그인 벽이 섬
  assert.equal(isProtectedPath("/mine/petsitter"), false);
  assert.equal(isProtectedPath("/mine"), false);
  assert.equal(isPublicPath("/mine"), true);
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
