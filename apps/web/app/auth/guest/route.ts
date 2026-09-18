import { NextResponse, type NextRequest } from "next/server";

import {
  NEXT_PARAM,
  SIGN_IN_PATH,
  isAutoSignInEnabled,
  safeNextPath,
} from "@rebirth/core/auth";

import { isAuthConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

// 시연 모드에서 로그인 화면 대신 들르는 자리. 익명 계정을 만들어 세션을 심고 가려던 곳으로 보냄
// proxy 는 문서 요청만 보는데 화면 안 링크 이동은 RSC 요청이라 거기서 놓친 사람이 여기로 옴
// 라우트 핸들러라 쿠키를 쓸 수 있음. 서버 컴포넌트인 로그인 화면은 쿠키를 심지 못함

/** 실패 이유를 짧은 코드로만 남김. 제공자 응답 본문은 쿼리에 담지 않음 */
function backToSignIn(request: NextRequest, next: string) {
  const target = request.nextUrl.clone();
  target.pathname = SIGN_IN_PATH;
  target.search = "";
  target.searchParams.set("error", "guest_failed");
  target.searchParams.set(NEXT_PARAM, next);
  return NextResponse.redirect(target);
}

export async function GET(request: NextRequest) {
  const next = safeNextPath(request.nextUrl.searchParams.get(NEXT_PARAM));
  const target = request.nextUrl.clone();
  target.search = "";

  // 시연 모드가 아니면 이 자리는 없는 것과 같음. 로그인 화면으로 되돌림
  if (!isAutoSignInEnabled() || !isAuthConfigured()) {
    target.pathname = SIGN_IN_PATH;
    target.searchParams.set(NEXT_PARAM, next);
    return NextResponse.redirect(target);
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    const { error } = await supabase.auth.signInAnonymously();
    // 접속이 몰려 발급이 거절된 경우. 되돌아가면 고리가 되므로 로그인 화면이 이유를 말함
    if (error) return backToSignIn(request, next);
  }

  const [pathname, search = ""] = next.split("?");
  target.pathname = pathname ?? "/";
  target.search = search;
  return NextResponse.redirect(target);
}
