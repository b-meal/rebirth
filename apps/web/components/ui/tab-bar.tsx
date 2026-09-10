"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Circle, Flex, Float, Text } from "@chakra-ui/react";

import { Icon, type IconName } from "./icons";

// 하단 탭 바, 활성 탭은 브랜드 틴트 알약으로 표시하고 안전 영역만큼 아래를 띄움

export type TabBarItem = {
  href: string;
  label: string;
  icon: IconName;
  activeIcon?: IconName;
  /** 숫자는 개수, true 는 점, 0 과 false 는 표시하지 않음 */
  badge?: number | boolean;
};

export type TabBarProps = {
  items: TabBarItem[];
  /** 지정하지 않으면 현재 경로로 판단 */
  activeHref?: string;
  sticky?: boolean;
};

function isActive(current: string, href: string) {
  return href === "/" ? current === "/" : current === href || current.startsWith(`${href}/`);
}

export function TabBar({ items, activeHref, sticky = true }: TabBarProps) {
  const pathname = usePathname();
  const current = activeHref ?? pathname ?? "";

  return (
    <Box
      as="nav"
      aria-label="주 메뉴"
      position={sticky ? "sticky" : "relative"}
      bottom="0"
      zIndex="docked"
      marginTop="auto"
      backgroundColor="bg.panel"
      borderTopWidth="1px"
      borderColor="border.muted"
      paddingBottom="safeBottom"
    >
      <Flex height="tabBar">
        {items.map((item) => {
          const active = isActive(current, item.href);
          return (
            <Flex
              asChild
              key={item.href}
              flex="1"
              direction="column"
              align="center"
              justify="center"
              gap="1"
              minWidth="0"
              color={active ? "fg.default" : "fg.assistive"}
              textDecoration="none"
              _active={{ opacity: 0.7 }}
            >
              <Link href={item.href} aria-current={active ? "page" : undefined}>
                <Flex
                  position="relative"
                  align="center"
                  justify="center"
                  width="52px"
                  height="28px"
                  borderRadius="full"
                  backgroundColor={active ? "brand.muted" : "transparent"}
                  transition="background-color 0.2s"
                >
                  <Icon name={active && item.activeIcon ? item.activeIcon : item.icon} size={22} />
                  {item.badge === true || (typeof item.badge === "number" && item.badge > 0) ? (
                    <Float placement="top-end" offsetX="3" offsetY="1">
                      {typeof item.badge === "number" ? (
                        <Circle
                          size="4"
                          backgroundColor="red.solid"
                          color="white"
                          fontSize="10px"
                          fontWeight="600"
                          paddingInline="1"
                        >
                          {item.badge > 99 ? "99+" : item.badge}
                        </Circle>
                      ) : (
                        <Circle size="2" backgroundColor="red.solid" />
                      )}
                    </Float>
                  ) : null}
                </Flex>
                <Text textStyle="caption" fontWeight={active ? "600" : "500"} truncate>
                  {item.label}
                </Text>
              </Link>
            </Flex>
          );
        })}
      </Flex>
    </Box>
  );
}
