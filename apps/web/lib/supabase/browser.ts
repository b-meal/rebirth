"use client";

import { createBrowserClient } from "@supabase/ssr";

import { requireAuthConfig } from "./config";

// 브라우저 클라이언트. OAuth 시작에만 씀
// PKCE 코드 검증자를 쿠키에 남겨야 콜백에서 세션으로 교환할 수 있음

type Client = ReturnType<typeof create>;

function create() {
  const { url, anonKey } = requireAuthConfig();
  return createBrowserClient(url, anonKey);
}

let cached: Client | undefined;

/** 탭 하나에서 하나만 씀. 매번 만들면 인증 상태 구독이 늘어남 */
export function getBrowserClient(): Client {
  cached ??= create();
  return cached;
}
