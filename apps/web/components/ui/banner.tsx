import type { ReactNode } from "react";
import { Box, CloseButton, Flex, Text } from "@chakra-ui/react";

import { Icon, type IconName } from "./icons";

// 본문 안 안내 배너, 상태 알림은 SectionMessage 가 맡고 여기는 소개와 유도 문구 전용

export type BannerProps = {
  icon?: IconName;
  title: ReactNode;
  description?: ReactNode;
  /** 배너 안 짧은 링크나 버튼 하나 */
  action?: ReactNode;
  onClose?: () => void;
  tone?: "brand" | "neutral";
};

export function Banner({ icon, title, description, action, onClose, tone = "brand" }: BannerProps) {
  const brand = tone === "brand";
  return (
    <Flex
      gap="3"
      padding="4"
      borderRadius="card"
      backgroundColor={brand ? "brand.subtle" : "bg.subtle"}
      align="flex-start"
    >
      {icon ? (
        <Flex
          flexShrink={0}
          boxSize="9"
          borderRadius="full"
          backgroundColor={brand ? "brand.muted" : "bg.emphasized"}
          color={brand ? "brand.fg" : "fg.alternative"}
          align="center"
          justify="center"
        >
          <Icon name={icon} size={18} />
        </Flex>
      ) : null}
      <Box flex="1" minWidth="0">
        <Text textStyle="bodyStrong">{title}</Text>
        {description ? (
          <Text textStyle="bodySm" color="fg.alternative" marginTop="0.5">
            {description}
          </Text>
        ) : null}
        {action ? <Box marginTop="2">{action}</Box> : null}
      </Box>
      {onClose ? (
        <CloseButton
          size="sm"
          aria-label="닫기"
          onClick={onClose}
          marginTop="-1.5"
          marginInlineEnd="-1.5"
        />
      ) : null}
    </Flex>
  );
}
