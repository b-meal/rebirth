import Link from "next/link";
import { HStack, Text, VStack } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";
import { ResultSection } from "seed-design/ui/result-section";

import { ScreenBody } from "@/components/ui/screen";
import { ANIMAL_LABEL, SIZE_LABEL, formatAbsolute } from "@/lib/report-label";

// 발견 제보 하나를 내 실종 신고들과 견준 결과
// 점수는 유사도일 뿐이라 확정 아님 을 항상 함께 냄. 어느 쪽이 내 아이인지 정하는 일은 보호자가 함

export type SightingMatchItem = {
  lostId: string;
  petName: string | null;
  animalType: "dog" | "cat" | "other" | "unknown";
  size: "small" | "medium" | "large" | "unknown";
  areaName: string | null;
  occurredAt: string;
  score: number;
  reason: string;
};

export type SightingMatchListProps = {
  /** 돌아갈 발견 제보 */
  reportId: string;
  items: SightingMatchItem[];
};

/** 이름을 적어 둔 신고는 이름으로 부름. 없으면 종과 크기로만 부르고 품종은 단정하지 않음 */
function lostLabel(item: SightingMatchItem): string {
  if (item.petName) return item.petName;
  return [ANIMAL_LABEL[item.animalType], SIZE_LABEL[item.size]].filter(Boolean).join(", ");
}

export function SightingMatchList({ reportId, items }: SightingMatchListProps) {
  return (
    <>
      <ScreenBody gap="x4">
        {items.length === 0 ? (
          <ResultSection
            size="medium"
            title="견줄 수 있는 신고가 없어요"
            description="찾는 중인 신고와 종이 달라요. 다른 신고를 쓰면 여기에 나와요"
          />
        ) : (
          <>
            {/* 무엇과 무엇을 견줬는지 먼저 밝힘
                점수만 늘어놓으면 어느 쪽이 기준인지 몰라 숫자를 거꾸로 읽음 */}
            <Text textStyle="t4Regular" color="fg.neutralMuted">
              이 제보를 찾는 중인 내 신고 {items.length}건과 견줬어요
            </Text>

            <VStack align="stretch" gap="x3">
              {items.map((item) => (
                <VStack
                  key={item.lostId}
                  align="stretch"
                  gap="x1_5"
                  px="x4"
                  py="x3"
                  borderRadius="r3"
                  bg="bg.neutralWeak"
                >
                  {/* 점수는 이름 옆에 두되 확정 아님 을 같은 줄에 붙여 둠
                      떼어 놓으면 숫자만 읽히고 그 값으로 결론이 난 것처럼 보임 */}
                  <HStack justify="space-between" align="center" gap="x2">
                    <Text textStyle="t5Bold" color="fg.neutral">
                      {lostLabel(item)} 신고와 {item.score}점
                    </Text>
                    <Text textStyle="t2Regular" color="fg.neutralSubtle">
                      확정 아님
                    </Text>
                  </HStack>

                  <Text textStyle="t3Regular" color="fg.neutralMuted">
                    {item.reason}
                  </Text>

                  {/* 내 신고가 언제 어디서 난 것인지. 같은 이름의 신고가 여럿일 때 가름 */}
                  <Text textStyle="t2Regular" color="fg.neutralSubtle">
                    {[item.areaName ?? "위치 미확인", formatAbsolute(item.occurredAt)].join(
                      ", ",
                    )}{" "}
                    신고
                  </Text>
                </VStack>
              ))}
            </VStack>
          </>
        )}
      </ScreenBody>

      {/* 이 화면에서 할 일은 제보를 다시 들여다보는 것 하나뿐임
          점수를 보고 나서 사진과 특징을 다시 보러 가는 길을 늘 같은 자리에 둠 */}
      <VStack
        align="stretch"
        position="sticky"
        bottom="0"
        px="spacingX.globalGutter"
        pt="x3"
        bg="bg.layerDefault"
        className="rebirth-bottom-bar"
      >
        <ActionButton variant="brandSolid" size="large" asChild>
          <Link href={`/r/${reportId}`}>제보 다시 보기</Link>
        </ActionButton>
      </VStack>
    </>
  );
}
