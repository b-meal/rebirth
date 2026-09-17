import type { ReactNode } from "react";
import { HStack, Icon, Text } from "@seed-design/react";

// SEED 레지스트리에 뱃지가 없고 TagGroup 은 점으로 잇는 글자라 면이 없어 앱 껍데기로 둠

const TONE = {
  brand: { bg: "bg.brandWeak", fg: "fg.brand", stroke: "stroke.brandWeak" },
  neutral: { bg: "bg.neutralWeak", fg: "fg.neutralMuted", stroke: "stroke.neutralMuted" },
  critical: { bg: "bg.criticalWeak", fg: "fg.critical", stroke: "stroke.criticalWeak" },
  informative: {
    bg: "bg.informativeWeak",
    fg: "fg.informative",
    stroke: "stroke.informativeWeak",
  },
} as const;

export type BadgeTone = keyof typeof TONE;

export type BadgeProps = {
  label: string;
  /** 값이 무엇을 말하는지. 값만으로 알 수 없는 항목에만 붙임 */
  name?: string;
  tone?: BadgeTone;
  icon?: ReactNode;
};

export function Badge({ label, name, tone = "neutral", icon }: BadgeProps) {
  const { bg, fg, stroke } = TONE[tone];

  return (
    <HStack
      align="center"
      gap="x1"
      pl={icon ? "x1_5" : "x2"}
      pr="x2"
      py="x1"
      borderRadius="full"
      borderWidth={1}
      borderColor={stroke}
      bg={bg}
    >
      {icon ? <Icon svg={icon} size="x3_5" color={fg} /> : null}
      {name ? (
        <Text textStyle="t2Regular" color={fg}>
          {name}
        </Text>
      ) : null}
      <Text textStyle="t2Bold" color={fg}>
        {label}
      </Text>
    </HStack>
  );
}
