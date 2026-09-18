"use client";

// design-system-allow:raw-element 키보드를 붙잡아 두는 보이지 않는 입력이라 네이티브 input 이 필요함

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * 화면을 넘어가는 동안 키보드를 들고 가는 다리
 *
 * iOS Safari 는 사용자 터치 안에서 부른 focus() 에만 키보드를 올림
 * 홈에서 검색 화면으로 넘어간 뒤 autoFocus 가 도는 시점은 터치와 끊어져 포커스만 되고 키보드가 안 뜸
 * 대신 터치 핸들러 안에서 이 입력에 먼저 포커스를 주면 키보드가 올라오고,
 * 다음 화면의 입력으로 포커스가 옮겨 가도 iOS 는 이미 떠 있는 키보드를 그대로 둠
 * 이 입력은 경로가 바뀌어도 남는 프레임에 두어 전환 중에 언마운트되지 않음
 */

// 다음 화면이 포커스를 가져가지 않으면 이 시간 뒤 스스로 놓아 키보드가 남지 않게 함
const HOLD_MS = 3000;

let bridge: HTMLInputElement | null = null;
let release: ReturnType<typeof setTimeout> | null = null;

/** 터치 핸들러 안에서 부름. 키보드를 올리고 다음 화면이 가져갈 때까지 붙잡음 */
export function holdKeyboard() {
  if (!bridge) return;
  bridge.focus({ preventScroll: true });
  if (release) clearTimeout(release);
  release = setTimeout(() => {
    if (document.activeElement === bridge) bridge?.blur();
  }, HOLD_MS);
}

export function KeyboardBridge() {
  const ref = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const node = ref.current;
    bridge = node;
    return () => {
      if (bridge === node) bridge = null;
    };
  }, []);

  // 검색이 아닌 곳으로 갔으면 붙잡을 까닭이 없어 바로 놓음
  useEffect(() => {
    if (pathname !== "/search" && document.activeElement === ref.current) ref.current?.blur();
  }, [pathname]);

  return (
    <input
      ref={ref}
      type="text"
      inputMode="search"
      autoComplete="off"
      aria-hidden="true"
      tabIndex={-1}
      // readOnly 나 display:none 이면 iOS 가 키보드를 올리지 않아 크기만 줄여 숨김
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: 1,
        height: 1,
        opacity: 0,
        pointerEvents: "none",
      }}
    />
  );
}
