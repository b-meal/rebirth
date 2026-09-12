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
  icon: typeof IconHouseLine;
  activeIcon: typeof IconHouseLine;
  // 화면이 아직 없는 항목은 비워 두고 눌렀을 때 준비 중임을 알림
  href?: string;
};

const NAV: NavItem[] = [
  { label: "홈", href: "/", icon: IconHouseLine, activeIcon: IconHouseFill },
  { label: "커뮤니티", icon: IconPerson2Line, activeIcon: IconPerson2Fill },
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

function isActive(pathname: string, href?: string): boolean {
  if (!href) return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export type BottomNavProps = {
  /** 화면이 없는 항목을 눌렀을 때 알릴 방법 */
  onUnavailable: (label: string) => void;
};

export function BottomNav({ onUnavailable }: BottomNavProps) {
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
        const body = (
          <>
            <Icon svg={<Glyph />} color={tone} />
            <Text textStyle="t1Regular" color={tone}>
              {item.label}
            </Text>
          </>
        );

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
            {item.href ? (
              <Link href={item.href} aria-current={active ? "page" : undefined}>
                {body}
              </Link>
            ) : (
              <button type="button" onClick={() => onUnavailable(item.label)}>
                {body}
              </button>
            )}
          </VStack>
        );
      })}
    </HStack>
  );
}
