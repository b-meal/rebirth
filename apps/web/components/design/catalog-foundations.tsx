"use client";

import { useState } from "react";
import { Box, Button, Flex, Grid, Image, List, SimpleGrid, Text } from "@chakra-ui/react";

import { Chip } from "@/components/ui/chip";
import { Icon, ICON_NAMES, type IconName } from "@/components/ui/icons";
import { POINT } from "@/lib/theme";

import { CATEGORIES } from "./registry";
import { Demo, Spec, SpecTable, ThemeStage, TokenRow, Usage } from "./spec";

// Foundations 분류, lib/theme.ts 의 토큰 값을 눈으로 확인하는 절 모음

const PRINCIPLES: [icon: IconName, title: string, rule: string][] = [
  ["grid", "390px 프레임", "모바일 전용 한 벌만 설계하고 데스크톱에서는 같은 폭을 가운데에 가둡니다"],
  ["star", "포인트 색 단일 원천", "POINT 하나가 brand 단계와 틴트 회색과 배경을 모두 파생합니다"],
  ["sliders", "44px 터치", "누르는 요소는 아이콘만 있어도 높이 44px 이상을 확보합니다"],
  ["list", "네 단계 여백", "screen 20, section 32, block 16, inline 8 밖의 값은 쓰지 않습니다"],
  ["edit", "Pretendard 단일 서체", "굵기만 바꿔 위계를 만들고 숫자는 tabular 로 자리를 맞춥니다"],
  ["moon", "라이트와 다크", "색을 semantic token 으로만 불러 두 테마가 함께 따라옵니다"],
  ["copy", "세 단계 모서리", "control 12, card 16, sheet 24 로 요소의 크기와 무게를 나눕니다"],
];

const HUE_HINTS: [string, number][] = [
  ["노란색", 92],
  ["살구", 60],
  ["민트", 165],
  ["라벤더", 300],
];

const PRODUCT_LANGUAGE: [string, string][] = [
  ["유기동물 판별", "발견동물 제보"],
  ["말티즈", "흰색 소형견, 말티즈 계열 추정"],
  ["동일 개체 확정", "확인할 후보"],
  ["AI 진단", "AI 초안, 수정 가능"],
];

const BRAND_STEPS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];

const BRAND_SEMANTIC: [string, string][] = [
  ["brand.solid", "500"],
  ["brand.contrast", "gray.950"],
  ["brand.fg", "800 / 300"],
  ["brand.muted", "100 / 900"],
  ["brand.subtle", "50 / 950"],
  ["brand.emphasized", "200 / 800"],
  ["brand.focusRing", "700 / 400"],
];

const BG_TOKENS: [string, string][] = [
  ["bg.canvas", "화면 바탕"],
  ["bg.panel", "카드 시트 다이얼로그"],
  ["bg.subtle", "입력 상자 코드 배경"],
  ["bg.alternative", "지도 상자 프레임 밖"],
  ["bg.muted", "gray.100 / 800"],
  ["bg.emphasized", "gray.200 / 700"],
  ["bg.inverted", "gray.950 / 50"],
];

const FG_TOKENS: [string, string][] = [
  ["fg.default", "본문과 제목 기본 글자"],
  ["fg.alternative", "보조 설명과 부제"],
  ["fg.assistive", "가장 옅은 안내 문구"],
];

const BORDER_TOKENS = ["border", "border.muted", "border.emphasized"];

const STATUS_PALETTES: [string, string, string][] = [
  ["red", "오류", "위치 권한이 거부되었습니다"],
  ["green", "성공", "제보가 등록되었습니다"],
  ["blue", "안내", "AI 초안, 수정 가능"],
  ["orange", "주의", "사진이 흐려 특징 추출이 어렵습니다"],
];

const TEXT_STYLES: [name: string, spec: string, use: string][] = [
  ["display", "32 / 40 / 700", "완료 화면 큰 숫자"],
  ["title1", "26 / 34 / 700", "화면 제목"],
  ["title2", "22 / 30 / 700", "절 제목"],
  ["title3", "18 / 26 / 600", "카드 제목"],
  ["heading", "16 / 24 / 600", "상단 바 제목"],
  ["body", "16 / 24 / 400", "본문"],
  ["bodyStrong", "16 / 24 / 500", "강조 본문"],
  ["bodySm", "14 / 20 / 400", "보조 설명"],
  ["label", "14 / 20 / 500", "입력 라벨 버튼"],
  ["caption", "12 / 16 / 400", "주석과 시각"],
  ["overline", "11 / 14 / 600", "머리말 태그"],
];

const SPACING_SCALE: [string, string][] = [
  ["1", "4px"],
  ["2", "8px"],
  ["3", "12px"],
  ["4", "16px"],
  ["5", "20px"],
  ["6", "24px"],
  ["8", "32px"],
  ["10", "40px"],
  ["12", "48px"],
];

const SPACING_SEMANTIC: [string, string][] = [
  ["screen", "20px · 화면 좌우 여백"],
  ["section", "32px · 절과 절 사이"],
  ["block", "16px · 블록과 블록 사이"],
  ["inline", "8px · 칩 아이콘 글자 사이"],
  ["safeTop", "env safe-area-inset-top"],
  ["safeBottom", "env safe-area-inset-bottom"],
];

const SIZE_TOKENS: [string, string][] = [
  ["frame", "390px · 모바일 프레임 폭"],
  ["appBar", "56px · 상단 바 높이"],
  ["tabBar", "60px · 하단 탭 바 높이"],
  ["touch", "44px · 최소 터치 영역"],
  ["fab", "56px · 떠 있는 동작 버튼"],
  ["handle", "36px · 시트 손잡이 폭"],
];

const RADII: [string, string][] = [
  ["control", "12px"],
  ["card", "16px"],
  ["sheet", "24px"],
  ["full", "9999px"],
];

const RADII_SPEC: [string, string][] = [
  ["control", "12px · 버튼 입력 칩"],
  ["card", "16px · 카드 예시 상자"],
  ["sheet", "24px · 바텀 시트 상단"],
  ["full", "9999px · 아바타 알약"],
];

const RADII_LEVELS: [string, string][] = [
  ["radii.l1", "md 6px · 배지 태그"],
  ["radii.l2", "control 12px · 버튼 입력"],
  ["radii.l3", "card 16px · 카드 팝오버"],
];

const SHADOWS: [string, string][] = [
  ["raised", "카드"],
  ["float", "FAB 팝오버"],
  ["overlay", "바텀 시트"],
];

const SHADOW_SPEC: [string, string][] = [
  ["raised", "0 1px 2px, 0 4px 12px · 알파 0.06"],
  ["float", "0 6px 20px · 알파 0.14"],
  ["overlay", "0 -8px 32px · 알파 0.14"],
];

const DURATIONS: [string, string][] = [
  ["fastest", "50ms"],
  ["faster", "100ms"],
  ["fast", "150ms"],
  ["moderate", "200ms"],
  ["slow", "300ms"],
  ["slower", "400ms"],
  ["slowest", "500ms"],
];

const EASINGS: [string, string][] = [
  ["ease-in", "0.42, 0, 1, 1"],
  ["ease-out", "0, 0, 0.58, 1"],
  ["ease-in-out", "0.42, 0, 0.58, 1"],
  ["ease-in-smooth", "0.32, 0.72, 0, 1"],
];

const MOTION_SPEEDS = ["fast", "moderate", "slow"] as const;
type MotionSpeed = (typeof MOTION_SPEEDS)[number];

const ICON_SIZES: [number, string][] = [
  [16, "본문 안 인라인"],
  [20, "리스트 보조 표시"],
  [24, "버튼과 탭 기본"],
];

function Swatch({ color, bordered = true }: { color: string; bordered?: boolean }) {
  return (
    <Box
      boxSize="8"
      borderRadius="control"
      backgroundColor={color}
      borderWidth={bordered ? "1px" : "0"}
      borderColor="border.muted"
    />
  );
}

function Rules({ items }: { items: string[] }) {
  return (
    <List.Root as="ol" gap="1" paddingLeft="5" textStyle="bodySm" color="fg.alternative">
      {items.map((item) => (
        <List.Item key={item}>{item}</List.Item>
      ))}
    </List.Root>
  );
}

function PrincipleCard({ icon, title, rule }: { icon: IconName; title: string; rule: string }) {
  return (
    <Flex
      gap="3"
      padding="4"
      borderWidth="1px"
      borderColor="border.muted"
      borderRadius="card"
      backgroundColor="bg.panel"
      minWidth="0"
    >
      <Flex
        boxSize="9"
        flexShrink={0}
        align="center"
        justify="center"
        borderRadius="full"
        backgroundColor="brand.muted"
        color="brand.fg"
      >
        <Icon name={icon} size={18} />
      </Flex>
      <Flex direction="column" gap="1" minWidth="0">
        <Text textStyle="title3">{title}</Text>
        <Text textStyle="bodySm" color="fg.alternative">
          {rule}
        </Text>
      </Flex>
    </Flex>
  );
}

function OverviewSpec() {
  return (
    <Spec
      id="overview"
      title="Overview"
      description="다시집 화면을 짜는 기준값 일곱 가지와 카탈로그 분류입니다."
    >
      <Demo variant="bare" label="원칙">
        <SimpleGrid columns={1} gap="3">
          {PRINCIPLES.map(([icon, title, rule]) => (
            <PrincipleCard key={title} icon={icon} title={title} rule={rule} />
          ))}
        </SimpleGrid>
      </Demo>

      <Demo label="분류와 절 수">
        {CATEGORIES.map((category) => (
          <TokenRow
            key={category.id}
            name={category.label}
            value={`${category.sections.length}개 절`}
            preview={
              <Flex boxSize="8" align="center" justify="center" color="fg.alternative">
                <Icon name={category.icon} size={20} />
              </Flex>
            }
          />
        ))}
      </Demo>

      <Demo
        label="포인트 색 바꾸기"
        note={`현재 값은 hue ${POINT.hue}, chroma ${POINT.chroma} 입니다. 값 하나를 바꾸면 brand 단계, 틴트 회색, 배경이 함께 다시 계산됩니다.`}
      >
        <Usage code={"export const POINT = { hue: 92, chroma: 0.14 } as const"} />
        {HUE_HINTS.map(([name, hue]) => (
          <TokenRow
            key={name}
            name={name}
            value={`hue ${hue}`}
            preview={<Swatch color={`oklch(0.875 ${POINT.chroma} ${hue})`} />}
          />
        ))}
      </Demo>
    </Spec>
  );
}

function BrandSpec() {
  return (
    <Spec
      id="brand"
      title="Brand"
      description="서비스명은 다시집, 코드명은 REBIRTH 입니다. 길에서 만난 동물이 집으로 돌아가는 일을 돕습니다."
    >
      <Demo label="로고와 이름">
        <Flex align="center" gap="4">
          <Image
            src="/logo/logo-mark-512.png"
            alt="다시집 로고"
            boxSize="16"
            borderRadius="card"
            objectFit="cover"
          />
          <Flex direction="column" gap="0.5" minWidth="0">
            <Text textStyle="title2">다시집</Text>
            <Text textStyle="caption" color="fg.assistive">
              REBIRTH
            </Text>
          </Flex>
        </Flex>
        <Text textStyle="bodySm" color="fg.alternative">
          파스텔 노란색 위에 어두운 잉크 글자를 얹어 부드럽고 신뢰감 있는 톤을 만듭니다.
        </Text>
      </Demo>

      <Demo label="제품 언어" note="발견한 동물과 제보자를 보호하는 표현만 씁니다.">
        <Flex gap="3">
          <Text textStyle="overline" color="fg.assistive" flex="1">
            금지
          </Text>
          <Box width="4" />
          <Text textStyle="overline" color="fg.assistive" flex="1.4">
            사용
          </Text>
        </Flex>
        {PRODUCT_LANGUAGE.map(([banned, preferred]) => (
          <Flex key={banned} gap="3" align="center">
            <Text textStyle="bodySm" color="fg.assistive" textDecoration="line-through" flex="1">
              {banned}
            </Text>
            <Flex boxSize="4" align="center" justify="center" color="fg.assistive" flexShrink={0}>
              <Icon name="arrowRight" size={14} />
            </Flex>
            <Text textStyle="bodySm" flex="1.4">
              {preferred}
            </Text>
          </Flex>
        ))}
      </Demo>
    </Spec>
  );
}

function ColorsSpec() {
  return (
    <Spec
      id="colors"
      title="Colors"
      description="색은 semantic token 이름으로만 부릅니다. brand 단계는 POINT 에서 OKLCH 로 계산되고 회색은 같은 색상각을 옅게 섞습니다."
    >
      <Demo label="brand 50 부터 950" note="양끝은 채도를 줄여 색역을 벗어나지 않게 합니다.">
        <Grid templateColumns="repeat(11, 1fr)" borderRadius="control" overflow="hidden">
          {BRAND_STEPS.map((step) => (
            <Box key={step} height="10" backgroundColor={`brand.${step}`} />
          ))}
        </Grid>
        <Grid templateColumns="repeat(11, 1fr)">
          {BRAND_STEPS.map((step) => (
            <Text key={step} fontSize="2xs" color="fg.assistive" textAlign="center">
              {step}
            </Text>
          ))}
        </Grid>
      </Demo>

      <Demo label="brand semantic" note="값은 라이트 / 다크 순서의 brand 단계입니다.">
        {BRAND_SEMANTIC.map(([name, value]) => (
          <TokenRow key={name} name={name} value={value} preview={<Swatch color={name} />} />
        ))}
      </Demo>

      <Demo label="대비 짝">
        <Flex
          height="touch"
          align="center"
          justify="center"
          borderRadius="control"
          backgroundColor="brand.solid"
          color="brand.contrast"
          textStyle="bodyStrong"
        >
          제보 시작하기
        </Flex>
        <Flex
          height="touch"
          align="center"
          justify="center"
          borderRadius="control"
          backgroundColor="brand.subtle"
          color="brand.fg"
          textStyle="bodyStrong"
        >
          확인할 후보 3건
        </Flex>
        <Flex
          height="touch"
          align="center"
          justify="center"
          borderRadius="control"
          backgroundColor="bg.inverted"
          color="fg.inverted"
          textStyle="bodyStrong"
        >
          반전 바탕 위 글자
        </Flex>
      </Demo>

      <Demo label="bg">
        {BG_TOKENS.map(([name, value]) => (
          <TokenRow key={name} name={name} value={value} preview={<Swatch color={name} />} />
        ))}
      </Demo>

      <Demo label="fg">
        {FG_TOKENS.map(([name, sample]) => (
          <Flex key={name} justify="space-between" align="center" gap="3">
            <Text textStyle="body" color={name} minWidth="0">
              {sample}
            </Text>
            <Text textStyle="caption" fontFamily="mono" color="fg.assistive" flexShrink={0}>
              {name}
            </Text>
          </Flex>
        ))}
      </Demo>

      <Demo label="border" variant="row">
        {BORDER_TOKENS.map((name) => (
          <Flex
            key={name}
            flex="1"
            minWidth="0"
            height="12"
            align="center"
            justify="center"
            borderWidth="1px"
            borderColor={name}
            borderRadius="control"
          >
            <Text textStyle="caption" color="fg.assistive" truncate>
              {name}
            </Text>
          </Flex>
        ))}
      </Demo>

      <Demo label="상태 색" note="Chakra 기본 팔레트의 solid, fg, subtle 을 그대로 씁니다.">
        {STATUS_PALETTES.map(([palette, label, sample]) => (
          <Flex key={palette} align="center" gap="3">
            <Swatch color={`${palette}.solid`} bordered={false} />
            <Flex
              flex="1"
              minWidth="0"
              align="center"
              gap="2"
              paddingInline="3"
              paddingBlock="2"
              borderRadius="control"
              backgroundColor={`${palette}.subtle`}
              color={`${palette}.fg`}
            >
              <Text textStyle="label" flexShrink={0}>
                {label}
              </Text>
              <Text textStyle="bodySm" truncate>
                {sample}
              </Text>
            </Flex>
          </Flex>
        ))}
      </Demo>

      <Demo
        variant="bare"
        label="두 테마 비교"
        note="brand.contrast 는 다크에서도 어두운 잉크로 고정해 파스텔 바탕 위 대비를 지킵니다."
      >
        <ThemeStage>
          <Button size="sm">제보 시작하기</Button>
          <Box
            paddingInline="3"
            paddingBlock="1"
            borderRadius="full"
            backgroundColor="brand.subtle"
            color="brand.fg"
            textStyle="label"
          >
            확인할 후보
          </Box>
          <Flex
            width="100%"
            direction="column"
            gap="0.5"
            padding="3"
            borderRadius="card"
            backgroundColor="bg.panel"
            boxShadow="raised"
          >
            <Text textStyle="title3">흰색 소형견, 말티즈 계열 추정</Text>
            <Text textStyle="bodySm" color="fg.alternative">
              강남구 역삼동 인근에서 발견, 대략 위치만 표시합니다
            </Text>
          </Flex>
          <Flex
            width="100%"
            height="12"
            align="center"
            justify="center"
            borderWidth="1px"
            borderColor="border"
            borderRadius="control"
          >
            <Text textStyle="caption" fontFamily="mono" color="fg.assistive">
              border 1px
            </Text>
          </Flex>
        </ThemeStage>
      </Demo>
    </Spec>
  );
}

function TypographySpec() {
  return (
    <Spec
      id="typography"
      title="Typography"
      description="Pretendard Variable 단일 서체입니다. body 에 tnum 을 켜 두어 숫자 폭이 고정됩니다."
    >
      <Demo label="위계">
        {TEXT_STYLES.map(([name]) => (
          <Flex key={name} direction="column" gap="0.5">
            <Text textStyle={name}>다시집 2026 제보 128건</Text>
            <Text textStyle="caption" fontFamily="mono" color="fg.assistive">
              {name}
            </Text>
          </Flex>
        ))}
      </Demo>

      <SpecTable
        rows={TEXT_STYLES.map(([name, spec, use]) => [name, `${spec} · ${use}`] as [string, string])}
      />
      <Text textStyle="caption" color="fg.assistive">
        값은 fontSize / lineHeight / fontWeight 순서입니다.
      </Text>

      <Demo label="숫자 정렬" note="tabular 숫자라 자릿수가 같으면 세로로 맞습니다.">
        <Flex justify="space-between" textStyle="body">
          <Text>제보</Text>
          <Text>1,024건</Text>
        </Flex>
        <Flex justify="space-between" textStyle="body">
          <Text>확인할 후보</Text>
          <Text>3,117건</Text>
        </Flex>
        <Flex justify="space-between" textStyle="body">
          <Text>귀가</Text>
          <Text>8,890건</Text>
        </Flex>
      </Demo>

      <Usage code={'<Text textStyle="title2">제목</Text>'} />
    </Spec>
  );
}

function SpacingSpec() {
  return (
    <Spec
      id="spacing"
      title="Spacing & Layout"
      description="간격은 Chakra 4px 배수와 네 개의 의미 토큰만 씁니다. 화면 쪽에 숫자를 직접 적지 않습니다."
    >
      <Demo label="4px 배수 눈금">
        {SPACING_SCALE.map(([step, value]) => (
          <Flex key={step} align="center" gap="3">
            <Text
              width="6"
              textStyle="caption"
              fontFamily="mono"
              color="fg.assistive"
              flexShrink={0}
            >
              {step}
            </Text>
            <Box
              width={step}
              height="3"
              borderRadius="sm"
              backgroundColor="brand.solid"
              flexShrink={0}
            />
            <Text textStyle="caption" fontFamily="mono" color="fg.assistive">
              {value}
            </Text>
          </Flex>
        ))}
      </Demo>

      <Text textStyle="label" color="fg.alternative">
        의미 토큰
      </Text>
      <SpecTable rows={SPACING_SEMANTIC} />

      <Demo
        label="화면 배치"
        variant="screen"
        note="프레임 390, 상단 바 56, 탭 바 60, 터치 44, 좌우 여백 20 입니다."
      >
        <Flex
          direction="column"
          width="100%"
          maxWidth="frame"
          height="72"
          borderWidth="1px"
          borderColor="border.emphasized"
          borderRadius="card"
          overflow="hidden"
        >
          <Flex
            height="appBar"
            flexShrink={0}
            align="center"
            justify="center"
            backgroundColor="bg.subtle"
            borderBottomWidth="1px"
            borderColor="border.muted"
          >
            <Text textStyle="caption" fontFamily="mono" color="fg.assistive">
              appBar 56
            </Text>
          </Flex>
          <Flex flex="1" minHeight="0" paddingInline="screen" position="relative">
            <Box
              position="absolute"
              top="0"
              bottom="0"
              left="0"
              width="screen"
              borderRightWidth="1px"
              borderStyle="dashed"
              borderColor="brand.emphasized"
              backgroundColor="brand.subtle"
            />
            <Box
              position="absolute"
              top="0"
              bottom="0"
              right="0"
              width="screen"
              borderLeftWidth="1px"
              borderStyle="dashed"
              borderColor="brand.emphasized"
              backgroundColor="brand.subtle"
            />
            <Flex direction="column" flex="1" gap="block" paddingBlock="block" minWidth="0">
              <Flex
                height="touch"
                align="center"
                justify="center"
                borderWidth="1px"
                borderStyle="dashed"
                borderColor="brand.fg"
                borderRadius="control"
              >
                <Text textStyle="caption" fontFamily="mono" color="fg.assistive">
                  touch 44
                </Text>
              </Flex>
              <Flex
                flex="1"
                align="center"
                justify="center"
                borderWidth="1px"
                borderStyle="dashed"
                borderColor="border.emphasized"
                borderRadius="control"
              >
                <Text textStyle="caption" fontFamily="mono" color="fg.assistive">
                  block 16 사이 간격
                </Text>
              </Flex>
            </Flex>
          </Flex>
          <Flex
            height="tabBar"
            flexShrink={0}
            align="center"
            justify="center"
            backgroundColor="bg.subtle"
            borderTopWidth="1px"
            borderColor="border.muted"
          >
            <Text textStyle="caption" fontFamily="mono" color="fg.assistive">
              tabBar 60
            </Text>
          </Flex>
        </Flex>
      </Demo>

      <Text textStyle="label" color="fg.alternative">
        배치 상수
      </Text>
      <SpecTable rows={SIZE_TOKENS} />

      <Rules
        items={[
          "화면 좌우 여백은 ScreenBody 가 screen 토큰으로 한 번만 넣습니다.",
          "절 사이는 section, 블록 사이는 block, 한 줄 안은 inline 을 씁니다.",
          "가장자리까지 채울 때만 Bleed 와 ScrollRow 로 여백을 되돌립니다.",
          "누르는 요소는 sizes.touch 이상으로 두고 아이콘만 있어도 같습니다.",
          "하단 고정 요소는 safeBottom 만큼 아래를 띄웁니다.",
        ]}
      />
    </Spec>
  );
}

function RadiusSpec() {
  return (
    <Spec
      id="radius"
      title="Radius & Elevation"
      description="모서리는 세 단계, 그림자는 잉크색 알파 세 단계입니다. 회색 그림자는 틴트 배경에서 탁해져 쓰지 않습니다."
    >
      <Demo label="radius" variant="row">
        {RADII.map(([name, value]) => (
          <Flex key={name} direction="column" align="center" gap="1.5">
            <Box
              boxSize="16"
              borderRadius={name}
              backgroundColor="brand.subtle"
              borderWidth="1px"
              borderColor="brand.emphasized"
            />
            <Text textStyle="caption" color="fg.assistive">
              {name}
            </Text>
            <Text textStyle="caption" fontFamily="mono" color="fg.assistive">
              {value}
            </Text>
          </Flex>
        ))}
      </Demo>

      <SpecTable rows={RADII_SPEC} />

      <Text textStyle="label" color="fg.alternative">
        Chakra 단계 대응
      </Text>
      <SpecTable rows={RADII_LEVELS} />

      <Demo label="shadow" variant="screen">
        <Flex gap="4" padding="5" backgroundColor="bg.subtle" wrap="wrap">
          {SHADOWS.map(([name, use]) => (
            <Flex
              key={name}
              flex="1"
              minWidth="20"
              direction="column"
              align="center"
              justify="center"
              gap="0.5"
              height="20"
              borderRadius="card"
              backgroundColor="bg.panel"
              boxShadow={name}
            >
              <Text textStyle="label">{name}</Text>
              <Text textStyle="caption" color="fg.assistive">
                {use}
              </Text>
            </Flex>
          ))}
        </Flex>
      </Demo>

      <SpecTable rows={SHADOW_SPEC} />

      <Demo
        variant="bare"
        label="두 테마 비교"
        note="다크에서는 바탕과 카드의 밝기 차가 그림자를 대신하므로 그림자는 윤곽을 잡는 정도로만 남습니다."
      >
        <ThemeStage>
          {SHADOWS.map(([name]) => (
            <Flex
              key={name}
              flex="1"
              minWidth="24"
              height="16"
              align="center"
              justify="center"
              borderRadius="card"
              backgroundColor="bg.panel"
              boxShadow={name}
            >
              <Text textStyle="caption" fontFamily="mono" color="fg.alternative">
                {name}
              </Text>
            </Flex>
          ))}
        </ThemeStage>
      </Demo>
    </Spec>
  );
}

function MotionDemo() {
  const [active, setActive] = useState(false);
  const [speed, setSpeed] = useState<MotionSpeed>("moderate");
  return (
    <Demo label="움직임 보기" note="폭, 색, 모서리가 같은 duration 과 ease-in-out 으로 함께 바뀝니다.">
      <Flex gap="inline" wrap="wrap">
        {MOTION_SPEEDS.map((item) => (
          <Chip key={item} size="small" active={speed === item} onClick={() => setSpeed(item)}>
            {item}
          </Chip>
        ))}
      </Flex>
      <Box height="12" borderRadius="control" backgroundColor="bg.subtle">
        <Flex
          height="100%"
          width={active ? "100%" : "40%"}
          align="center"
          justify="center"
          borderRadius={active ? "full" : "control"}
          backgroundColor={active ? "brand.solid" : "brand.muted"}
          color={active ? "brand.contrast" : "brand.fg"}
          textStyle="label"
          transitionProperty="width, background-color, border-radius, color"
          transitionDuration={speed}
          transitionTimingFunction="ease-in-out"
        >
          {active ? "열림" : "닫힘"}
        </Flex>
      </Box>
      <Button variant="outline" colorPalette="gray" onClick={() => setActive((value) => !value)}>
        {active ? "되돌리기" : "움직이기"}
      </Button>
    </Demo>
  );
}

function MotionSpec() {
  return (
    <Spec
      id="motion"
      title="Motion"
      description="Chakra 의 durations 와 easings 토큰만 씁니다. 큰 이동 대신 색, 크기, 불투명도가 바뀝니다."
    >
      <Demo label="durations">
        {DURATIONS.map(([name, value]) => (
          <TokenRow
            key={name}
            name={`durations.${name}`}
            value={value}
            preview={
              <Box width="12" display="flex" justifyContent="flex-start">
                <Box
                  width={`${Number.parseInt(value, 10) / 12}px`}
                  height="4"
                  borderRadius="sm"
                  backgroundColor="brand.solid"
                />
              </Box>
            }
          />
        ))}
      </Demo>

      <Demo label="easings" note="값은 cubic-bezier 네 인자입니다.">
        {EASINGS.map(([name, value]) => (
          <TokenRow key={name} name={`easings.${name}`} value={value} />
        ))}
      </Demo>

      <MotionDemo />

      <Rules
        items={[
          "기본은 moderate 200ms 에 ease-in-out 입니다.",
          "바텀 시트와 드로어는 slow 300ms 에 ease-in-smooth 를 씁니다.",
          "탭과 칩 강조는 fast 150ms 로 즉시 반응합니다.",
          "화면 절반 넘게 이동하는 애니메이션은 쓰지 않습니다.",
        ]}
      />

      <Usage code={'<Box transitionDuration="moderate" transitionTimingFunction="ease-in-out" />'} />
    </Spec>
  );
}

function IconsSpec() {
  return (
    <Spec
      id="icons"
      title="Icons"
      description={`24 그리드 stroke 2 의 자체 세트 ${ICON_NAMES.length}개입니다. currentColor 로 그려 글자색을 그대로 따릅니다.`}
    >
      <Demo label="크기" note="아이콘만 있는 버튼도 터치 영역은 44px 을 지킵니다.">
        {ICON_SIZES.map(([size, use]) => (
          <TokenRow
            key={size}
            name={use}
            value={`${size}px`}
            preview={
              <Flex boxSize="8" align="center" justify="center">
                <Icon name="paw" size={size} />
              </Flex>
            }
          />
        ))}
      </Demo>

      <Demo label="전체 목록">
        <SimpleGrid columns={4} gap="2">
          {ICON_NAMES.map((name) => (
            <Flex
              key={name}
              direction="column"
              align="center"
              gap="1.5"
              paddingBlock="3"
              paddingInline="1"
              borderRadius="control"
              backgroundColor="bg.subtle"
              minWidth="0"
              title={name}
            >
              <Icon name={name} size={24} />
              <Text
                fontSize="2xs"
                lineHeight="shorter"
                color="fg.alternative"
                maxWidth="100%"
                truncate
              >
                {name}
              </Text>
            </Flex>
          ))}
        </SimpleGrid>
      </Demo>

      <Usage code={'import { Icon } from "@/components/ui/icons"\n<Icon name="camera" size={24} />'} />
    </Spec>
  );
}

export function FoundationsCatalog() {
  return (
    <>
      <OverviewSpec />
      <BrandSpec />
      <ColorsSpec />
      <TypographySpec />
      <SpacingSpec />
      <RadiusSpec />
      <MotionSpec />
      <IconsSpec />
    </>
  );
}
