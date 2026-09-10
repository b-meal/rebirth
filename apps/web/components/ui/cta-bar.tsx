import type { ReactNode } from "react";
import { Box, Flex, Text, type BoxProps } from "@chakra-ui/react";

// 화면 하단에 붙는 행동 버튼 영역, 버튼은 같은 폭으로 나뉘고 안전 영역만큼 아래를 띄움

export type CtaBarProps = Omit<BoxProps, "children"> & {
  children: ReactNode;
  /** 버튼 위에 놓는 짧은 안내 문구 */
  helper?: ReactNode;
  sticky?: boolean;
  /** 위쪽 흐림 대신 경계선으로 구분 */
  divider?: boolean;
};

export function CtaBar({ children, helper, sticky = true, divider = false, ...rest }: CtaBarProps) {
  return (
    <Box
      position={sticky ? "sticky" : "relative"}
      bottom="0"
      zIndex="docked"
      marginTop="auto"
      backgroundColor="bg.canvas"
      paddingBottom="safeBottom"
      borderTopWidth={divider ? "1px" : "0"}
      borderColor="border.muted"
      _before={
        divider
          ? undefined
          : {
              content: '""',
              position: "absolute",
              insetInline: 0,
              top: "-16px",
              height: "16px",
              bgGradient: "to-t",
              gradientFrom: "bg.canvas",
              gradientTo: "transparent",
              pointerEvents: "none",
            }
      }
      {...rest}
    >
      <Flex direction="column" gap="2" paddingInline="screen" paddingBlock="3">
        {helper ? (
          <Text textStyle="caption" color="fg.alternative" textAlign="center">
            {helper}
          </Text>
        ) : null}
        <Flex gap="2" css={{ "& > *": { flex: 1 } }}>
          {children}
        </Flex>
      </Flex>
    </Box>
  );
}
