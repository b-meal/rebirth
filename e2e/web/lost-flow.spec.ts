import { expect, test } from "@playwright/test";

import { makePng } from "./fixtures/make-photo.mjs";

// 실종 신고 3단계와 조회 주소, 후보 확인 화면의 규칙을 확인하는 자리

const PHOTO = { name: "pet.png", mimeType: "image/png", buffer: makePng() };

// 시드 제보가 깔린 동네라 후보가 잡힘
const 서교동 = { latitude: 37.5561, longitude: 126.9231 };

// 후보 진행 표시, 이스케이프를 피하려고 문자 클래스로 둠
const PROGRESS = /^\d+ [/] \d+$/;
const ANY_PROGRESS = /\d+ [/] \d+/;

test.use({
  geolocation: 서교동,
  permissions: ["geolocation", "clipboard-read", "clipboard-write"],
});

/** 3단계를 채워 신고를 접수하고 조회 주소를 돌려줌 */
async function registerLost(page: import("@playwright/test").Page): Promise<string> {
  await page.goto("/lost/new");
  await page.locator("input[type=file]").first().setInputFiles(PHOTO);
  await page.getByRole("button", { name: "다음" }).click();

  await expect(page.getByText("어떻게 생겼나요")).toBeVisible({ timeout: 15_000 });
  await page.locator("label", { hasText: /^개$/ }).first().click();
  await page.locator("label", { hasText: /^소형$/ }).first().click();
  await page.locator("label", { hasText: /^흰색$/ }).first().click();
  await page.locator("textarea").first().fill("왼쪽 귀에 갈색 반점, 분홍 목줄");
  await page.getByRole("button", { name: "다음" }).click();

  await expect(page.getByText("마지막으로 봤나요")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /현재 위치로 찾기/ }).click();
  await expect(page.getByText(/서울|마포/).first()).toBeVisible({ timeout: 20_000 });

  await page.getByRole("button", { name: "신고 등록하기" }).click();
  await expect(page.getByText("신고를 접수했어요")).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: "주소 복사하기" }).click();
  await expect(page.getByText("복사했어요")).toBeVisible();
  return page.evaluate(() => navigator.clipboard.readText());
}

test("연락처를 받지 않는다", async ({ page }) => {
  // 제보자와 보호자를 전화번호로 잇지 않는 것이 이 서비스의 약속
  await page.goto("/lost/new");
  await expect(page.locator('input[type="tel"]')).toHaveCount(0);
  await expect(page.locator('input[type="email"]')).toHaveCount(0);
});

test("신고를 등록하면 조회 주소를 받고 후보를 확인한다", async ({ page }) => {
  const copied = await registerLost(page);
  expect(copied).toContain("/lost/");

  await page.getByRole("button", { name: "확인할 후보 보기" }).click();
  await expect(page.getByText(/확인할 후보/).first()).toBeVisible({ timeout: 30_000 });

  // 개체 동일성을 확정하지 않는다는 표기가 점수 옆에 늘 붙음
  await expect(page.getByText("확정 아님").first()).toBeVisible();
  // 정확 좌표를 화면에 숫자로 내놓지 않음
  await expect(page.locator("body")).not.toHaveText(/12[0-9]\.\d{4}/);
});

test("후보는 버튼만으로 판정할 수 있다", async ({ page }) => {
  const copied = await registerLost(page);
  await page.goto(new URL(copied).pathname);
  await expect(page.getByText(/확인할 후보/).first()).toBeVisible({ timeout: 30_000 });

  const progress = page.getByText(PROGRESS);
  await expect(progress).toHaveText(/^1 /);

  await expect(page.getByRole("button", { name: "맞는 것 같아요" })).toBeVisible();
  await page.getByRole("button", { name: "아니에요" }).click();
  await expect(progress).toHaveText(/^2 /, { timeout: 15_000 });
});

test("잘못된 조회 주소는 안내만 하고 다른 정보를 내주지 않는다", async ({ page }) => {
  await page.goto("/lost/badtoken1234567890");
  await expect(page.getByText("주소가 맞지 않아요")).toBeVisible({ timeout: 20_000 });
  // 후보나 신고 내용이 새어 나오지 않음
  await expect(page.getByRole("button", { name: "맞는 것 같아요" })).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveText(ANY_PROGRESS);
});
