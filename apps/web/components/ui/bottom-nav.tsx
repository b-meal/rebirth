"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HStack, Icon, Text, VStack } from "@seed-design/react";
import {
  IconHouseFill,
  IconHouseLine,
  IconMagnifyingglassFill,
  IconMagnifyingglassLine,
  IconPawprintFill,
  IconPawprintLine,
  IconPerson2Fill,
  IconPerson2Line,
  IconPersonFill,
  IconPersonLine,
} from "@karrotmarket/react-monochrome-icon";

// SEED 레지스트리에 하단 탭바가 없어 앱 껍데기로 두는 떠 있는 알약형 내비게이션

// 흐림과 반투명이 SEED prop 에 없고 사진 위 가독성도 필요해 면 토큰을 섞어 씀
const GLASS = {
  background: "color-mix(in srgb, var(--seed-color-bg-layer-floating) 92%, transparent)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
} as const;

type NavItem = {
  label: string;
  href: string;
  icon: typeof IconHouseLine;
  activeIcon: typeof IconHouseLine;
};

const NAV: NavItem[] = [
  { label: "홈", href: "/", icon: IconHouseLine, activeIcon: IconHouseFill },
  {
    label: "커뮤니티",
    href: "/community",
    icon: IconPerson2Line,
    activeIcon: IconPerson2Fill,
  },
  {
    label: "실종신고",
    href: "/lost/new",
    icon: IconMagnifyingglassLine,
    activeIcon: IconMagnifyingglassFill,
  },
  {
    label: "발견제보",
    href: "/reports",
    icon: IconPawprintLine,
    activeIcon: IconPawprintFill,
  },
  {
    label: "마이페이지",
    href: "/mine",
    icon: IconPersonLine,
    activeIcon: IconPersonFill,
  },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

// 탭바를 띄우는 화면. 실종신고는 탭에서 열리지만 작성 폼이라 빠짐
// 폼은 아래에 제출 띠가 붙어 탭바와 겹치고, 쓰다 말고 탭을 옮길 자리도 아님
const TAB_ROOTS = ["/", "/community", "/reports", "/mine"];

/** 탭으로 곧장 닿고 되돌아갈 곳이 없는 최상위 화면인지 */
export function isTabRoot(pathname: string): boolean {
  return TAB_ROOTS.includes(pathname);
}

export function BottomNav() {
  const pathname = usePathname() ?? "/";

  return (
    <HStack
      as="nav"
      justify="space-between"
      align="center"
      p="x1_5"
      borderRadius="full"
      borderWidth={1}
      borderColor="stroke.neutralMuted"
      bg="bg.neutralWeakAlpha"
      boxShadow="s3"
      style={GLASS}
    >
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        const Glyph = active ? item.activeIcon : item.icon;
        const tone = active ? "fg.neutral" : "fg.neutralSubtle";

        return (
          <VStack
            key={item.label}
            asChild
            align="center"
            gap="x0_5"
            py="x1_5"
            grow={1}
            minWidth="0"
            borderRadius="full"
            bg={active ? "bg.neutralWeak" : undefined}
          >
            <Link href={item.href} aria-current={active ? "page" : undefined}>
              <Icon svg={<Glyph />} color={tone} />
              <Text textStyle="t1Regular" color={tone}>
                {item.label}
              </Text>
            </Link>
          </VStack>
        );
      })}
    </HStack>
  );
}
