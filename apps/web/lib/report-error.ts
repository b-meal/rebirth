"use client";

// 화면에서 난 오류를 서버에 남김
//
// 브라우저 콘솔은 그 사람 기기에만 남아, 저장이 안 된다는 제보를 받아도 개발자가 볼 것이 없음
// 보내는 것은 무엇이 어디서 났는지뿐이고 입력값, 사진, 좌표, 로그인 정보는 담지 않음
//
// 보내기에 실패해도 화면에서 할 일은 없음. 결과를 보지 않고 흐름도 막지 않음

const URL_PATH = "/api/draft/client-error";

/** 한 번 연 화면에서 이만큼만 보냄. 되돌이에 빠진 화면이 표를 채우지 않게 함 */
const MAX_PER_PAGE = 10;

const MAX_MESSAGE = 1000;
const MAX_STACK = 4000;

let sent = 0;

// 같은 오류가 한 화면에서 여러 번 나도 한 번만 보냄
const seen = new Set<string>();

/** 스택에 주소가 섞여 오면 질의 문자열에 토큰이 들어 있을 수 있어 잘라냄 */
function stripQuery(value: string): string {
  return value.replace(/(https?:\/\/[^\s)]+?)\?[^\s)]*/g, "$1");
}

function describe(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: `${error.name}: ${error.message}`.slice(0, MAX_MESSAGE),
      stack: error.stack ? stripQuery(error.stack).slice(0, MAX_STACK) : undefined,
    };
  }
  return { message: String(error).slice(0, MAX_MESSAGE) };
}

/**
 * @param tag 어디서 났는지. 소문자와 점으로 적음. 예: `lost.submit`
 */
export function reportClientError(tag: string, error: unknown): void {
  if (typeof window === "undefined" || sent >= MAX_PER_PAGE) return;

  try {
    const described = describe(error);
    const key = `${tag}|${described.message}`;
    if (seen.has(key)) return;
    seen.add(key);
    sent += 1;

    const body = JSON.stringify({
      tag,
      message: described.message,
      ...(described.stack && { stack: described.stack }),
      // 질의 문자열에는 검색어와 토큰이 섞여 오므로 경로만 보냄
      path: window.location.pathname,
    });

    if (navigator.sendBeacon?.(URL_PATH, new Blob([body], { type: "application/json" }))) {
      return;
    }
    void fetch(URL_PATH, {
      method: "POST",
      body,
      headers: { "content-type": "application/json" },
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // 기록은 곁가지라 여기서 끝냄
  }
}
