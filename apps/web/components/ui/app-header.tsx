"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Box, HStack, Icon, Text } from "@seed-design/react";
import { IconChevronLeftLine, IconHouseLine } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";

// SEED 앱바는 Stackflow 에 묶여 있어 Next 라우터를 쓰는 이 앱에서는 껍데기로 둠

// 좌우 버튼 자리를 같은 폭으로 잡아 제목이 화면 가운데에 놓임
const SLOT_WIDTH = "x10";

export type AppHeaderProps = {
  title: string;
  /** 뒤로 대신 홈으로 보낼 화면, 흐름의 끝이라 되돌아갈 곳이 없을 때 씀 */
  home?: boolean;
  /** 오른쪽 자리에 둘 동작, 없으면 빈 자리로 균형만 맞춤 */
  action?: ReactNode;
};

export function AppHeader({ title, home = false, action }: AppHeaderProps) {
  const router = useRouter();

  return (
    <HStack
      as="header"
      align="center"
      justify="space-between"
      gap="x2"
      px="x2"
      py="x1_5"
      position="sticky"
      top="0"
      zIndex={10}
      bg="bg.layerDefault"
    >
      <Box width={SLOT_WIDTH}>
        {home ? (
          <ActionButton variant="ghost" size="medium" layout="iconOnly" aria-label="홈으로" asChild>
            <Link href="/">
              <Icon svg={<IconHouseLine />} />
            </Link>
          </ActionButton>
        ) : (
          <ActionButton
            variant="ghost"
            size="medium"
            layout="iconOnly"
            aria-label="뒤로"
            onClick={() => router.back()}
          >
            <Icon svg={<IconChevronLeftLine />} />
          </ActionButton>
        )}
      </Box>

      <Text as="h1" textStyle="t5Bold" color="fg.neutral" maxLines={1}>
        {title}
      </Text>

      <HStack width={SLOT_WIDTH} justify="flex-end">
        {action}
      </HStack>
    </HStack>
  );
}
