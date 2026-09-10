"use client";

import type { ReactNode } from "react";

import { SnackbarProvider } from "seed-design/ui/snackbar";

// SEED 는 CSS 변수로 테마를 걸어 별도 Provider 가 없고 스낵바 영역만 감쌈
export function Providers({ children }: { children: ReactNode }) {
  return <SnackbarProvider>{children}</SnackbarProvider>;
}
