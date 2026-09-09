import { expect, test } from "@playwright/test";

import { makePng } from "./fixtures/make-photo.mjs";

// 제보 4단계와 상세·공유를 실제 브라우저로 확인
// AI 분석은 실패 폴백까지만 확인함. 초안 경로는 모델 응답이 있어야 검증됨

const PHOTO = { name: "sighting.png", mimeType: "image/png", buffer: makePng() };

test.use({
  geolocation: { latitude: 37.5561, longitude: 126.9231 },
  permissions: ["geolocation"],
});

test("사진에서 공유까지 제보를 끝낸다", async ({ page }) => {
  await page.goto("/report");

  // 1단계 사진과 보호 상황이 모두 채워질 때까지 다음이 막혀 있음
  await expect(page.getByText("사진을 올려 주십시오")).toBeVisible();
  await expect(page.getByRole("button", { name: "다음" })).toBeDisabled();

  await page.locator("input[type=file]:not([capture])").setInputFiles(PHOTO);
  await expect(page.locator('img[alt="선택한 사진"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "다음" })).toBeDisabled();

  await page.getByRole("button", { name: "배회 중" }).click();
  await expect(page.getByRole("button", { name: "다음" })).toBeEnabled();
  await page.getByRole("button", { name: "다음" }).click();

  // 2단계 좌표는 화면에 숫자로 나오지 않고 행정동만 보임
  await expect(page.getByText("어디에서 봤습니까")).toBeVisible();
  await expect(page).toHaveURL(/step=2/);
  await page.getByRole("button", { name: "현재 위치 사용" }).click();
  await expect(page.getByText(/서울|경기|인천/)).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("body")).not.toHaveText(/12[0-9]\.\d{4}/);

  await page.getByPlaceholder("새터산 12길 CU 근처").fill("연남동 CU 앞");
  await page.getByRole("button", { name: "다음" }).click();

  // 3단계 분석 결과가 오든 실패하든 입력을 계속할 수 있어야 함
  await expect(page.getByText("특징을 확인해 주십시오")).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("radio", { name: "개", exact: true }).click();
  await page
    .getByPlaceholder("흰색 소형견, 털이 길고 엉킴")
    .fill("흰색 소형견, 말티즈 계열 추정");
  await page.getByRole("button", { name: "흰색" }).click();
  await page.getByRole("radio", { name: "소형" }).click();
  await page.getByRole("button", { name: "다음" }).click();

  // 4단계 배회 중은 공공 신고 안내가 붙음
  await expect(page.getByText("상태를 골라 주십시오")).toBeVisible();
  await expect(page.getByText("1577-0954")).toBeVisible();
  await page.getByRole("button", { name: "사람을 피함" }).click();
  await page.getByRole("button", { name: "제보하기" }).click();

  // 완료 화면 없이 상세로 바로 이동
  await expect(page).toHaveURL(/\/r\/[0-9a-f-]{36}/, { timeout: 20_000 });
  await expect(page.getByText("흰색 소형견, 말티즈 계열 추정")).toBeVisible();
  await expect(page.getByText("AI 초안, 수정 가능")).toBeVisible();
  await expect(page.getByRole("button", { name: "공유하기" })).toBeVisible();
  // 정확 좌표를 공개 화면에 넣지 않음
  await expect(page.locator("body")).not.toHaveText(/12[0-9]\.\d{4}/);
});

test("신고는 접수만 하고 제보를 바로 숨기지 않는다", async ({ page }) => {
  await page.goto("/report");
  await page.locator("input[type=file]:not([capture])").setInputFiles(PHOTO);
  await expect(page.locator('img[alt="선택한 사진"]')).toBeVisible();
  await page.getByRole("button", { name: "내가 데리고 있음" }).click();
  await page.getByRole("button", { name: "다음" }).click();

  await page.getByRole("button", { name: "직접 선택하기" }).click();
  await page.getByPlaceholder("동, 면, 도로명으로 검색").fill("서교동");
  // 결과 목록의 셀을 눌러야 선택이 됨. 같은 텍스트가 여러 노드에 있어 셀로 좁힘
  await page.locator("li").filter({ hasText: "마포구 서교동" }).first().click();
  await expect(page.getByRole("button", { name: "다음" })).toBeEnabled();
  await page.getByRole("button", { name: "다음" }).click();

  await expect(page.getByText("특징을 확인해 주십시오")).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: "다음" }).click();

  // 보호 중은 인계 안내가 붙음
  await expect(page.getByText(/보호 중인 장소/)).toBeVisible();
  await page.getByRole("button", { name: "제보하기" }).click();
  await expect(page).toHaveURL(/\/r\/[0-9a-f-]{36}/, { timeout: 20_000 });

  await page.getByRole("button", { name: "이 제보 신고하기" }).click();
  await expect(
    page.getByRole("button", { name: "사진에 동물이 보이지 않음" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "사진에 동물이 보이지 않음" }).click();
  await expect(page.getByText("확인 후 조치합니다")).toBeVisible();

  // 접수 직후에도 제보는 그대로 공개 상태
  await page.reload();
  await expect(page.getByRole("button", { name: "공유하기" })).toBeVisible();
});

test("공유 카드는 1080x1350 PNG 로 나온다", async ({ page, request }) => {
  await page.goto("/report");
  await page.locator("input[type=file]:not([capture])").setInputFiles(PHOTO);
  await expect(page.locator('img[alt="선택한 사진"]')).toBeVisible();
  await page.getByRole("button", { name: "배회 중" }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "현재 위치 사용" }).click();
  await expect(page.getByText(/서울|경기|인천/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.getByText("특징을 확인해 주십시오")).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "제보하기" }).click();
  await expect(page).toHaveURL(/\/r\/[0-9a-f-]{36}/, { timeout: 20_000 });

  const id = page.url().split("/r/")[1];
  const card = await request.get(`/r/${id}/card`);
  expect(card.status()).toBe(200);
  expect(card.headers()["content-type"]).toContain("image/png");

  const bytes = Buffer.from(await card.body());
  expect(bytes.subarray(1, 4).toString()).toBe("PNG");
  // IHDR 의 폭과 높이
  expect(bytes.readUInt32BE(16)).toBe(1080);
  expect(bytes.readUInt32BE(20)).toBe(1350);
});
