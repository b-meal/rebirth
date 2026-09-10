import { Fragment, type ReactNode } from "react";
import { Box, Flex, Text, Theme } from "@chakra-ui/react";

// 카탈로그 한 절과 그 안의 예시 상자, 모든 절이 같은 간격과 틀을 갖게 하는 래퍼

export type SpecProps = {
  /** registry 의 section id 와 일치, 칩 내비게이션 anchor */
  id: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
};

export function Spec({ id, title, description, children }: SpecProps) {
  return (
    <Flex
      as="section"
      id={id}
      data-spec
      direction="column"
      gap="5"
      paddingBlock="section"
      borderBottomWidth="1px"
      borderColor="border.muted"
      scrollMarginTop={{ base: "calc(var(--chakra-sizes-appBar) + 56px)", lg: "appBar" }}
      _last={{ borderBottomWidth: "0" }}
    >
      <Flex direction="column" gap="1.5">
        <Text as="h2" data-spec-title textStyle="title2">
          {title}
        </Text>
        {description ? (
          <Text textStyle="bodySm" color="fg.alternative">
            {description}
          </Text>
        ) : null}
      </Flex>
      {children}
    </Flex>
  );
}

export type DemoVariant = "stack" | "row" | "screen" | "bare";

export type DemoProps = {
  label?: ReactNode;
  /** 예시 아래 붙는 한 줄 설명 */
  note?: ReactNode;
  /** stack 세로 나열, row 가로 나열, screen 은 여백 없는 화면 조각, bare 는 틀 없음 */
  variant?: DemoVariant;
  /** 높이가 다른 것을 나열할 때 row 의 세로 가운데 정렬을 끔 */
  align?: "center" | "start" | "stretch";
  children: ReactNode;
};

export function Demo({ label, note, variant = "stack", align, children }: DemoProps) {
  const framed = variant !== "bare";
  return (
    <Flex direction="column" gap="2">
      {label ? (
        <Text textStyle="label" color="fg.alternative">
          {label}
        </Text>
      ) : null}
      <Flex
        direction={variant === "row" ? "row" : "column"}
        wrap={variant === "row" ? "wrap" : undefined}
        align={align ?? (variant === "row" ? "center" : "stretch")}
        gap={variant === "row" ? "2" : "3"}
        padding={variant === "screen" || !framed ? "0" : "4"}
        borderWidth={framed ? "1px" : "0"}
        borderColor="border.muted"
        borderRadius={framed ? "card" : undefined}
        backgroundColor={variant === "screen" ? "bg.canvas" : framed ? "bg.panel" : undefined}
        overflow={variant === "screen" ? "hidden" : undefined}
        // 데스크톱에서도 컴포넌트를 실제 모바일 폭으로 그려 줄바꿈을 같게 유지
        width="100%"
        maxWidth="frame"
        minWidth="0"
      >
        {children}
      </Flex>
      {note ? (
        <Text textStyle="caption" color="fg.assistive">
          {note}
        </Text>
      ) : null}
    </Flex>
  );
}

/** import 경로나 호출 형태 한두 줄 */
export function Usage({ code }: { code: string }) {
  return (
    <Box
      as="pre"
      textStyle="caption"
      fontFamily="mono"
      color="fg.alternative"
      backgroundColor="bg.subtle"
      borderRadius="control"
      paddingInline="3"
      paddingBlock="2.5"
      overflowX="auto"
      whiteSpace="pre"
      maxWidth="640px"
    >
      {code}
    </Box>
  );
}

/** 토큰 이름과 값처럼 짝을 이루는 정보를 한 줄로 */
export function TokenRow({
  name,
  value,
  preview,
}: {
  name: string;
  value?: string;
  preview?: ReactNode;
}) {
  return (
    <Flex align="center" gap="3" minHeight="10">
      {preview ? <Box flexShrink={0}>{preview}</Box> : null}
      <Text textStyle="label" flex="1" minWidth="0" truncate>
        {name}
      </Text>
      {value ? (
        <Text textStyle="caption" fontFamily="mono" color="fg.assistive" flexShrink={0}>
          {value}
        </Text>
      ) : null}
    </Flex>
  );
}

/** 값으로 확인할 수 있는 명세를 라벨과 값 두 열로 나열 */
export function SpecTable({ rows }: { rows: [label: string, value: ReactNode][] }) {
  return (
    <Box
      display="grid"
      // min 안에는 max-content 를 못 넣어 폭 제한은 라벨 칸 maxWidth 로 처리
      gridTemplateColumns="auto 1fr"
      borderWidth="1px"
      borderColor="border.muted"
      borderRadius="control"
      overflow="hidden"
      backgroundColor="bg.panel"
      maxWidth="640px"
    >
      {rows.map(([label, value], index) => {
        const last = index === rows.length - 1;
        return (
          <Fragment key={label}>
            <Box
              maxWidth="140px"
              paddingInline="3"
              paddingBlock="2.5"
              backgroundColor="bg.subtle"
              borderBottomWidth={last ? "0" : "1px"}
              borderColor="border.muted"
              textStyle="caption"
              color="fg.assistive"
              wordBreak="keep-all"
            >
              {label}
            </Box>
            <Box
              minWidth="0"
              paddingInline="3"
              paddingBlock="2.5"
              borderBottomWidth={last ? "0" : "1px"}
              borderColor="border.muted"
              textStyle="caption"
              wordBreak="keep-all"
            >
              {value}
            </Box>
          </Fragment>
        );
      })}
    </Box>
  );
}

/** 라이트와 다크를 위아래로 놓고 같은 것을 두 테마에서 비교 */
export function ThemeStage({ children }: { children: ReactNode }) {
  return (
    <Flex direction="column" gap="2">
      {(["light", "dark"] as const).map((appearance) => (
        <Theme
          key={appearance}
          appearance={appearance}
          hasBackground={false}
          // Theme 이 colorPalette 를 gray 로 되돌려 브랜드 색을 다시 지정
          colorPalette="brand"
          position="relative"
          backgroundColor="bg.canvas"
          color="fg.default"
          borderWidth="1px"
          borderColor="border.muted"
          borderRadius="card"
          width="100%"
          maxWidth="frame"
          padding="4"
          paddingTop="7"
          display="flex"
          flexWrap="wrap"
          alignItems="center"
          gap="2"
        >
          <Text
            position="absolute"
            top="2"
            insetStart="4"
            textStyle="overline"
            color="fg.assistive"
          >
            {appearance}
          </Text>
          {children}
        </Theme>
      ))}
    </Flex>
  );
}

/** 인라인 토큰 이름이나 짧은 코드 조각 */
export function Token({ children }: { children: ReactNode }) {
  return (
    <Box
      as="code"
      fontFamily="mono"
      fontSize="0.92em"
      backgroundColor="bg.subtle"
      borderRadius="xs"
      paddingInline="1"
      paddingBlock="0.5"
    >
      {children}
    </Box>
  );
}
