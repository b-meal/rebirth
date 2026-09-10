"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Box, Flex, Text, VStack } from "@seed-design/react";

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
    <Flex justify="center" gap={{ base: "0", md: "x12" }} minHeight="100dvh" bg="bg.layerBasement">
      <Box
        minWidth="0"
        width={{ base: "full", md: FRAME_WIDTH }}
        maxWidth={FRAME_WIDTH}
        bg="bg.layerDefault"
      >
        {children}
      </Box>

      <VStack
        display={{ base: "none", md: "flex" }}
        justify="center"
        gap="x3"
        width="260px"
        py="x10"
      >
        <Text as="h2" textStyle="t6Bold" color="fg.neutral">
          휴대폰으로 이용해 주십시오
        </Text>
        <Text textStyle="t4Regular" color="fg.neutralMuted">
          사진 촬영과 위치 확인은 휴대폰에서 동작합니다. 같은 주소를 휴대폰 브라우저에
          입력하면 이어서 쓸 수 있습니다
        </Text>
        <Text textStyle="t2Regular" color="fg.neutralSubtle">
          관리 주소는 이 화면에 표시하지 않습니다
        </Text>
      </VStack>
    </Flex>
  );
}
