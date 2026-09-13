"use client";

// design-system-allow:color,raw-element 털 색 자체가 값이라 역할 토큰으로 부를 수 없고, 원 모양 선택은 SEED 에 없어 숨은 체크박스로 직접 만듦

import { Box, Grid, Icon, Text, VStack } from "@seed-design/react";
import { IconCheckmarkFill } from "@karrotmarket/react-monochrome-icon";

// 털색 고르는 줄. 칩으로 두면 글자만 남아 색이 한눈에 들어오지 않음

export type CoatColor = {
  label: string;
  /** 동그라미에 칠할 값. 두 가지가 섞인 털은 그라디언트로 나눔 */
  swatch: string;
  /** 그 위에 얹는 체크 색. 밝은 면에는 어둡게, 어두운 면에는 밝게 */
  on: string;
};

/**
 * 제보와 실종 신고, 우리 동물이 같은 목록을 씀
 * 세 화면이 각자 배열을 들면 한쪽만 늘었을 때 같은 털이 다른 이름으로 저장됨
 */
export const COAT_COLORS: CoatColor[] = [
  { label: "흰색", swatch: "#ffffff", on: "#1a1a1a" },
  { label: "검정색", swatch: "#2b2b2b", on: "#ffffff" },
  { label: "갈색", swatch: "#8b5e3c", on: "#ffffff" },
  { label: "노란색", swatch: "#e3b23c", on: "#1a1a1a" },
  { label: "회색", swatch: "#9ba1a6", on: "#1a1a1a" },
  { label: "베이지", swatch: "#e6d5b8", on: "#1a1a1a" },
  {
    label: "얼룩",
    swatch: "linear-gradient(135deg, #ffffff 0 50%, #8b5e3c 50% 100%)",
    on: "#1a1a1a",
  },
  {
    label: "삼색",
    swatch:
      "conic-gradient(#ffffff 0 120deg, #2b2b2b 120deg 240deg, #8b5e3c 240deg 360deg)",
    on: "#ffffff",
  },
];

/** 동그라미 지름. 손가락이 닿는 최소 크기를 지킴 */
const SWATCH = "44px";

export type CoatColorPickerProps = {
  /** 폼이 값을 실어 보낼 때 쓰는 이름. 통제하지 않을 때만 씀 */
  name?: string;
  /** 통제 컴포넌트로 쓸 때의 현재 값 */
  value?: string[];
  onChange?: (next: string[]) => void;
  /** 통제하지 않을 때 처음 골라 둘 값 */
  defaultValue?: string[];
  /** 서버 상한과 같은 최대 개수 */
  max?: number;
};

export function CoatColorPicker({
  name,
  value,
  onChange,
  defaultValue,
  max = 5,
}: CoatColorPickerProps) {
  const controlled = value !== undefined;

  const toggle = (label: string) => {
    if (!value || !onChange) return;
    onChange(
      value.includes(label)
        ? value.filter((item) => item !== label)
        : [...value, label].slice(0, max),
    );
  };

  return (
    <Grid columns={4} gap="x3">
      {COAT_COLORS.map((color) => (
        <VStack key={color.label} asChild align="center" gap="x1_5">
          <label>
            <input
              type="checkbox"
              className="rebirth-visually-hidden rebirth-swatch-input"
              {...(controlled
                ? { checked: value.includes(color.label), onChange: () => toggle(color.label) }
                : {
                    name,
                    value: color.label,
                    defaultChecked: defaultValue?.includes(color.label),
                  })}
            />
            <Box
              className="rebirth-swatch"
              width={SWATCH}
              height={SWATCH}
              borderRadius="full"
              borderWidth={1}
              borderColor="stroke.neutralMuted"
              // 그라디언트는 기본이 안쪽 상자 기준이라 테두리 폭만큼 한 번 더 깔려 가장자리가 어긋남
              style={{ background: color.swatch, backgroundOrigin: "border-box" }}
            >
              <VStack
                className="rebirth-swatch-check"
                align="center"
                justify="center"
                height="full"
              >
                <Icon svg={<IconCheckmarkFill />} size="x5" color={color.on} />
              </VStack>
            </Box>
            <Text
              className="rebirth-swatch-label"
              textStyle="t2Regular"
              color="fg.neutralMuted"
              maxLines={1}
            >
              {color.label}
            </Text>
          </label>
        </VStack>
      ))}
    </Grid>
  );
}
