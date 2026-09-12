// 로그인이 필요한 경로 판정. proxy 와 화면이 같은 규칙을 씀
// 목록이 두 곳에 있으면 한쪽만 고쳐 로그인 벽이 생기거나 새는 일이 생김
// server-only 를 import 하지 않음. 순수 판정이라 어디서나 씀

export const SPLASH_PATH = "/";
export const SIGN_IN_PATH = "/sign-in";
export const HOME_PATH = "/home";
export const AUTH_CALLBACK_PATH = "/auth/callback";

/** 로그인한 사람을 되돌려 보낼 곳을 담는 쿼리 이름 */
export const NEXT_PARAM = "next";

/**
 * 로그인 없이 열리는 경로
 * 길에서 동물을 발견한 사람이 제보를 마칠 때까지 로그인을 요구하지 않는 것이 기준
 * 계정이 있어야 뜻이 통하는 화면만 보호 대상으로 남김
 */
const PUBLIC_PREFIXES = [
  SPLASH_PATH,
  SIGN_IN_PATH,
  "/auth",
  // 홈은 둘러보는 자리. 로그인은 계정 기능을 누를 때 요구함
  HOME_PATH,
  // 공개 상세와 공유 카드. 받은 사람이 계정 없이 열어야 함
  "/r",
  // 익명 제보와 실종 신고. 기존 익명 세션 경로를 그대로 둠
  "/report",
  "/lost",
  // 안내와 법적 고지
  "/guide",
  "/privacy",
  "/terms",
  "/support",
  // 디자인 카탈로그는 개발 참고 화면
  "/design",
] as const;

function matches(pathname: string, prefix: string): boolean {
  if (prefix === SPLASH_PATH) return pathname === SPLASH_PATH;
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** 로그인 없이 열리는 경로인지. 목록에 없으면 보호 대상 */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => matches(pathname, prefix));
}

/**
 * 돌아갈 경로로 허용하는 모양
 * 한 글자 이상의 경로 세그먼트로 시작해야 하므로 "//evil.com" 과 "/\evil.com" 이 함께 걸림
 * 막을 것을 나열하는 대신 허용할 모양만 통과시킴. 우회 표기를 하나씩 쫓지 않기 위함
 */
const SAFE_PATH = /^\/[A-Za-z0-9\-._~%/]*(?:\?[^#]*)?$/;

/**
 * 로그인 후 돌아갈 경로를 정함
 * 프록시와 콜백이 같은 판정을 써야 한쪽만 느슨해지는 일이 없음
 * Next 가 "//host" 를 "/host" 로 정규화한 뒤에 넘겨주는 경우까지 감안해
 * 슬래시로 시작하는 두 번째 문자를 직접 확인함
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value) return HOME_PATH;
  // 스킴 상대 URL 과 백슬래시 표기를 먼저 걸러냄
  if (value.startsWith("//") || value.startsWith("/\\")) return HOME_PATH;
  if (!SAFE_PATH.test(value)) return HOME_PATH;
  // 로그인 화면과 스플래시로 되돌아가는 고리를 막음
  if (matches(value, SIGN_IN_PATH) || value === SPLASH_PATH) return HOME_PATH;
  return value;
}
