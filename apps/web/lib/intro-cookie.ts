// 첫 행동을 마쳤는지 적어 두는 쿠키
// localStorage 에 두면 서버가 모르고 그려 하이드레이션 뒤에 안내 줄과 타일이 끼어들며 화면이 밀림
// 쿠키는 서버가 첫 HTML 부터 맞는 모양으로 그려 레이아웃 이동이 없음

export const SEEN_INTRO_COOKIE = "rebirth_seen_intro";

// 한 해. 그 뒤에 안내가 한 번 더 보여도 해롭지 않음
const MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

/** 브라우저에서 호출. 저장이 막힌 환경이면 이 세션 동안만 접힘 */
export function rememberIntroSeen(): void {
  try {
    document.cookie = `${SEEN_INTRO_COOKIE}=1; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
  } catch {
    // 쿠키를 막은 브라우저. 다음 방문에 안내가 한 번 더 뜸
  }
}
