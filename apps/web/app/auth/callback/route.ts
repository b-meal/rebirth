import { NextResponse, type NextRequest } from "next/server";

import { NEXT_PARAM, SIGN_IN_PATH, safeNextPath } from "@rebirth/core/auth";
import { syncSignedInUser } from "@rebirth/core/auth/sync";

import { createClient } from "@/lib/supabase/server";

// OAuth 제공자가 되돌려 보내는 자리. 인가 코드를 세션으로 교환하고 프로필을 남김
// 실패는 이유를 화면에 그대로 옮기지 않고 짧은 코드로만 넘김
// 제공자 응답 본문에는 토큰이 섞일 수 있어 쿼리에 담지 않음

/** 로그인 화면으로 되돌리며 실패 이유를 남김 */
function backToSignIn(request: NextRequest, reason: string, next: string) {
  const target = request.nextUrl.clone();
  target.pathname = SIGN_IN_PATH;
  target.search = "";
  target.searchParams.set("error", reason);
  if (next) target.searchParams.set(NEXT_PARAM, next);
  return NextResponse.redirect(target);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNextPath(params.get(NEXT_PARAM));

  // 사용자가 제공자 화면에서 취소한 경우도 여기로 옴
  if (params.get("error")) return backToSignIn(request, "canceled", next);

  const code = params.get("code");
  if (!code) return backToSignIn(request, "no_code", next);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return backToSignIn(request, "exchange_failed", next);

  // 지원하지 않는 제공자로 들어온 계정은 프로필을 남기지 않고 실패로 둠
  const profile = await syncSignedInUser(data.user);
  if (!profile) {
    await supabase.auth.signOut();
    return backToSignIn(request, "unsupported_provider", next);
  }

  const target = request.nextUrl.clone();
  target.pathname = next;
  target.search = "";
  return NextResponse.redirect(target);
}
