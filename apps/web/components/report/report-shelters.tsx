import { Divider, HStack, Icon, Text, VStack } from "@seed-design/react";
import { IconPhoneFill } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";

import { SectionCard } from "@/components/ui/screen";
import { Badge } from "@/components/ui/badge";

// 제보 상세에 붙는 보호·구조 기관 안내. 공공데이터포털 사본을 그대로 보여 줌
// 어디에 맡길지 모르는 사람이 다음에 할 일이 전화 한 통이라 번호를 앞에 둠

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
  distanceM: number;
};

// 격자 좌표에서 잰 거리라 100m 단위로 끊어 원래 위치가 역산되지 않게 함
function distanceLabel(meters: number): string {
  if (meters < 1000) return `${Math.max(1, Math.round(meters / 100)) * 100}m`;
  return `${(Math.round(meters / 100) / 10).toFixed(1)}km`;
}

function hoursLabel(item: ShelterItem): string | null {
  const allDay = item.weekdayOpen === "00:00" && item.weekdayClose === "24:00";
  const hours = allDay
    ? "24시간"
    : item.weekdayOpen && item.weekdayClose
      ? `평일 ${item.weekdayOpen}~${item.weekdayClose}`
      : null;
  // 원본이 토요일+일요일 처럼 더하기로 이어 붙여 옴
  const closed = item.closedDay ? `휴무 ${item.closedDay.replaceAll("+", ", ")}` : null;
  const parts = [hours, closed].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function ShelterRow({ item }: { item: ShelterItem }) {
  const hours = hoursLabel(item);

  return (
    <HStack justify="space-between" align="center" gap="x3">
      <VStack align="flex-start" gap="x1" minWidth="0" flexGrow={1}>
        <HStack align="center" gap="x2" minWidth="0">
          <Text textStyle="t4Bold" color="fg.neutral">
            {item.name}
          </Text>
          <Badge
            label={distanceLabel(item.distanceM)}
            tone={item.kind === "wildlife_center" ? "informative" : "neutral"}
          />
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

export function ReportShelters({ items }: { items: ShelterItem[] }) {
  if (items.length === 0) return null;

  return (
    <SectionCard gap="x3">
      <VStack align="stretch" gap="x1">
        <Text as="h2" textStyle="t4Bold" color="fg.neutral">
          가까운 보호·구조 기관
        </Text>
        <Text textStyle="t3Regular" color="fg.neutralMuted">
          어디에 맡겨야 할지 모르겠다면 여기에 먼저 물어보세요
        </Text>
      </VStack>

      <VStack align="stretch" gap="x3">
        {items.map((item, index) => (
          <VStack key={item.id} align="stretch" gap="x3">
            {index > 0 ? <Divider /> : null}
            <ShelterRow item={item} />
          </VStack>
        ))}
      </VStack>

      <Text textStyle="t2Regular" color="fg.neutralSubtle">
        공공데이터포털 동물보호센터·야생동물구조센터 정보
      </Text>
    </SectionCard>
  );
}
