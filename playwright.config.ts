import { defineConfig, devices } from "@playwright/test";

// 127.0.0.1 로 열면 next dev 가 교차 출처로 보고 HMR 과 하이드레이션을 막음
// baseURL 은 반드시 localhost 를 씀
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  // 제보 흐름은 순서가 있어 병렬로 돌리지 않음
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    trace: "retain-on-failure",
  },
  projects: [
    {
      // 모바일 전용 서비스라 390px 한 폭에서만 검증
      // iPhone 프리셋은 WebKit 을 끌어와 설치 부담이 커 Chromium 에 뷰포트만 맞춤
      name: "mobile-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: false,
        hasTouch: true,
      },
    },
  ],
});
