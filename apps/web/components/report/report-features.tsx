import type { AnimalType } from "@rebirth/types";
import { VStack } from "@seed-design/react";

import { ANIMAL_LABEL, SIZE_LABEL, breedLabel, triStateLabel } from "@/lib/report-label";
import { FeatureRow, SectionCard, SectionTitle } from "@/components/ui/screen";

// 관찰값을 라벨과 값으로 나란히 세운 절
// 발견 제보와 실종 신고가 같은 항목을 같은 차례로 보여야 두 기록을 견줄 수 있음

export type ReportFeatureItem = {
  animalType: AnimalType;
  breedGuess: string | null;
  size: string;
  colors: string[];
  collar: boolean | null;
  injury: boolean | null;
  earTip: boolean | null;
  conditionTags: string[];
};

export type ReportFeaturesProps = {
  report: ReportFeatureItem;
  /**
   * 품종 표기를 덮어씀
   * 보호자가 적어 둔 값은 AI 추정이 아니라 아는 값이라 계열 추정을 붙이지 않음
   */
  breedText?: string | null;
  /**
   * 값이 없는 행을 감춤
   * 발견 제보에서 모름은 발견자가 못 봤다는 정보지만
   * 보호자 신고에서는 묻지 않은 칸이라 확인 어려움 만 늘어남
   */
  hideEmpty?: boolean;
};

export function ReportFeatures({ report, breedText, hideEmpty }: ReportFeaturesProps) {
  const breed = breedText ?? breedLabel(report.breedGuess);
  const size = SIZE_LABEL[report.size];
  const animal = report.animalType === "unknown" ? null : ANIMAL_LABEL[report.animalType];

  // 감추는 모드에서는 값이 있는 행만 세움. 한 줄도 안 남으면 절 자체를 빼 빈 카드를 만들지 않음
  const rows: { label: string; value: string }[] = [];
  const push = (label: string, value: string | null, empty: boolean) => {
    if (hideEmpty && empty) return;
    rows.push({ label, value: value || "확인 어려움" });
  };

  push("종류", animal, !animal);
  push("품종", breed, !breed);
  push("크기", size, !size);
  push("털색", report.colors.join(", "), report.colors.length === 0);
  push("목줄", triStateLabel(report.collar, "있음", "없음"), report.collar === null);
  push(
    "부상",
    triStateLabel(report.injury, "있어 보임", "보이지 않음"),
    report.injury === null,
  );
  if (report.earTip !== null) {
    rows.push({ label: "귀 끝", value: triStateLabel(report.earTip, "절단됨", "그대로") });
  }
  if (report.conditionTags.length > 0) {
    rows.push({ label: "상태", value: report.conditionTags.join(", ") });
  }

  if (rows.length === 0) return null;

  return (
    <SectionCard gap="x2_5">
      <SectionTitle>특징</SectionTitle>
      <VStack align="stretch" gap="x2">
        {rows.map((row) => (
          <FeatureRow key={row.label} label={row.label} value={row.value} />
        ))}
      </VStack>
    </SectionCard>
  );
}
