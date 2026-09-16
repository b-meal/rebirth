import { HStack, Text, VStack, type VStackProps } from "@seed-design/react";
import type { ReactNode } from "react";

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

/** 카드로 끊어 읽는 절, 바탕이 basement 인 화면에서만 면이 구분됨 */
export function SectionCard({ gap = "x3", ...props }: VStackProps) {
  return (
    <VStack
      as="section"
      align="stretch"
      gap={gap}
      px="spacingX.globalGutter"
      py="x4"
      bg="bg.layerDefault"
      {...props}
    />
  );
}

/** 절의 제목 한 줄. 카드 안에서 내용과 같은 들여쓰기를 유지함 */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Text as="h2" textStyle="t4Bold" color="fg.neutral">
      {children}
    </Text>
  );
}

/** 라벨과 값을 한 줄에 둔 특징 행, 글 안에 섞지 않고 대조하기 쉽게 나눔 */
export function FeatureRow({ label, value }: { label: string; value: string }) {
  return (
    <HStack justify="space-between" align="flex-start" gap="x4">
      <Text textStyle="t4Regular" color="fg.neutralMuted">
        {label}
      </Text>
      <VStack align="flex-end" minWidth="0">
        <Text textStyle="t4Regular" color="fg.neutral">
          {value}
        </Text>
      </VStack>
    </HStack>
  );
}
