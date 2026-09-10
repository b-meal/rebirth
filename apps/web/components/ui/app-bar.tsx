"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Box,
  Flex,
  Grid,
  IconButton,
  Text,
  type BoxProps,
  type IconButtonProps,
} from "@chakra-ui/react";

import { Icon, type IconName } from "./icons";

// 상단 바, 뒤로가기 햄버거 제목 우측 동작을 한 줄에 배치하는 모바일 헤더

export type AppBarProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  /** true 면 history back, 문자열이면 해당 경로 링크, 함수면 직접 처리 */
  back?: boolean | string | (() => void);
  onMenu?: () => void;
  onClose?: () => void;
  /** back onMenu onClose 대신 직접 넣는 왼쪽 슬롯 */
  leading?: ReactNode;
  actions?: ReactNode;
  /** large 는 제목을 바 아래 큰 글자로 내림, transparent 는 바탕과 경계선 제거 */
  variant?: "default" | "transparent" | "large";
  align?: "center" | "start";
  sticky?: boolean;
} & Omit<BoxProps, "title" | "children">;

/** 상단 바 오른쪽에 놓는 아이콘 동작, 44px 터치 영역 */
export function AppBarAction({
  icon,
  label,
  ...rest
}: Omit<IconButtonProps, "aria-label" | "children"> & { icon: IconName; label: string }) {
  return (
    <IconButton variant="ghost" colorPalette="gray" aria-label={label} size="lg" {...rest}>
      <Icon name={icon} size={24} />
    </IconButton>
  );
}

function BackButton({ back }: { back: NonNullable<AppBarProps["back"]> }) {
  const router = useRouter();
  if (typeof back === "string") {
    return (
      <IconButton asChild variant="ghost" colorPalette="gray" aria-label="뒤로" size="lg">
        <Link href={back}>
          <Icon name="back" size={24} />
        </Link>
      </IconButton>
    );
  }
  return (
    <AppBarAction
      icon="back"
      label="뒤로"
      onClick={typeof back === "function" ? back : () => router.back()}
    />
  );
}

export function AppBar({
  title,
  subtitle,
  back,
  onMenu,
  onClose,
  leading,
  actions,
  variant = "default",
  align = "center",
  sticky = true,
  ...rest
}: AppBarProps) {
  const left =
    leading ??
    (back ? (
      <BackButton back={back} />
    ) : onMenu ? (
      <AppBarAction icon="menu" label="메뉴" onClick={onMenu} />
    ) : onClose ? (
      <AppBarAction icon="close" label="닫기" onClick={onClose} />
    ) : null);

  const centered = align === "center";
  const inline = variant !== "large";

  return (
    <Box
      as="header"
      position={sticky ? "sticky" : "relative"}
      top="0"
      zIndex="sticky"
      backgroundColor={variant === "transparent" ? "transparent" : "bg.canvas"}
      borderBottomWidth={variant === "default" ? "1px" : "0"}
      borderColor="border.muted"
      paddingTop="safeTop"
      {...rest}
    >
      <Grid
        templateColumns={
          centered ? "minmax(var(--chakra-sizes-touch), 1fr) auto minmax(var(--chakra-sizes-touch), 1fr)" : "auto 1fr auto"
        }
        alignItems="center"
        height="appBar"
        paddingInline="2"
        gap="1"
      >
        <Flex justify="flex-start" align="center" minWidth="0">
          {left}
        </Flex>
        <Box
          minWidth="0"
          textAlign={centered ? "center" : "start"}
          paddingInline={!centered && !left ? "3" : "1"}
        >
          {inline && title ? (
            <Text as="h1" textStyle="heading" truncate>
              {title}
            </Text>
          ) : null}
          {inline && subtitle ? (
            <Text textStyle="caption" color="fg.alternative" truncate>
              {subtitle}
            </Text>
          ) : null}
        </Box>
        <Flex justify="flex-end" align="center" gap="0" minWidth="0">
          {actions}
        </Flex>
      </Grid>

      {!inline ? (
        <Flex direction="column" gap="1" paddingInline="screen" paddingBottom="3">
          <Text as="h1" textStyle="title1">
            {title}
          </Text>
          {subtitle ? (
            <Text textStyle="bodySm" color="fg.alternative">
              {subtitle}
            </Text>
          ) : null}
        </Flex>
      ) : null}
    </Box>
  );
}
