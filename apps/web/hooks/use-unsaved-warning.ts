"use client";

import { useEffect } from "react";

// 쓰다 만 글을 잃지 않게 막는 장치
// 페이지로 둔 이유가 긴 글을 편히 쓰는 것이라 나가는 순간도 함께 다뤄야 함

/**
 * 저장하지 않은 내용이 있을 때 새로고침과 탭 닫기를 되묻게 함
 * 브라우저가 문구를 정하므로 우리가 쓴 말은 화면에 나오지 않음
 *
 * 앱 안에서 이동하는 경우는 잡지 못함. beforeunload 는 문서를 떠날 때만 돎
 */
export function useUnsavedWarning(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return;

    const confirmLeave = (event: BeforeUnloadEvent) => {
      // preventDefault 만으로 충분하나 옛 브라우저는 returnValue 를 봄
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", confirmLeave);
    return () => window.removeEventListener("beforeunload", confirmLeave);
  }, [dirty]);
}
