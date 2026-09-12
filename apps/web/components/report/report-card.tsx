import Link from "next/link";
import { AspectRatio, Box, HStack, ImageFrame, Text, VStack } from "@seed-design/react";
import type { AnimalType } from "@rebirth/types";

import { CARE_LABEL, describeAnimal } from "@/lib/report-label";

// 지도 시트와 상세 화면 아래가 같은 카드를 쓰게 모아 둔 격자용 카드

export type ReportCardItem = {
  id: string;
  animalType: AnimalType;
  colors: string[];
  size: string;
  careSituation: string;
  injury: boolean | null;
  areaName: string | null;
  sinceLabel: string;
  photoUrl: string | null;
};

export function ReportCard({ item }: { item: ReportCardItem }) {
  return (
    <VStack asChild align="stretch" gap="x1" minWidth="0">
      <Link href={`/r/${item.id}`} className="rebirth-tile">
        {item.photoUrl ? (
          <ImageFrame
            ratio={1}
            src={item.photoUrl}
            alt={describeAnimal(item)}
            borderRadius="r3"
          />
        ) : (
          <AspectRatio ratio={1} borderRadius="r3" bg="bg.neutralWeak">
            <Box />
          </AspectRatio>
        )}
        <Text textStyle="t3Bold" color="fg.neutral" maxLines={1}>
          {describeAnimal(item)}
        </Text>
        <Text textStyle="t2Regular" color="fg.neutralMuted" maxLines={1}>
          {item.areaName ?? "지역 미확인"}
        </Text>
        <HStack gap="x1" align="center">
          <Text textStyle="t2Regular" color="fg.neutralSubtle">
            {item.sinceLabel}
          </Text>
          {item.injury === true ? (
            <Text textStyle="t2Regular" color="fg.critical">
              다친 것으로 보임
            </Text>
          ) : (
            <Text textStyle="t2Regular" color="fg.neutralSubtle" maxLines={1}>
              {CARE_LABEL[item.careSituation] ?? ""}
            </Text>
          )}
        </HStack>
      </Link>
    </VStack>
  );
}
