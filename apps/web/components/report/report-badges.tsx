import { HStack } from "@seed-design/react";
import {
  IconArrowLeftBracketRightFill,
  IconCheckmarkShieldFill,
  IconExclamationmarkCircleFill,
  IconFigureWalkFill,
  IconPawprintFill,
  IconSparkle2Fill,
} from "@karrotmarket/react-monochrome-icon";
import type { AnimalType } from "@rebirth/types";

import { ANIMAL_LABEL, SIZE_LABEL, STATUS_LABEL, breedLabel } from "@/lib/report-label";
import { Badge } from "@/components/ui/badge";

// 상세와 지도 말풍선이 같은 뱃지 묶음을 쓰게 모아 둠

const CARE_ICON = {
  roaming: <IconFigureWalkFill />,
  in_care: <IconCheckmarkShieldFill />,
  unknown: <IconPawprintFill />,
} as const;

export type ReportBadgesProps = {
  animalType: AnimalType;
  breedGuess: string | null;
  size: string;
  /** 보호 상황. 실종 신고는 이 값을 쓰지 않아 비우면 배지를 빼고 그림 */
  careSituation?: string | null;
  injury: boolean | null;
};

export function ReportBadges({
  animalType,
  breedGuess,
  size,
  careSituation,
  injury,
}: ReportBadgesProps) {
  const breed = breedLabel(breedGuess);
  const sizeLabel = SIZE_LABEL[size];
  const careIcon =
    CARE_ICON[(careSituation ?? "unknown") as keyof typeof CARE_ICON] ?? CARE_ICON.unknown;
  // unknown 은 빈 문자열이라 배지를 아예 빼고 그림
  const careLabel = careSituation ? (STATUS_LABEL[careSituation] ?? "") : "";

  return (
    <HStack gap="x1_5" wrap>
      <Badge
        label={ANIMAL_LABEL[animalType] ?? "확인 어려움"}
        tone="neutral"
        icon={<IconPawprintFill />}
      />
      {breed ? <Badge label={breed} tone="neutral" icon={<IconSparkle2Fill />} /> : null}
      {sizeLabel ? (
        <Badge label={sizeLabel} tone="neutral" icon={<IconArrowLeftBracketRightFill />} />
      ) : null}
      {careLabel ? (
        <Badge
          label={careLabel}
          tone={careSituation === "in_care" ? "informative" : "brand"}
          icon={careIcon}
        />
      ) : null}
      {injury === true ? (
        <Badge
          label="다친 것으로 보임"
          tone="critical"
          icon={<IconExclamationmarkCircleFill />}
        />
      ) : null}
    </HStack>
  );
}
