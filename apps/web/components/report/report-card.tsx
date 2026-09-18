import Link from "next/link";
import { AspectRatio, Box, HStack, ImageFrame, Text, VStack } from "@seed-design/react";
import type { AnimalType } from "@rebirth/types";

import { describeAnimal, reportStatusBadge } from "@/lib/report-label";

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
  /** 발견 제보와 실종 신고가 한 표에 담겨 있어 카드가 부르는 말이 갈림 */
  kind?: "sighting" | "lost";
  /** 보호자가 적어 둔 이름. 실종 신고에만 있고 없으면 생김새로 부름 */
  petName?: string | null;
};

/** 가로로 넘겨 보는 카드 폭, 두 장 반이 걸쳐 보여 더 있다는 것이 드러남 */
export const NEARBY_CARD_WIDTH = "136px";

export function ReportCard({ item }: { item: ReportCardItem }) {
  // 이름을 아는 기록은 이름이 먼저 읽혀야 함. 생김새는 아래 줄로 내림
  const title = item.petName || describeAnimal(item);

  return (
    <VStack asChild align="stretch" gap="x1" minWidth="0">
      <Link href={`/r/${item.id}`}>
        {item.photoUrl ? (
          /* 이름은 옆 제목이 이미 읽어 줌. 사진은 생김새를 말해야 보탬이 됨 */
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
          {title}
        </Text>
        <Text textStyle="t2Regular" color="fg.neutralMuted" maxLines={1}>
          {/* 이름이 제목을 차지했으면 생김새를 지역명 앞에 붙여 무엇을 찾는지 알림 */}
          {item.petName ? `${describeAnimal(item)}, ` : ""}
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
            // 종류와 보호 상황을 한 줄로 고름. 실종은 보호 상황을 쓰지 않아 여기서 갈림
            <Text textStyle="t2Regular" color="fg.neutralSubtle" maxLines={1}>
              {reportStatusBadge({ kind: item.kind ?? "sighting", careSituation: item.careSituation })
                ?.label ?? ""}
            </Text>
          )}
        </HStack>
      </Link>
    </VStack>
  );
}
