import type { ReactNode } from "react";
import { Box, Flex, Heading, Text } from "@chakra-ui/react";

// Web 은 모바일 전용. 큰 화면에서도 같은 폭의 프레임에 같은 내용을 담음
// PRD-01 의 1024px 이상 390px 프레임 기준. QR 은 DEC-01 확정 후 채움

const FRAME_WIDTH = "390px";

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <Flex
      justify="center"
      gap={{ base: "0", lg: "12" }}
      minHeight="100dvh"
      backgroundColor={{ base: "bg", lg: "bg.alternative" }}
    >
      <Box
        flex={{ base: "1", lg: "none" }}
        minWidth="0"
        width={{ lg: FRAME_WIDTH }}
        backgroundColor="bg"
        borderInlineWidth={{ lg: "1px" }}
        borderColor="border"
      >
        {children}
      </Box>

      <Flex
        direction="column"
        justify="center"
        gap="3"
        width="260px"
        display={{ base: "none", lg: "flex" }}
      >
        <Heading size="md">휴대폰으로 이용해 주십시오</Heading>
        <Text color="fg.alternative">
          사진 촬영과 위치 확인은 휴대폰에서 동작합니다. 같은 주소를 휴대폰 브라우저에
          입력하면 이어서 쓸 수 있습니다
        </Text>
        <Text textStyle="xs" color="fg.assistive">
          관리 주소는 이 화면에 표시하지 않습니다
        </Text>
      </Flex>
    </Flex>
  );
}
