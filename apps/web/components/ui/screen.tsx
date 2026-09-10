import { VStack, type VStackProps } from "@seed-design/react";

// 화면 배치 프리미티브, 여백은 SEED 토큰만 쓰고 화면마다 다시 적지 않는 기준

/** 화면 루트, 세로 플렉스에 최소 한 화면 높이 */
export function Screen(props: VStackProps) {
  return <VStack minHeight="100dvh" align="stretch" bg="bg.layerDefault" {...props} />;
}

/** 좌우 화면 여백을 가진 본문, 블록 사이 간격은 componentDefault */
export function ScreenBody({ gap = "spacingY.componentDefault", ...props }: VStackProps) {
  return (
    <VStack
      grow={1}
      align="stretch"
      minWidth="0"
      px="spacingX.globalGutter"
      py="x5"
      pb="spacingY.screenBottom"
      gap={gap}
      {...props}
    />
  );
}

/** 제목 있는 묶음 하나, 제목과 내용 사이 간격 고정 */
export function Section({ gap = "x3", ...props }: VStackProps) {
  return <VStack as="section" align="stretch" gap={gap} {...props} />;
}
