import type { Metadata } from "next";
import Link from "next/link";
import { Box, HStack, Icon, Text, VStack } from "@seed-design/react";
import { IconChevronRightLine } from "@karrotmarket/react-monochrome-icon";

import { Screen, ScreenBody, Section, SectionTitle } from "@/components/ui/screen";

// 검색으로 들어온 사람이 처음 닿는 한 장, 지도를 그리지 않아 첫 페인트가 가벼움

export const metadata: Metadata = {
  title: "잃어버린 반려동물 찾기",
  description:
    "잃어버린 반려동물을 신고하고, 길에서 만난 동물을 사진 한 장으로 제보해요. 마지막 목격지에서 이동 가능한 지역을 추정해 찾을 곳을 좁혀 드려요.",
};

// 급한 순서대로 세워 고민 없이 첫 타일을 누르게 한 목적지
const TILES = [
  {
    href: "/lost/new",
    title: "반려동물을 잃어버렸어요",
    description: "이름과 사진을 남기면 닮은 발견 제보를 모아 드려요",
  },
  {
    href: "/report",
    title: "길에서 동물을 봤어요",
    description: "사진 한 장이면 돼요. 나머지는 AI 초안이 채우고 고칠 수 있어요",
  },
  {
    href: "/guide/injured",
    title: "다친 동물을 봤어요",
    description: "구조·보호 요청을 접수하고 가까운 기관을 함께 찾아 드려요",
  },
];

// 이동 경로 추정이 무엇인지 세 문장, 지도 대신 글로만 말하는 자리
const TRACK_LINES = [
  "마지막 목격 시각과 동물 크기로 그때까지 갈 수 있었던 거리를 계산해요.",
  "같은 아이로 확인할 후보 제보가 이어지면 지나온 방향으로 예측 범위를 좁혀요.",
  "사진이 서로 어긋나면 신뢰도를 낮춰 표시해요. 개체 동일성은 확정하지 않아요.",
];

export default function FindPage() {
  return (
    <Screen bg="bg.layerBasement">
      <ScreenBody gap="spacingY.componentDefault">
        <Section gap="x2">
          <Text as="h1" textStyle="t8Bold" color="fg.neutral">
            잃어버린 반려동물 찾기
          </Text>
          <Text textStyle="t4Regular" color="fg.neutralMuted">
            신고와 제보가 같은 지도 위에 쌓여요. 지금 하려는 일을 골라 주세요
          </Text>
        </Section>

        <Section gap="x2">
          {TILES.map((tile) => (
            <Box
              key={tile.href}
              asChild
              px="spacingX.globalGutter"
              py="x5"
              bg="bg.layerDefault"
              borderRadius="r4"
            >
              <Link href={tile.href}>
                <HStack justify="space-between" align="center" gap="x3">
                  <VStack align="stretch" gap="x1" minWidth="0">
                    <Text textStyle="t5Bold" color="fg.neutral">
                      {tile.title}
                    </Text>
                    <Text textStyle="t4Regular" color="fg.neutralMuted">
                      {tile.description}
                    </Text>
                  </VStack>
                  <Icon svg={<IconChevronRightLine />} color="fg.neutralSubtle" />
                </HStack>
              </Link>
            </Box>
          ))}
        </Section>

        <Section gap="x2">
          <SectionTitle>이동 경로 추적</SectionTitle>
          <VStack align="stretch" gap="x1_5">
            {TRACK_LINES.map((line) => (
              <Text key={line} textStyle="t4Regular" color="fg.neutralMuted">
                {line}
              </Text>
            ))}
          </VStack>
        </Section>

        <Section gap="x2">
          <Box asChild px="spacingX.globalGutter" py="x4" bg="bg.layerDefault" borderRadius="r4">
            <Link href="/search?kind=lost">
              <HStack justify="space-between" align="center" gap="x3">
                <VStack align="stretch" gap="x1" minWidth="0">
                  <Text textStyle="t5Bold" color="fg.neutral">
                    이름으로 실종 신고 찾기
                  </Text>
                  <Text textStyle="t4Regular" color="fg.neutralMuted">
                    아는 이름이나 지역이 있으면 신고 상세로 바로 갈 수 있어요
                  </Text>
                </VStack>
                <Icon svg={<IconChevronRightLine />} color="fg.neutralSubtle" />
              </HStack>
            </Link>
          </Box>
        </Section>
      </ScreenBody>
    </Screen>
  );
}
