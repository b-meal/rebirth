import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // SEED CLI 가 내려받는 원본 스니펫이라 우리 규칙의 검사 대상 제외
    "seed-design/**",
    // 빌드 전에 복사해 두는 지도 워커 사본이라 검사 대상 제외
    "public/maplibre/**",
  ]),
]);

export default eslintConfig;
