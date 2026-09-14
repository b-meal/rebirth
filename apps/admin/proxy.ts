import { NextResponse, type NextRequest } from "next/server";

import {
  ADMIN_COOKIE,
  ADMIN_LOGIN_PATH,
  ADMIN_NEXT_PARAM,
  adminSecret,
  isAdminCookieValid,
  isPublicAdminPath,
} from "@rebirth/core/admin";

// Next.js 16 에서 middleware 는 proxy 로 이름이 바뀜
// 운영 화면 전체가 제보 원본을 보여 주므로 낙관적 차단이 아니라 여기서 실제로 막음
// 라우트는 x-admin-token 을 따로 보므로 api 는 이 검사에서 뺌

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicAdminPath(pathname)) return NextResponse.next();

  // 비밀이 설정되지 않은 배포는 아무도 들이지 않음
  if (!adminSecret() || !isAdminCookieValid(request.cookies.get(ADMIN_COOKIE)?.value)) {
    const target = request.nextUrl.clone();
    target.pathname = ADMIN_LOGIN_PATH;
    target.search = "";
    target.searchParams.set(ADMIN_NEXT_PARAM, `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(target);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
};
