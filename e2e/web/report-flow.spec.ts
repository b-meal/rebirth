import { expect, test } from "@playwright/test";

import { makePng } from "./fixtures/make-photo.mjs";
import { dismissSplash } from "./fixtures/splash";

// 제보 2단계와 상세, 공유 카드를 실제 브라우저로 확인하는 자리

const PHOTO = { name: "sighting.png", mimeType: "image/png", buffer: makePng() };

test.use({
  geolocation: { latitude: 37.5561, longitude: 126.9231 },
  permissions: ["geolocation"],
});

/** 1단계에서 앨범 입력으로 사진을 올리고 2단계까지 보냄 */
async function goToDetailStep(page: import("@playwright/test").Page) {
  await page.goto("/report");
  await dismissSplash(page);
  await page.locator("input[type=file]:not([capture])").setInputFiles(PHOTO);
  await expect(page.getByText("이 사진으로 할까요")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page).toHaveURL(/step=2/);
}

/** 보호 상황 칩은 Chip.RadioItem 이라 라벨을 눌러야 선택됨 */
async function pickCare(page: import("@playwright/test").Page, label: string) {
  await page.locator("span.seed-chip__label", { hasText: label }).first().click();
}

test("1단계에 촬영과 앨범이 모두 있다", async ({ page }) => {
  // 길에서 찍지 않는 사람도 저장된 사진으로 제보할 수 있어야 함
  await page.goto("/report");
  await dismissSplash(page);
  await expect(page.getByRole("button", { name: "사진 촬영" })).toBeVisible();
  await expect(page.getByRole("button", { name: "앨범에서 선택" })).toBeVisible();
  await expect(page.locator("input[type=file][capture]")).toHaveCount(1);
  await expect(page.locator("input[type=file]:not([capture])")).toHaveCount(1);
});

test("초안이 오기 전에는 제보를 올릴 수 없다", async ({ page }) => {
  // 초안 없이 보내면 외형이 빈 채로 나가 서버가 400 으로 되돌림
  await goToDetailStep(page);
  await pickCare(page, "배회 중");
  await expect(page.getByRole("button", { name: "제보하기" })).toBeDisabled();

  await expect(page.getByText("AI 초안")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "제보하기" })).toBeEnabled();
});

test("사진에서 제보 완료까지 끝낸다", async ({ page }) => {
  await goToDetailStep(page);
  await expect(page.getByText("AI 초안")).toBeVisible({ timeout: 30_000 });

  // 좌표는 화면에 숫자로 나오지 않고 행정동만 보임
  await expect(page.getByText(/서울|경기|인천/).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("body")).not.toHaveText(/12[0-9]\.\d{4}/);

  // 품종 뒤에 계열 추정이 한 번만 붙음
  await expect(page.getByText("계열 추정 계열 추정")).toHaveCount(0);

  await pickCare(page, "배회 중");
  await page.getByRole("button", { name: "제보하기" }).click();

  await expect(page).toHaveURL(/\/r\/[0-9a-f-]{36}\/done/, { timeout: 40_000 });
  await expect(page.getByText("제보가 등록됐어요")).toBeVisible();

  const id = page.url().split("/r/")[1]!.split("/")[0]!;
  await page.goto(`/r/${id}`);
  await dismissSplash(page);
  await expect(page.getByText("AI 초안, 수정 가능")).toBeVisible();
  await expect(page.getByRole("button", { name: "공유하기" })).toBeVisible();
  await expect(page.getByText("계열 추정 계열 추정")).toHaveCount(0);
  // 정확 좌표를 공개 화면에 넣지 않음
  await expect(page.locator("body")).not.toHaveText(/12[0-9]\.\d{4}/);
});

test("공유 카드는 1080x1350 PNG 로 나온다", async ({ page, request }) => {
  await goToDetailStep(page);
  await expect(page.getByText("AI 초안")).toBeVisible({ timeout: 30_000 });
  await pickCare(page, "배회 중");
  await page.getByRole("button", { name: "제보하기" }).click();
  await expect(page).toHaveURL(/\/r\/[0-9a-f-]{36}\/done/, { timeout: 40_000 });

  const id = page.url().split("/r/")[1]!.split("/")[0]!;
  const card = await request.get(`/r/${id}/card`);
  expect(card.status()).toBe(200);
  expect(card.headers()["content-type"]).toContain("image/png");

  const bytes = Buffer.from(await card.body());
  expect(bytes.subarray(1, 4).toString()).toBe("PNG");
  // IHDR 의 폭과 높이
  expect(bytes.readUInt32BE(16)).toBe(1080);
  expect(bytes.readUInt32BE(20)).toBe(1350);
});

test("없는 주소는 로그인 대신 404 를 보여 준다", async ({ page }) => {
  // 로그인 벽이 404 를 가리면 오타를 친 사람이 로그인 화면을 봄
  const response = await page.goto("/not-a-real-page");
  await dismissSplash(page);
  expect(response?.status()).toBe(404);
  await expect(page.getByText("찾을 수 없는 주소입니다")).toBeVisible();
  await expect(page).not.toHaveURL(/sign-in/);
});
