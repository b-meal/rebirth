import { Text, VStack } from "@seed-design/react";

import { SectionCard } from "@/components/ui/screen";
import { ShelterList, type ShelterItem } from "@/components/shelters/shelter-row";

// 제보 상세에 붙는 보호, 구조 기관 안내. 행 모양은 찾기 화면과 같은 것을 씀

export type { ShelterItem };

export function ReportShelters({ items }: { items: ShelterItem[] }) {
  if (items.length === 0) return null;

  return (
    <SectionCard gap="x3">
      <VStack align="stretch" gap="x1">
        <Text as="h2" textStyle="t4Bold" color="fg.neutral">
          가까운 보호, 구조 기관
        </Text>
        <Text textStyle="t3Regular" color="fg.neutralMuted">
          어디에 맡겨야 할지 모르겠다면 여기에 먼저 물어보세요
        </Text>
      </VStack>

      <ShelterList items={items} />

      <Text textStyle="t2Regular" color="fg.neutralSubtle">
        공공데이터포털 동물보호센터, 야생동물구조센터 정보
      </Text>
    </SectionCard>
  );
}
