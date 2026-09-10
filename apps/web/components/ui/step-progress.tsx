import { Flex, Progress, Text } from "@chakra-ui/react";

// 여러 단계 폼의 진행 표시, 가는 막대와 현재 단계 문구 한 줄

export type StepProgressProps = {
  current: number;
  total: number;
  /** 현재 단계 이름 */
  label?: string;
};

export function StepProgress({ current, total, label }: StepProgressProps) {
  return (
    <Flex direction="column" gap="2">
      <Progress.Root
        value={(current / total) * 100}
        colorPalette="brand"
        size="sm"
        aria-label={`${total}단계 중 ${current}단계`}
      >
        <Progress.Track borderRadius="full">
          <Progress.Range />
        </Progress.Track>
      </Progress.Root>
      <Text textStyle="bodySm" color="fg.alternative">
        {current} / {total}
        {label ? ` · ${label}` : ""}
      </Text>
    </Flex>
  );
}
