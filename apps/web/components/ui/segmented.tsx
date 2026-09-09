"use client";

import { SegmentGroup } from "@chakra-ui/react";

// WDS SegmentedControl 자리. 값이 항상 있어야 하는 단일 선택 입력
// 선택지가 4개까지라 가로로 꽉 채워 손가락으로 누르기 쉽게 둠

export type SegmentedOption = {
  value: string;
  label: string;
};

export type SegmentedProps = {
  value: string;
  options: readonly SegmentedOption[];
  onValueChange: (value: string) => void;
  "aria-label"?: string;
};

export function Segmented({
  value,
  options,
  onValueChange,
  ...rest
}: SegmentedProps) {
  return (
    <SegmentGroup.Root
      value={value}
      width="100%"
      onValueChange={(details) => {
        // 같은 항목을 다시 누르면 null 이 와 값이 비는 것을 막음
        if (details.value) onValueChange(details.value);
      }}
      {...rest}
    >
      <SegmentGroup.Indicator />
      {options.map((option) => (
        <SegmentGroup.Item
          key={option.value}
          value={option.value}
          flex="1"
          justifyContent="center"
        >
          <SegmentGroup.ItemText>{option.label}</SegmentGroup.ItemText>
          <SegmentGroup.ItemHiddenInput />
        </SegmentGroup.Item>
      ))}
    </SegmentGroup.Root>
  );
}
