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

import { ANIMAL_LABEL, CARE_LABEL, SIZE_LABEL, breedLabel } from "@/lib/report-label";
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
  careSituation: string;
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
  const careIcon = CARE_ICON[careSituation as keyof typeof CARE_ICON] ?? CARE_ICON.unknown;

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
      <Badge
        label={CARE_LABEL[careSituation] ?? "확인 중"}
        tone={careSituation === "in_care" ? "informative" : "brand"}
        icon={careIcon}
      />
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
