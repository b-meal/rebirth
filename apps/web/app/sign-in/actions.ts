"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";

import {
  AUTH_CALLBACK_PATH,
  NEXT_PARAM,
  SIGN_IN_PATH,
  findProvider,
  safeNextPath,
} from "@rebirth/core/auth";

import { createClient } from "@/lib/supabase/server";

// OAuth 시작을 서버에서 함. 브라우저에서 시작하면 제공자 화면으로 가기까지
// 클라이언트 번들에 SDK 가 실려야 하고, 코드 검증자 쿠키도 서버가 심는 편이 단순함

/**
 * 콜백 절대 URL. 제공자에 등록한 값과 정확히 같아야 함
 * 요청이 들어온 주소를 먼저 씀. 로그인은 사용자가 지금 있는 주소로 돌아와야 하고
 * 로컬과 미리보기 배포가 각자 자기 주소로 세션을 받게 됨
 * 헤더를 못 읽는 경우에만 배포 도메인 설정으로 물러남
 */
async function callbackUrl(next: string): Promise<string> {
  const origin = (await originFromHeaders()) ?? process.env.NEXT_PUBLIC_SITE_URL;
  const url = new URL(AUTH_CALLBACK_PATH, origin ?? "http://localhost:3000");
  if (next) url.searchParams.set(NEXT_PARAM, next);
  return url.toString();
}

async function originFromHeaders(): Promise<string | undefined> {
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host");
  if (!host) return undefined;
  // 로컬 개발은 http, 배포는 프록시가 https 를 알려 줌
  const protocol =
    list.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

/**
 * 제공자 동의 화면으로 보냄
 * 로그인 화면의 form action 으로 붙어 자바스크립트가 없어도 동작함
 */
export async function signInWithProvider(formData: FormData) {
  const provider = findProvider(formData.get("provider")?.toString());
  const next = safeNextPath(formData.get(NEXT_PARAM)?.toString());

  if (!provider) redirect(`${SIGN_IN_PATH}?error=unsupported_provider`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider.supabaseProvider,
    options: {
      redirectTo: await callbackUrl(next),
      scopes: provider.scopes,
      // 서버에서 리다이렉트하므로 SDK 가 직접 이동하지 않게 함
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    redirect(`${SIGN_IN_PATH}?error=start_failed&${NEXT_PARAM}=${encodeURIComponent(next)}`);
  }

  redirect(data.url);
}
