// 진입과 동시에 익명 계정으로 로그인시키는 판정
// 심사와 시연에서 SNS 로그인 없이 마이페이지·후보·커뮤니티를 그대로 보게 함
// server-only 를 import 하지 않음. 순수 판정이라 proxy 와 테스트에서 그대로 씀
// 로그인 흐름 경로를 빼는 판정은 route-policy 의 isAuthFlowPath 가 맡음
// 화면 안 링크 이동(RSC)은 Next 가 proxy 앞에서 RSC 헤더를 지워 여기서 못 가림
// 그 경우는 로그인 화면이 /auth/guest 로 보내 계정을 만들어 줌

/** 켜는 환경 변수. 1 이나 true 일 때만 켬. 심사가 끝나면 값을 지워 끔 */
export const AUTO_SIGN_IN_ENV = "AUTH_AUTO_ANONYMOUS";

export function isAutoSignInEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const value = env[AUTO_SIGN_IN_ENV]?.trim().toLowerCase();
  return value === "1" || value === "true";
}

export type AutoSignInRequest = {
  method: string;
  /** Sec-Fetch-Mode 헤더. 문서 이동은 navigate, RSC 프리페치와 fetch 는 cors */
  secFetchMode?: string | null;
  accept?: string | null;
  userAgent?: string | null;
};

// 링크 미리보기 봇과 크롤러. 계정을 만들어 줘도 쓸 사람이 없음
const BOT_USER_AGENT =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|kakaotalk-scrap|vercel-screenshot|lighthouse|headless/i;

/** 사람이 화면을 여는 요청일 때만 참 */
export function shouldAutoSignIn(request: AutoSignInRequest): boolean {
  if (request.method.toUpperCase() !== "GET") return false;
  if (request.userAgent && BOT_USER_AGENT.test(request.userAgent)) return false;

  const mode = request.secFetchMode?.trim().toLowerCase();
  if (mode) return mode === "navigate";
  // Sec-Fetch-Mode 가 없는 오래된 브라우저는 Accept 로 문서 요청을 가림
  return Boolean(request.accept?.includes("text/html"));
}
