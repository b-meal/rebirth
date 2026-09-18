import { expect, test, type Page } from "@playwright/test";

import { dismissSplash } from "./fixtures/splash";

// 홈 지도의 내 위치 점과 방향 부채꼴을 실제 브라우저로 확인하는 자리
// Chromium 은 deviceorientationabsolute 를 알아 실기기가 하듯 이벤트를 흘려 넣을 수 있음

const 서교동 = { latitude: 37.5561, longitude: 126.9231 };

// 북쪽에서 약 100m 위, 서 있을 때의 흔들림(2m) 을 훨씬 넘는 거리
const 서교동_북쪽 = { latitude: 37.557, longitude: 126.9231 };

test.use({ geolocation: 서교동, permissions: ["geolocation"] });

/**
 * 폰이 하듯 절대 각도를 계속 흘려 보냄. alpha 270 은 기기 위쪽이 동쪽
 * 헤드리스 Chromium 은 센서가 없어 DeviceOrientationEvent 자체가 없음
 * 페이지 스크립트보다 먼저 폰과 같은 모양을 깔아 훅이 지원 기기로 보게 함
 */
async function emitCompass(page: Page, alpha: number) {
  await page.addInitScript((value: number) => {
    type Init = { alpha?: number | null; beta?: number | null; gamma?: number | null; absolute?: boolean };
    class FakeOrientationEvent extends Event {
      alpha: number | null;
      beta: number | null;
      gamma: number | null;
      absolute: boolean;
      constructor(type: string, init: Init = {}) {
        super(type);
        this.alpha = init.alpha ?? null;
        this.beta = init.beta ?? null;
        this.gamma = init.gamma ?? null;
        this.absolute = init.absolute ?? false;
      }
    }
    const w = window as unknown as Record<string, unknown>;
    if (typeof w.DeviceOrientationEvent === "undefined") {
      w.DeviceOrientationEvent = FakeOrientationEvent;
      w.ondeviceorientationabsolute = null;
    }
    const Ctor = w.DeviceOrientationEvent as typeof FakeOrientationEvent;
    setInterval(() => {
      window.dispatchEvent(
        new Ctor("deviceorientationabsolute", { alpha: value, beta: 0, gamma: 0, absolute: true }),
      );
    }, 100);
  }, alpha);
}

async function openHome(page: Page) {
  await page.goto("/");
  await dismissSplash(page);
  const dot = page.locator(".rebirth-my-location");
  await expect(dot).toBeVisible({ timeout: 20_000 });
  return dot;
}

test("자기 센서 각도가 오면 부채꼴이 동쪽을 가리킨다", async ({ page }) => {
  await emitCompass(page, 270);
  const dot = await openHome(page);
  await expect(page.locator(".rebirth-my-location-heading")).toBeVisible();
  // 지수 평활이 끝나면 목표각에 정확히 붙음
  await expect
    .poll(() => dot.evaluate((el) => el.style.transform), { timeout: 5000 })
    .toMatch(/rotateZ\(90deg\)/);
});

test("센서가 없는 기기는 점만 보이고 부채꼴을 숨긴다", async ({ page }) => {
  await openHome(page);
  // 첫 표본을 기다리는 시간이 지나도 숨긴 채여야 함
  await page.waitForTimeout(3500);
  await expect(page.locator(".rebirth-my-location-heading")).toBeHidden();
});

test("걸어가면 점이 따라 움직이고 지도는 되돌리지 않는다", async ({ page, context }) => {
  const dot = await openHome(page);
  const before = await dot.evaluate((el) => el.style.transform);

  // 지도가 새 자리로 따라갔다면 점은 다시 화면 가운데라 transform 이 그대로임
  // 점이 화면에서 옮겨 갔다는 것이 곧 지도는 두고 점만 움직였다는 뜻
  await context.setGeolocation(서교동_북쪽);
  await expect
    .poll(() => dot.evaluate((el) => el.style.transform), { timeout: 10_000 })
    .not.toBe(before);
});

/**
 * iOS Safari 흉내. requestPermission 은 누른 안에서만 성공하고 그 전에는 이벤트가 오지 않음
 * 각도는 Safari 방식대로 webkitCompassHeading 에 담아 보냄
 */
async function emulateSafariCompass(page: Page, heading: number) {
  await page.addInitScript((value: number) => {
    class FakeOrientationEvent extends Event {
      alpha: number | null = null;
      beta: number | null = null;
      gamma: number | null = null;
      absolute = false;
      webkitCompassHeading: number;
      webkitCompassAccuracy = 15;
      constructor(type: string, compass: number) {
        super(type);
        this.webkitCompassHeading = compass;
      }
    }
    let granted = false;
    (FakeOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission =
      () => {
        if (!navigator.userActivation.isActive) {
          return Promise.reject(new DOMException("needs gesture", "NotAllowedError"));
        }
        granted = true;
        return Promise.resolve("granted");
      };
    const w = window as unknown as Record<string, unknown>;
    w.DeviceOrientationEvent = FakeOrientationEvent;
    setInterval(() => {
      if (granted) window.dispatchEvent(new FakeOrientationEvent("deviceorientationabsolute", value));
    }, 100);
  }, heading);
}

test("iOS 처럼 권한이 필요한 기기는 첫 탭이 곧 권한 요청이 된다", async ({ page }) => {
  await emulateSafariCompass(page, 45);
  // 덮개를 걷는 단추 탭이 첫 제스처라 그 자리에서 권한 팝업이 뜨고 바로 켜짐
  const dot = await openHome(page);
  const cone = page.locator(".rebirth-my-location-heading");
  await expect(cone).toBeVisible({ timeout: 5000 });
  await expect
    .poll(() => dot.evaluate((el) => el.style.transform), { timeout: 5000 })
    .toMatch(/rotateZ\(45deg\)/);
});

test("iOS 처럼 권한이 필요한 기기에서 덮개 없이 들어오면 지도를 한 번 누르면 켜진다", async ({ page }) => {
  await emulateSafariCompass(page, 45);
  // 덮개는 한 번만 뜨므로 먼저 걷고 다시 들어와 탭 없는 첫 화면을 만듦
  await page.goto("/");
  await dismissSplash(page);
  await page.goto("/");
  const dot = page.locator(".rebirth-my-location");
  await expect(dot).toBeVisible({ timeout: 20_000 });
  const cone = page.locator(".rebirth-my-location-heading");
  await page.waitForTimeout(3500);
  await expect(cone).toBeHidden();

  // 단추가 아닌 지도 빈 곳을 톡 치는 것도 제스처로 침
  await page.mouse.click(120, 420);
  await expect(cone).toBeVisible({ timeout: 5000 });
});
