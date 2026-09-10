"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Box, HStack, Text, VStack } from "@seed-design/react";
import type { AnimalType } from "@rebirth/types";

import { describeAnimal } from "@/lib/report-label";

// 실시간 차트, 줄을 한 칸씩 밀어 올려 지금 보이는 제보가 계속 바뀜

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

// 한 번에 보이는 줄 수와 밀어 올리는 간격
const VISIBLE_ROWS = 3;
const ROLL_MS = 2600;

const ROW_HEIGHT = 28;

export type TrendingChartProps = {
  items: TrendingItem[];
  /** 관심 수 대신 도움이 급한 순서로 세운 목록인지 */
  help?: boolean;
};

export function TrendingChart({ items, help = false }: TrendingChartProps) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (items.length <= VISIBLE_ROWS) return;
    const timer = setInterval(() => {
      setOffset((value) => (value + 1) % items.length);
    }, ROLL_MS);
    return () => {
      clearInterval(timer);
    };
  }, [items.length]);

  if (items.length === 0) {
    return (
      <Text textStyle="t3Regular" color="fg.neutralSubtle">
        최근 7일 제보가 아직 없습니다
      </Text>
    );
  }

  // 끝에서 처음으로 이어 붙여 마지막 줄 뒤에도 빈 자리가 생기지 않음
  const rolled = [...items.slice(offset), ...items.slice(0, offset)];

  return (
    <Box height={`${VISIBLE_ROWS * ROW_HEIGHT}px`} overflowY="hidden">
      <VStack align="stretch">
        {rolled.slice(0, VISIBLE_ROWS + 1).map((item) => {
          const rank = items.indexOf(item) + 1;
          return (
            <HStack asChild key={item.id} gap="x2" align="center" height={`${ROW_HEIGHT}px`}>
              <Link href={`/r/${item.id}`}>
                <Text textStyle="t3Bold" color={rank <= 3 ? "fg.brand" : "fg.neutralSubtle"}>
                  {rank}
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
