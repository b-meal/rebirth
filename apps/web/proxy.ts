import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  NEXT_PARAM,
  SIGN_IN_PATH,
  isPublicPath,
} from "@rebirth/core/auth";

import { isAuthConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";

// Next.js 16 에서 middleware 는 proxy 로 이름이 바뀜
// 하는 일은 두 가지. 만료된 토큰 갱신과 보호 경로의 낙관적 차단
// 여기서는 쿠키만 읽음. 모든 경로에서 돌기 때문에 DB 를 건드리면 프리페치마다 질의가 생김
// 실제 권한 확인은 화면과 라우트가 데이터에 가까운 곳에서 다시 함

export async function proxy(request: NextRequest) {
  // 설정이 없으면 로그인 벽을 세우지 않음. 기존 익명 경로가 그대로 돌아야 함
  if (!isAuthConfigured()) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl()!, supabaseAnonKey()!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // 요청과 응답 양쪽에 심어야 이 요청의 렌더와 브라우저가 같은 세션을 봄
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // 응답을 만들기 전에 불러야 갱신된 쿠키가 Set-Cookie 로 나감
  const { data } = await supabase.auth.getClaims();

  const { pathname } = request.nextUrl;
  if (!data?.claims && !isPublicPath(pathname)) {
    const target = request.nextUrl.clone();
    target.pathname = SIGN_IN_PATH;
    target.search = "";
    // 로그인 후 원래 가려던 곳으로 되돌려 보냄
    target.searchParams.set(NEXT_PARAM, `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(target);
  }

  return response;
}

export const config = {
  // 정적 자산과 이미지 최적화 경로에서는 돌지 않음
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo/|.*\\.png$).*)"],
};
