import {
  createSystem,
  defaultConfig,
  defineConfig,
  defineRecipe,
  defineSemanticTokens,
  defineSlotRecipe,
  defineTextStyles,
  defineTokens,
} from "@chakra-ui/react";

// 색과 간격 이름은 화면 쪽에서 직접 쓰지 않고 이 파일에서만 정하는 단일 원천

/** 포인트 색 단일 원천. OKLCH 색상각 0~360 과 채도. 노란색 92, 살구 60, 민트 165, 라벤더 300 */
export const POINT = { hue: 92, chroma: 0.14 } as const;

/** 회색과 배경에 섞는 포인트 틴트 채도. 0 이면 완전 무채색 */
const TINT = 0.01;

/** 동물 털색 프리셋. 색 선택기처럼 hex 원문이 필요한 곳이 참조하는 단일 원천 */
export const COAT_COLORS = {
  white: "#f5f3ee",
  brown: "#8a5a34",
  black: "#2b2724",
  gray: "#9a9691",
  yellow: "#d8b25c",
  calico: "#c98a5e",
} as const;

const oklch = (l: number, c: number, hue: number = POINT.hue) => `oklch(${l} ${c} ${hue})`;

// 그림자에 쓰는 반투명 잉크, 포인트 색상각을 따라가 배경과 같은 계열 유지
const ink = (alpha: number) => `oklch(0.2 0.02 ${POINT.hue} / ${alpha})`;

// 단계별 밝기와 채도 배율, 양끝은 채도를 줄여 색역 이탈 방지
const BRAND_STEPS: Record<string, [lightness: number, chromaRatio: number]> = {
  50: [0.985, 0.2],
  100: [0.965, 0.4],
  200: [0.94, 0.6],
  300: [0.915, 0.8],
  400: [0.895, 0.95],
  500: [0.875, 1],
  600: [0.78, 0.95],
  700: [0.66, 0.85],
  800: [0.53, 0.7],
  900: [0.43, 0.55],
  950: [0.33, 0.4],
};

// 회색에 포인트 색을 옅게 섞어 전체 톤을 맞추는 밝기 단계
const NEUTRAL_STEPS: Record<string, number> = {
  50: 0.985,
  100: 0.965,
  200: 0.925,
  300: 0.87,
  400: 0.72,
  500: 0.6,
  600: 0.5,
  700: 0.42,
  800: 0.32,
  900: 0.24,
  950: 0.17,
};

const scale = (steps: Record<string, [number, number] | number>, chroma: number) =>
  Object.fromEntries(
    Object.entries(steps).map(([step, spec]) => {
      const [l, ratio] = Array.isArray(spec) ? spec : [spec, 1];
      return [step, { value: oklch(l, chroma * ratio) }];
    }),
  );

const tokens = defineTokens({
  fonts: {
    body: { value: "Pretendard Variable, Pretendard, system-ui, sans-serif" },
    heading: { value: "Pretendard Variable, Pretendard, system-ui, sans-serif" },
  },
  colors: {
    brand: scale(BRAND_STEPS, POINT.chroma),
    // Chakra 기본 gray 를 덮어써 border bg fg 기본값이 모두 틴트를 따르게 함
    gray: scale(NEUTRAL_STEPS, TINT),
    // 동물 털색 프리셋, 브랜드와 무관한 실제 사물 색이라 별도 눈금으로 둠
    coat: Object.fromEntries(
      Object.entries(COAT_COLORS).map(([name, value]) => [name, { value }]),
    ),
  },
  // 모바일 화면 배치 상수, 화면 쪽에서 숫자를 직접 쓰지 않는 기준
  spacing: {
    screen: { value: "20px" },
    section: { value: "32px" },
    block: { value: "16px" },
    inline: { value: "8px" },
    safeBottom: { value: "env(safe-area-inset-bottom, 0px)" },
    safeTop: { value: "env(safe-area-inset-top, 0px)" },
  },
  sizes: {
    frame: { value: "390px" },
    appBar: { value: "56px" },
    tabBar: { value: "60px" },
    touch: { value: "44px" },
    fab: { value: "56px" },
    handle: { value: "36px" },
  },
  radii: {
    control: { value: "12px" },
    card: { value: "16px" },
    sheet: { value: "24px" },
  },
  shadows: {
    // 잉크색 알파 그림자, 회색 그림자는 틴트 배경에서 탁해지므로 회피
    raised: { value: `0 1px 2px ${ink(0.06)}, 0 4px 12px ${ink(0.06)}` },
    float: { value: `0 6px 20px ${ink(0.14)}` },
    overlay: { value: `0 -8px 32px ${ink(0.14)}` },
  },
});

const semanticTokens = defineSemanticTokens({
  colors: {
    brand: {
      solid: { value: "{colors.brand.500}" },
      // 파스텔 배경 위 글자는 다크에서도 어두운 잉크 고정
      contrast: { value: "{colors.gray.950}" },
      fg: { value: { base: "{colors.brand.800}", _dark: "{colors.brand.300}" } },
      muted: { value: { base: "{colors.brand.100}", _dark: "{colors.brand.900}" } },
      subtle: { value: { base: "{colors.brand.50}", _dark: "{colors.brand.950}" } },
      emphasized: { value: { base: "{colors.brand.200}", _dark: "{colors.brand.800}" } },
      focusRing: { value: { base: "{colors.brand.700}", _dark: "{colors.brand.400}" } },
    },
    bg: {
      DEFAULT: { value: { base: oklch(0.988, 0.015), _dark: oklch(0.19, 0.012) } },
      canvas: { value: { base: oklch(0.988, 0.015), _dark: oklch(0.19, 0.012) } },
      // 카드 시트 다이얼로그 바탕, 캔버스보다 한 단계 밝은 부상 면
      panel: { value: { base: oklch(0.999, 0.004), _dark: oklch(0.23, 0.014) } },
      subtle: { value: { base: oklch(0.972, 0.022), _dark: oklch(0.23, 0.014) } },
      // 지도와 선택 위치 상자, 데스크톱 프레임 바깥 바탕
      alternative: { value: { base: oklch(0.955, 0.028), _dark: oklch(0.27, 0.016) } },
      muted: { value: { base: "{colors.gray.100}", _dark: "{colors.gray.800}" } },
      emphasized: { value: { base: "{colors.gray.200}", _dark: "{colors.gray.700}" } },
      inverted: { value: { base: "{colors.gray.950}", _dark: "{colors.gray.50}" } },
    },
    fg: {
      DEFAULT: { value: { base: "{colors.gray.950}", _dark: "{colors.gray.50}" } },
      default: { value: { base: "{colors.gray.950}", _dark: "{colors.gray.50}" } },
      // 보조 문구, WDS 의 label.alternative 자리
      alternative: { value: { base: "{colors.gray.600}", _dark: "{colors.gray.400}" } },
      muted: { value: { base: "{colors.gray.600}", _dark: "{colors.gray.400}" } },
      // 가장 옅은 안내 문구, WDS 의 label.assistive 자리
      assistive: { value: { base: "{colors.gray.500}", _dark: "{colors.gray.500}" } },
      subtle: { value: { base: "{colors.gray.500}", _dark: "{colors.gray.500}" } },
      inverted: { value: { base: "{colors.gray.50}", _dark: "{colors.gray.950}" } },
    },
    border: {
      DEFAULT: { value: { base: "{colors.gray.200}", _dark: "{colors.gray.800}" } },
      muted: { value: { base: "{colors.gray.100}", _dark: "{colors.gray.900}" } },
      subtle: { value: { base: "{colors.gray.50}", _dark: "{colors.gray.950}" } },
      emphasized: { value: { base: "{colors.gray.300}", _dark: "{colors.gray.700}" } },
    },
  },
  radii: {
    // Chakra 컴포넌트가 쓰는 3단계 모서리를 모바일 기준으로 한 단계씩 둥글게
    l1: { value: "{radii.md}" },
    l2: { value: "{radii.control}" },
    l3: { value: "{radii.card}" },
  },
});

// 모바일 본문 위계, Heading 의 size 와 별개로 textStyle 이름으로 호출
const textStyles = defineTextStyles({
  display: {
    value: { fontSize: "32px", lineHeight: "40px", fontWeight: "700", letterSpacing: "-0.02em" },
  },
  title1: {
    value: { fontSize: "26px", lineHeight: "34px", fontWeight: "700", letterSpacing: "-0.015em" },
  },
  title2: {
    value: { fontSize: "22px", lineHeight: "30px", fontWeight: "700", letterSpacing: "-0.01em" },
  },
  title3: { value: { fontSize: "18px", lineHeight: "26px", fontWeight: "600" } },
  heading: { value: { fontSize: "16px", lineHeight: "24px", fontWeight: "600" } },
  body: { value: { fontSize: "16px", lineHeight: "24px", fontWeight: "400" } },
  bodyStrong: { value: { fontSize: "16px", lineHeight: "24px", fontWeight: "500" } },
  bodySm: { value: { fontSize: "14px", lineHeight: "20px", fontWeight: "400" } },
  label: { value: { fontSize: "14px", lineHeight: "20px", fontWeight: "500" } },
  caption: { value: { fontSize: "12px", lineHeight: "16px", fontWeight: "400" } },
  overline: {
    value: { fontSize: "11px", lineHeight: "14px", fontWeight: "600", letterSpacing: "0.04em" },
  },
  // 배지 안 숫자처럼 원 안에 들어가는 가장 작은 글자
  counter: { value: { fontSize: "10px", lineHeight: "12px", fontWeight: "700" } },
});

// 손가락 기준 최소 44px 확보를 위해 기본 크기를 lg 로 상향
const button = defineRecipe({ defaultVariants: { size: "lg" } });
const input = defineRecipe({ defaultVariants: { size: "lg" } });

// 390px 폭에서 안쪽 24px 은 본문을 좁혀 sm 을 기본으로 두고 그림자도 토큰으로 교체
const card = defineSlotRecipe({
  slots: ["root", "header", "body", "footer", "title", "description"],
  base: {
    title: { textStyle: "title3" },
    description: { textStyle: "bodySm", color: "fg.alternative" },
  },
  variants: {
    size: {
      sm: { root: { "--card-padding": "spacing.4" } },
      md: { root: { "--card-padding": "spacing.5" } },
      lg: { root: { "--card-padding": "spacing.6" } },
    },
    variant: {
      elevated: { root: { boxShadow: "raised", borderWidth: "0" } },
      outline: { root: { borderColor: "border.muted" } },
      subtle: { root: { bg: "bg.subtle" } },
    },
  },
  defaultVariants: { size: "sm", variant: "outline" },
});

const config = defineConfig({
  globalCss: {
    html: {
      // 팔레트를 적지 않은 컴포넌트가 브랜드 색을 받는 기본값
      colorPalette: "brand",
      // clip 은 hidden 과 달리 스크롤 컨테이너를 만들지 않아 sticky 가 살아 있음
      overflowX: "clip",
      WebkitTapHighlightColor: "transparent",
    },
    body: {
      bg: "bg.canvas",
      color: "fg.default",
      // 길에서 한 손으로 쓰는 화면이라 가로 스크롤 차단
      overflowX: "clip",
      fontFeatureSettings: '"tnum"',
    },
    "button, [role=button], a": {
      // 더블탭 확대 대기를 없애 첫 탭이 바로 반응하게 하는 설정
      touchAction: "manipulation",
    },
  },
  theme: {
    tokens,
    semanticTokens,
    textStyles,
    recipes: { button, input },
    slotRecipes: { card },
  },
});

export const system = createSystem(defaultConfig, config);
