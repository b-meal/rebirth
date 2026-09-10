"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Box, Flex } from "@seed-design/react";

// Web 은 모바일 전용, 큰 화면에서도 같은 폭의 프레임에 같은 내용을 담음

const FRAME_WIDTH = "390px";

// 디자인 시스템 카탈로그는 데스크톱에서 보는 참고 화면이라 프레임 밖에서 그림
const FULL_WIDTH_PATHS = ["/design"];

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  if (FULL_WIDTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return <>{children}</>;
  }

  return (
    <Flex justify="center" minHeight="100dvh" bg="bg.layerBasement">
      <Box
        minWidth="0"
        width={{ base: "full", md: FRAME_WIDTH }}
        maxWidth={FRAME_WIDTH}
        bg="bg.layerDefault"
      >
        {children}
      </Box>
    </Flex>
  );
}
