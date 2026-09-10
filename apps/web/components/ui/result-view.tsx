import type { ReactNode } from "react";
import { Flex, Text } from "@chakra-ui/react";

import { Icon, type IconName } from "./icons";

// 제출 완료나 처리 실패처럼 한 화면을 통째로 차지하는 결과 안내

export type ResultStatus = "success" | "error" | "info" | "brand";

const TONE: Record<ResultStatus, { bg: string; fg: string; icon: IconName }> = {
  success: { bg: "green.subtle", fg: "green.fg", icon: "checkCircle" },
  error: { bg: "red.subtle", fg: "red.fg", icon: "error" },
  info: { bg: "blue.subtle", fg: "blue.fg", icon: "info" },
  brand: { bg: "brand.muted", fg: "brand.fg", icon: "paw" },
};

export type ResultViewProps = {
  status?: ResultStatus;
  /** 기본 상태 아이콘 대신 넣는 그림 */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** 아래에 세로로 쌓이는 버튼들 */
  children?: ReactNode;
  /** 화면 조각으로 끼울 때는 auto 로 낮춤 */
  minHeight?: string;
};

export function ResultView({
  status = "success",
  icon,
  title,
  description,
  children,
  minHeight = "60dvh",
}: ResultViewProps) {
  const tone = TONE[status];
  return (
    <Flex
      direction="column"
      flex="1"
      align="center"
      justify="center"
      textAlign="center"
      gap="3"
      paddingInline="screen"
      paddingBlock="12"
      minHeight={minHeight}
    >
      <Flex
        boxSize="72px"
        borderRadius="full"
        backgroundColor={tone.bg}
        color={tone.fg}
        align="center"
        justify="center"
        marginBottom="2"
      >
        {icon ?? <Icon name={tone.icon} size={36} />}
      </Flex>
      <Text as="h1" textStyle="title2">
        {title}
      </Text>
      {description ? (
        <Text textStyle="body" color="fg.alternative" maxWidth="300px">
          {description}
        </Text>
      ) : null}
      {children ? (
        <Flex direction="column" gap="2" width="100%" marginTop="5">
          {children}
        </Flex>
      ) : null}
    </Flex>
  );
}
