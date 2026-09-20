"use client";

import { useEffect } from "react";

import { reportClientError } from "@/lib/report-error";

// 아무도 잡지 않은 오류를 모아 서버로 보냄
// 손으로 붙인 자리만 모으면 정작 예상 못 한 고장이 빠짐. 여기서 그물을 한 겹 침

// 보내 봐야 고칠 수 없는 잡음
// 확장 프로그램이 낸 것, 브라우저가 스스로 복구하는 ResizeObserver 경고,
// 자리를 뜨는 중에 끊긴 요청이 여기 해당함
const NOISE = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i,
  /Load failed/i,
  /NetworkError when attempting to fetch/i,
  /The (?:operation|user aborted a request)/i,
];

function isNoise(message: string, source?: string): boolean {
  if (source && /^(?:chrome|moz|safari)-extension:/.test(source)) return true;
  return NOISE.some((pattern) => pattern.test(message));
}

export function ErrorCollector() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (isNoise(event.message, event.filename)) return;
      reportClientError("uncaught", event.error ?? event.message);
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason);
      if (isNoise(message)) return;
      reportClientError("unhandled-rejection", reason);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
