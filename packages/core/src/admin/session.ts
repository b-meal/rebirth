import { hashToken, tokensMatch } from "../http/tokens";

// 운영 대시보드 출입. 계정 체계 없이 공유 비밀번호 한 겹이고 값은 ADMIN_API_TOKEN 을 씀
// 토큰을 따로 두지 않는 이유는 운영 API 와 같은 비밀을 공유해 회전 지점을 하나로 두기 위함

export const ADMIN_COOKIE = "rebirth_admin";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 12;
export const ADMIN_LOGIN_PATH = "/login";
export const ADMIN_NEXT_PARAM = "next";

/** 로그인 없이 열리는 경로. 로그인 화면 자신과 인증 라우트만 해당 */
export function isPublicAdminPath(pathname: string): boolean {
  return pathname === ADMIN_LOGIN_PATH || pathname.startsWith("/api/auth/");
}

/** 비밀이 없으면 아무도 들이지 않음. 설정을 빠뜨린 배포가 열려 있는 상태를 만들지 않기 위함 */
export function adminSecret(): string | null {
  return process.env.ADMIN_API_TOKEN || null;
}

/** 쿠키에 담을 값. 원문을 그대로 두면 쿠키를 읽는 것만으로 운영 API 를 부를 수 있음 */
export function adminCookieValue(secret: string): string {
  return hashToken(secret);
}

export function isAdminCookieValid(value: string | undefined): boolean {
  const secret = adminSecret();
  if (!secret || !value) return false;
  return tokensMatch(value, adminCookieValue(secret));
}

export function isAdminPasswordValid(password: string): boolean {
  const secret = adminSecret();
  if (!secret || !password) return false;
  return tokensMatch(password, secret);
}
