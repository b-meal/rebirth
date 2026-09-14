import { Divider, HStack, Icon, Text, VStack } from "@seed-design/react";
import { IconPhoneFill } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";

import { Badge } from "@/components/ui/badge";

// 보호, 구조 기관 한 줄. 상세와 찾기 화면이 같은 모양을 씀

export type ShelterItem = {
  id: string;
  kind: "care_center" | "wildlife_center";
  name: string;
  orgName: string | null;
  roadAddress: string | null;
  tel: string | null;
  weekdayOpen: string | null;
  weekdayClose: string | null;
  closedDay: string | null;
  /** 좌표로 찾은 경우에만 있음 */
  distanceM?: number;
};

// 격자 좌표에서 잰 거리라 100m 단위로 끊어 원래 위치가 역산되지 않게 함
export function distanceLabel(meters: number): string {
  if (meters < 1000) return `${Math.max(1, Math.round(meters / 100)) * 100}m`;
  return `${(Math.round(meters / 100) / 10).toFixed(1)}km`;
}

export function hoursLabel(item: ShelterItem): string | null {
  const allDay = item.weekdayOpen === "00:00" && item.weekdayClose === "24:00";
  const hours = allDay
    ? "24시간"
    : item.weekdayOpen && item.weekdayClose
      ? `평일 ${item.weekdayOpen}~${item.weekdayClose}`
      : null;
  // 원본이 토요일+일요일 처럼 더하기로 이어 붙여 옴
  const closed = item.closedDay ? `휴무 ${item.closedDay.replaceAll("+", ", ")}` : null;
  const parts = [hours, closed].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

export function ShelterRow({ item }: { item: ShelterItem }) {
  const hours = hoursLabel(item);

  return (
    <HStack justify="space-between" align="center" gap="x3">
      <VStack align="flex-start" gap="x1" minWidth="0" flexGrow={1}>
        <HStack align="center" gap="x2" minWidth="0">
          <Text textStyle="t4Bold" color="fg.neutral">
            {item.name}
          </Text>
          {item.distanceM !== undefined ? (
            <Badge
              label={distanceLabel(item.distanceM)}
              tone={item.kind === "wildlife_center" ? "informative" : "neutral"}
            />
          ) : item.kind === "wildlife_center" ? (
            <Badge label="야생동물" tone="informative" />
          ) : null}
        </HStack>
        {item.roadAddress ? (
          <Text textStyle="t3Regular" color="fg.neutralMuted">
            {item.roadAddress}
          </Text>
        ) : null}
        {hours ? (
          <Text textStyle="t3Regular" color="fg.neutralSubtle">
            {hours}
          </Text>
        ) : null}
      </VStack>

      {item.tel ? (
        <ActionButton variant="neutralOutline" size="medium" asChild>
          <a href={`tel:${item.tel.replace(/[^0-9+]/g, "")}`} aria-label={`${item.name} 전화`}>
            <Icon svg={<IconPhoneFill />} size="x4" />
            전화
          </a>
        </ActionButton>
      ) : null}
    </HStack>
  );
}

export function ShelterList({ items }: { items: ShelterItem[] }) {
  return (
    <VStack align="stretch" gap="x3">
      {items.map((item, index) => (
        <VStack key={item.id} align="stretch" gap="x3">
          {index > 0 ? <Divider /> : null}
          <ShelterRow item={item} />
        </VStack>
      ))}
    </VStack>
  );
}
