"use client";

import type { ReactNode } from "react";

import { SnackbarProvider } from "seed-design/ui/snackbar";

import { NeighborhoodProvider } from "@/components/location/neighborhood-provider";

// SEED 는 CSS 변수로 테마를 걸어 별도 Provider 가 없고 스낵바 영역만 감쌈
// 내 동네는 위치 권한 팝업이 화면마다 뜨지 않도록 여기서 한 번만 물음
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SnackbarProvider>
      <NeighborhoodProvider>{children}</NeighborhoodProvider>
    </SnackbarProvider>
  );
}
