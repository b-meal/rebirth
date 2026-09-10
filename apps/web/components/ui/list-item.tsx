"use client";

import { createContext, useContext, type ReactNode } from "react";
import Link from "next/link";
import { Box, Flex, Separator, Stack, Text } from "@chakra-ui/react";

import { Icon, type IconName } from "./icons";

// 설정 메뉴 목록에 쓰는 행, 링크 버튼 정적 셀을 한 컴포넌트로 통일

const InsetContext = createContext(false);

export type ListItemProps = {
  title: ReactNode;
  description?: ReactNode;
  /** 아이콘 이름이면 틴트 원 안에 그리고 노드면 그대로 배치 */
  leading?: IconName | ReactNode;
  /** 오른쪽 값이나 스위치, chevron 과 함께 쓰면 값 뒤에 화살표 */
  trailing?: ReactNode;
  chevron?: boolean;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  /** 제목과 설명을 한 줄로 자름 */
  truncate?: boolean;
};

function Leading({ leading }: { leading: ListItemProps["leading"] }) {
  if (typeof leading === "string") {
    return (
      <Flex
        flexShrink={0}
        boxSize="10"
        borderRadius="full"
        backgroundColor="bg.subtle"
        color="fg.alternative"
        align="center"
        justify="center"
      >
        <Icon name={leading as IconName} size={20} />
      </Flex>
    );
  }
  return <Box flexShrink={0}>{leading}</Box>;
}

export function ListItem({
  title,
  description,
  leading,
  trailing,
  chevron = false,
  href,
  onClick,
  disabled = false,
  destructive = false,
  truncate = false,
}: ListItemProps) {
  const inset = useContext(InsetContext);
  const interactive = Boolean(href || onClick) && !disabled;

  const body = (
    <>
      {leading ? <Leading leading={leading} /> : null}
      <Box flex="1" minWidth="0">
        <Text textStyle="body" color={destructive ? "fg.error" : "fg.default"} truncate={truncate}>
          {title}
        </Text>
        {description ? (
          <Text textStyle="bodySm" color="fg.alternative" truncate={truncate}>
            {description}
          </Text>
        ) : null}
      </Box>
      {trailing ? (
        <Flex flexShrink={0} align="center" color="fg.alternative" textStyle="bodySm">
          {trailing}
        </Flex>
      ) : null}
      {chevron ? (
        <Box flexShrink={0} color="fg.assistive">
          <Icon name="forward" size={20} />
        </Box>
      ) : null}
    </>
  );

  const shared = {
    align: "center",
    gap: "3",
    width: "100%",
    minHeight: "14",
    paddingInline: inset ? "4" : "screen",
    paddingBlock: "3",
    textAlign: "start",
    textDecoration: "none",
    color: "inherit",
    opacity: disabled ? 0.45 : 1,
    cursor: interactive ? "pointer" : "default",
    _active: interactive ? { backgroundColor: "bg.subtle" } : undefined,
  } as const;

  if (href && !disabled) {
    return (
      <Flex asChild {...shared}>
        <Link href={href}>{body}</Link>
      </Flex>
    );
  }
  if (onClick) {
    return (
      <Flex asChild {...shared}>
        <button type="button" disabled={disabled} onClick={onClick}>
          {body}
        </button>
      </Flex>
    );
  }
  return <Flex {...shared}>{body}</Flex>;
}

export type ListGroupProps = {
  title?: ReactNode;
  children: ReactNode;
  /** 카드처럼 화면 여백 안쪽에 테두리와 모서리를 두고 담음 */
  inset?: boolean;
  divider?: boolean;
};

export function ListGroup({ title, children, inset = false, divider = true }: ListGroupProps) {
  return (
    <InsetContext.Provider value={inset}>
      <Box as="section">
        {title ? (
          <Text
            as="h2"
            textStyle="overline"
            color="fg.assistive"
            paddingInline={inset ? "1" : "screen"}
            paddingBottom="2"
          >
            {title}
          </Text>
        ) : null}
        <Stack
          gap="0"
          overflow="hidden"
          backgroundColor={inset ? "bg.panel" : undefined}
          borderRadius={inset ? "card" : undefined}
          borderWidth={inset ? "1px" : "0"}
          borderColor="border.muted"
          separator={
            divider ? (
              <Separator borderColor="border.muted" marginInlineStart={inset ? "4" : "screen"} />
            ) : undefined
          }
        >
          {children}
        </Stack>
      </Box>
    </InsetContext.Provider>
  );
}
