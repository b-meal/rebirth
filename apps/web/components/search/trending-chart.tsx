"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Box, HStack, Text, VStack } from "@seed-design/react";
import type { AnimalType } from "@rebirth/types";

import { describeAnimal } from "@/lib/report-label";

// 실시간 차트, 한 줄씩 밀어 올려 지금 보이는 제보가 계속 바뀜

export type TrendingItem = {
  id: string;
  animalType: AnimalType;
  colors: string[];
  size: string;
  areaName: string | null;
  injury: boolean | null;
  careSituation: string;
  sinceLabel: string;
  interestCount: number;
  commentCount: number;
  photoUrl: string | null;
};

// 한 번에 보이는 줄 수와 머무는 시간, 밀어 올리는 시간
const VISIBLE_ROWS = 3;
const ROW_HEIGHT = 28;
const HOLD_MS = 2600;
const SLIDE_MS = 420;

export type TrendingChartProps = {
  items: TrendingItem[];
  /** 관심 수 대신 도움이 급한 순서로 세운 목록인지 */
  help?: boolean;
};

export function TrendingChart({ items, help = false }: TrendingChartProps) {
  const [index, setIndex] = useState(0);
  const [sliding, setSliding] = useState(false);
  const slide = useRef<number | null>(null);

  useEffect(() => {
    if (items.length <= VISIBLE_ROWS) return;

    const hold = window.setInterval(() => {
      setSliding(true);
      // 밀어 올리는 애니메이션이 끝난 뒤에 순서를 돌려 자리를 맞춤
      slide.current = window.setTimeout(() => {
        setIndex((value) => (value + 1) % items.length);
        setSliding(false);
      }, SLIDE_MS);
    }, HOLD_MS);

    return () => {
      window.clearInterval(hold);
      if (slide.current !== null) window.clearTimeout(slide.current);
    };
  }, [items.length]);

  if (items.length === 0) {
    return (
      <Text textStyle="t3Regular" color="fg.neutralSubtle">
        최근 7일 제보가 아직 없습니다
      </Text>
    );
  }

  // 다음에 올라올 줄까지 미리 그려 두어 미는 동안 빈 자리가 생기지 않음
  const rows = Array.from(
    { length: Math.min(VISIBLE_ROWS + 1, items.length) },
    (_, step) => (index + step) % items.length,
  );

  // 이동값과 전환 시간은 줄 높이에 묶여 있어 토큰으로 부를 수 없음
  const track = {
    transform: sliding ? `translateY(-${ROW_HEIGHT}px)` : "translateY(0)",
    transition: sliding ? `transform ${SLIDE_MS}ms ease-in-out` : "none",
  } as const;

  return (
    <Box height={`${VISIBLE_ROWS * ROW_HEIGHT}px`} overflowY="hidden">
      <VStack align="stretch" style={track}>
        {rows.map((position) => {
          const item = items[position]!;
          return (
            <HStack
              asChild
              key={item.id}
              gap="x2"
              align="center"
              height={`${ROW_HEIGHT}px`}
              flexShrink={0}
            >
              <Link href={`/r/${item.id}`}>
                <Text
                  textStyle="t3Bold"
                  color={position < 3 ? "fg.brand" : "fg.neutralSubtle"}
                >
                  {position + 1}
                </Text>
                <Text textStyle="t3Regular" color="fg.neutral" maxLines={1}>
                  {describeAnimal(item)}
                </Text>
                <Text textStyle="t2Regular" color="fg.neutralSubtle" maxLines={1}>
                  {item.areaName ?? "지역 미확인"}
                </Text>
                <Box marginLeft="auto">
                  <Text
                    textStyle="t2Regular"
                    color={help && item.injury === true ? "fg.critical" : "fg.neutralSubtle"}
                  >
                    {help && item.injury === true
                      ? "다친 것으로 보임"
                      : `관심 ${item.interestCount}`}
                  </Text>
                </Box>
              </Link>
            </HStack>
          );
        })}
      </VStack>
    </Box>
  );
}
