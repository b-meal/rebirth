import { Box, Flex, type BoxProps, type FlexProps } from "@chakra-ui/react";

// 화면 배치 프리미티브, 여백 값을 화면 쪽에 적지 않고 여기서 한 번만 정함

/**
 * 오버레이를 폰 폭 안에 가두는 props. Positioner 의 inset 은
 * 레시피의 width 100% 와 겹쳐 무시되므로 Content 의 폭을 제한함
 */
export const FRAME_OVERLAY = {
  width: "100%",
  maxWidth: "frame",
  marginInline: "auto",
} as const;

/**
 * 가장자리에 붙는 오버레이용 Positioner props. 절대 배치라 margin auto 가 먹지 않아
 * 시작 위치를 직접 계산하고 폭을 프레임으로 제한함
 */
export const FRAME_COLUMN = {
  width: "min(100%, var(--chakra-sizes-frame))",
  insetInlineStart: "max(0px, calc(50% - var(--chakra-sizes-frame) / 2))",
} as const;

/** 화면 루트, 세로 플렉스에 최소 한 화면 높이 */
export function Screen(props: FlexProps) {
  return (
    <Flex
      direction="column"
      minHeight="100dvh"
      position="relative"
      backgroundColor="bg.canvas"
      {...props}
    />
  );
}

/** 좌우 화면 여백을 가진 본문, 블록 사이 간격은 block 토큰 */
export function ScreenBody({ gap = "block", ...props }: FlexProps) {
  return (
    <Flex
      direction="column"
      flex="1"
      minWidth="0"
      paddingInline="screen"
      paddingBlock="block"
      gap={gap}
      {...props}
    />
  );
}

/** 제목 있는 묶음 하나, 제목과 내용 사이 간격 고정 */
export function Section({ gap = "3", ...props }: FlexProps) {
  return <Flex as="section" direction="column" gap={gap} {...props} />;
}

export type ScrollRowProps = FlexProps & {
  /** 부모에 screen 여백이 없으면 false 로 두어 음수 여백을 끔 */
  bleed?: boolean;
};

/** 화면 여백 밖까지 가로로 넘기는 행, 칩과 카드 나열용 */
export function ScrollRow({ gap = "inline", bleed = true, ...props }: ScrollRowProps) {
  return (
    <Flex
      gap={gap}
      overflowX="auto"
      paddingInline={bleed ? "screen" : "0"}
      marginInline={bleed ? "calc(var(--chakra-spacing-screen) * -1)" : "0"}
      scrollbarWidth="none"
      css={{ "&::-webkit-scrollbar": { display: "none" }, "& > *": { flexShrink: 0 } }}
      {...props}
    />
  );
}

/** 좌우 화면 여백을 무시하고 가장자리까지 채우는 블록 */
export function Bleed(props: BoxProps) {
  return <Box marginInline="calc(var(--chakra-spacing-screen) * -1)" {...props} />;
}
