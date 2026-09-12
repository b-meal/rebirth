"use client";

import { useEffect, useRef, type RefObject } from "react";

// 서버가 돌려준 첫 오류 칸으로 화면을 옮기고 손을 올려 둠
// 오류가 화면 밖에 있으면 버튼만 눌리고 아무 일도 안 일어난 것처럼 보임

/** 칩 줄처럼 입력 칸이 없는 값은 이 이름으로 표시한 자리를 찾음 */
const FALLBACK_ATTR = "data-error-anchor";

/** 스크롤이 멎기를 기다리는 시간. 먼저 focus 를 주면 브라우저가 다시 당겨 화면이 튐 */
const AFTER_SCROLL_MS = 300;

function findTarget(form: HTMLElement, field: string): HTMLElement | null {
  const escaped = CSS.escape(field);

  // 칩의 숨은 체크박스처럼 보이지 않는 칸으로 옮기면 화면에는 아무 변화가 없음
  for (const el of form.querySelectorAll<HTMLElement>(`[name="${escaped}"]`)) {
    if (el.offsetParent !== null) return el;
  }
  return form.querySelector<HTMLElement>(`[${FALLBACK_ATTR}="${escaped}"]`);
}

/**
 * 제출 결과가 올 때마다 첫 오류 칸으로 옮김
 * state 는 useActionState 가 제출마다 새로 주는 객체라
 * 같은 오류가 이어져도 두 번째 제출에서 다시 자리를 알려 줌
 */
export function useFocusError(
  formRef: RefObject<HTMLFormElement | null>,
  state: { errors?: Record<string, string> },
): void {
  const seen = useRef<object | null>(null);

  useEffect(() => {
    const first = state.errors ? Object.keys(state.errors)[0] : undefined;
    if (!first || seen.current === state) return;
    seen.current = state;

    const form = formRef.current;
    const target = form ? findTarget(form, first) : null;
    if (!target) return;

    // 시트 안의 폼은 창이 아니라 시트가 스크롤되므로 스스로 맞는 곳을 찾게 둠
    target.scrollIntoView({ behavior: "smooth", block: "center" });

    const timer = setTimeout(() => target.focus({ preventScroll: true }), AFTER_SCROLL_MS);
    return () => clearTimeout(timer);
  }, [state, formRef]);
}
