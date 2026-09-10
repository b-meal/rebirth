import { Box, Flex, type FlexProps } from "@chakra-ui/react";

// 캐러셀과 온보딩의 현재 장 표시, 활성 점은 알약으로 늘어남

export type PageIndicatorProps = Omit<FlexProps, "onSelect"> & {
  count: number;
  index: number;
  onSelect?: (index: number) => void;
};

export function PageIndicator({ count, index, onSelect, ...rest }: PageIndicatorProps) {
  return (
    <Flex
      role="tablist"
      aria-label="페이지"
      justify="center"
      align="center"
      gap="1.5"
      {...rest}
    >
      {Array.from({ length: count }, (_, i) => {
        const active = i === index;
        const dot = {
          width: active ? "20px" : "6px",
          height: "6px",
          borderRadius: "full",
          backgroundColor: active ? "brand.solid" : "border.emphasized",
          transition: "width 0.2s, background-color 0.2s",
        } as const;

        if (!onSelect) {
          return <Box key={i} as="span" role="tab" aria-selected={active} {...dot} />;
        }
        return (
          <Box key={i} asChild {...dot} cursor="pointer">
            <button
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={`${i + 1} 페이지`}
              onClick={() => onSelect(i)}
            />
          </Box>
        );
      })}
    </Flex>
  );
}
