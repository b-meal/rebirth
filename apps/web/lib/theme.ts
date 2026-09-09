import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

// WDS 의 semantic 토큰을 Chakra 토큰으로 옮김
// 색과 간격 이름을 화면 쪽에서 직접 쓰지 않고 이 파일에서만 정함

const config = defineConfig({
  globalCss: {
    "html, body": {
      // 길에서 한 손으로 쓰는 화면이라 가로 스크롤을 막음
      overflowX: "hidden",
    },
    body: {
      bg: "bg.canvas",
      color: "fg.default",
    },
  },
  theme: {
    tokens: {
      fonts: {
        body: { value: "Pretendard Variable, Pretendard, system-ui, sans-serif" },
        heading: {
          value: "Pretendard Variable, Pretendard, system-ui, sans-serif",
        },
      },
      colors: {
        brand: {
          50: { value: "#eef4ff" },
          100: { value: "#d9e6ff" },
          200: { value: "#bcd3ff" },
          300: { value: "#8eb6ff" },
          400: { value: "#588eff" },
          500: { value: "#2f66f5" },
          600: { value: "#1a48d8" },
          700: { value: "#1638ae" },
          800: { value: "#17318a" },
          900: { value: "#182e6d" },
          950: { value: "#111d42" },
        },
      },
      radii: {
        card: { value: "12px" },
      },
    },
    semanticTokens: {
      colors: {
        brand: {
          solid: { value: "{colors.brand.500}" },
          contrast: { value: "white" },
          fg: { value: "{colors.brand.700}" },
          muted: { value: "{colors.brand.100}" },
          subtle: { value: "{colors.brand.50}" },
          emphasized: { value: "{colors.brand.200}" },
          focusRing: { value: "{colors.brand.500}" },
        },
        bg: {
          canvas: { value: { base: "white", _dark: "{colors.gray.950}" } },
          // 지도와 선택 위치 상자의 바탕
          alternative: { value: { base: "{colors.gray.50}", _dark: "{colors.gray.900}" } },
        },
        fg: {
          default: { value: { base: "{colors.gray.900}", _dark: "{colors.gray.50}" } },
          // 보조 문구. WDS 의 label.alternative 자리
          alternative: { value: { base: "{colors.gray.600}", _dark: "{colors.gray.400}" } },
          // 가장 옅은 안내 문구. label.assistive 자리
          assistive: { value: { base: "{colors.gray.500}", _dark: "{colors.gray.500}" } },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
