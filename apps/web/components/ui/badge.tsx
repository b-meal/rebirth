import type { ReactNode } from "react";
import { HStack, Icon, Text } from "@seed-design/react";

// SEED 레지스트리에 뱃지가 없고 TagGroup 은 점으로 잇는 글자라 면이 없어 앱 껍데기로 둠

const TONE = {
  brand: { bg: "bg.brandWeak", fg: "fg.brand" },
  neutral: { bg: "bg.neutralWeak", fg: "fg.neutralMuted" },
  critical: { bg: "bg.criticalWeak", fg: "fg.critical" },
  informative: { bg: "bg.informativeWeak", fg: "fg.informative" },
} as const;

export type BadgeTone = keyof typeof TONE;

export type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  icon?: ReactNode;
};

export function Badge({ label, tone = "neutral", icon }: BadgeProps) {
  const { bg, fg } = TONE[tone];

  return (
    <HStack align="center" gap="x1" px="x2" py="x1" borderRadius="full" bg={bg}>
      {icon ? <Icon svg={icon} size="x3_5" color={fg} /> : null}
      <Text textStyle="t2Bold" color={fg}>
        {label}
      </Text>
    </HStack>
  );
}
