"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Box, Flex } from "@seed-design/react";
import { SnackbarAvoidOverlap } from "seed-design/ui/snackbar";

import { BottomNav, isTabRoot } from "./bottom-nav";

// Web 은 모바일 전용, 큰 화면에서도 같은 폭의 프레임에 같은 내용을 담음

/** 앱 프레임 폭. 화면을 덮는 것들도 이 값을 따라 프레임 밖으로 퍼지지 않음 */
export const FRAME_WIDTH = "390px";

// 디자인 시스템 카탈로그는 데스크톱에서 보는 참고 화면이라 프레임 밖에서 그림
const FULL_WIDTH_PATHS = ["/design"];

// 탭바는 뷰포트에 붙어 스크롤과 무관하게 남고, 폭만 프레임을 따라 가운데로 옴
const DOCK = { transform: "translateX(-50%)" } as const;

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  if (FULL_WIDTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return <>{children}</>;
  }

  const tabs = isTabRoot(pathname);
  // 지도 화면은 높이를 스스로 꽉 채우고 시트 안에서 아래를 비워 밖에서 더하지 않음
  const reserve = tabs && pathname !== "/";

  return (
    <Flex justify="center" minHeight="100dvh" bg="bg.layerBasement">
      <Box
        position="relative"
        minWidth="0"
        width={{ base: "full", md: FRAME_WIDTH }}
        maxWidth={FRAME_WIDTH}
        bg="bg.layerDefault"
        className={reserve ? "rebirth-tab-space" : undefined}
      >
        {children}
      </Box>

      {/* 알림이 탭바를 덮지 않도록 띠 높이를 재게 함 */}
      {tabs ? (
        <SnackbarAvoidOverlap>
          <Box
            position="fixed"
            bottom="0"
            left="50%"
            width="full"
            maxWidth={FRAME_WIDTH}
            zIndex={40}
            px="x4"
            className="rebirth-bottom-bar--tight"
            style={DOCK}
          >
            <BottomNav />
          </Box>
        </SnackbarAvoidOverlap>
      ) : null}
    </Flex>
  );
}
