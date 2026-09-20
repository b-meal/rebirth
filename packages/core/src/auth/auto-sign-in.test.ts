import assert from "node:assert/strict";
import { test } from "node:test";

import {
  AUTO_SIGN_IN_ENV,
  isAutoSignInEnabled,
  shouldAutoSignIn,
} from "./auto-sign-in.ts";
import { isAuthFlowPath } from "./route-policy.ts";

test("환경 변수가 1 이나 true 일 때만 켜진다", () => {
  assert.equal(isAutoSignInEnabled({}), false);
  assert.equal(isAutoSignInEnabled({ [AUTO_SIGN_IN_ENV]: "" }), false);
  assert.equal(isAutoSignInEnabled({ [AUTO_SIGN_IN_ENV]: "0" }), false);
  assert.equal(isAutoSignInEnabled({ [AUTO_SIGN_IN_ENV]: "1" }), true);
  assert.equal(isAutoSignInEnabled({ [AUTO_SIGN_IN_ENV]: " TRUE " }), true);
});

const browser = {
  method: "GET",
  secFetchMode: "navigate",
  accept: "text/html,application/xhtml+xml",
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1",
};

test("사람이 화면을 여는 GET 요청에만 로그인시킨다", () => {
  assert.equal(shouldAutoSignIn(browser), true);
  // Sec-Fetch-Mode 가 없으면 Accept 로 가림
  assert.equal(shouldAutoSignIn({ ...browser, secFetchMode: null }), true);
  assert.equal(
    shouldAutoSignIn({ ...browser, secFetchMode: null, accept: "text/x-component" }),
    false,
  );
});

test("로그인 흐름 경로는 자동 로그인에서 뺀다", () => {
  // 익명 세션을 먼저 만들면 제공자 로그인이 그 세션에 가로막힘
  assert.equal(isAuthFlowPath("/sign-in"), true);
  assert.equal(isAuthFlowPath("/auth/callback"), true);
  assert.equal(isAuthFlowPath("/auth/guest"), true);
  assert.equal(isAuthFlowPath("/"), false);
  assert.equal(isAuthFlowPath("/mine/reports"), false);
});

test("프리페치, 서버 액션, 봇은 건드리지 않는다", () => {
  // RSC 프리페치와 fetch 는 cors 로 옴. 여기서 계정을 만들면 한 사람이 여러 계정을 받음
  assert.equal(shouldAutoSignIn({ ...browser, secFetchMode: "cors" }), false);
  assert.equal(shouldAutoSignIn({ ...browser, method: "POST" }), false);
  assert.equal(
    shouldAutoSignIn({ ...browser, userAgent: "facebookexternalhit/1.1" }),
    false,
  );
  assert.equal(
    shouldAutoSignIn({ ...browser, userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1)" }),
    false,
  );
});
