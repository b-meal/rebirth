import type { ReactNode } from "react";
import { Box, Flex, Text, type FlexProps } from "@chakra-ui/react";

// 묶음 제목 한 줄, 오른쪽에 더보기 같은 짧은 동작 하나만 허용

export type SectionHeaderProps = Omit<FlexProps, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  /** 제목 옆 개수 */
  count?: number;
  action?: ReactNode;
};

export function SectionHeader({ title, description, count, action, ...rest }: SectionHeaderProps) {
  return (
    <Flex justify="space-between" align="flex-end" gap="3" {...rest}>
      <Box minWidth="0">
        <Text as="h2" textStyle="title3">
          {title}
          {typeof count === "number" ? (
            <Text as="span" color="fg.assistive" fontWeight="medium" marginInlineStart="1.5">
              {count}
            </Text>
          ) : null}
        </Text>
        {description ? (
          <Text textStyle="bodySm" color="fg.alternative" marginTop="0.5">
            {description}
          </Text>
        ) : null}
      </Box>
      {action ? <Box flexShrink={0}>{action}</Box> : null}
    </Flex>
  );
}
