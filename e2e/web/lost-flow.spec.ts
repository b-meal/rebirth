import { expect, test } from "@playwright/test";

import { makePng } from "./fixtures/make-photo.mjs";

// 실종 신고와 후보 조회
// 점수 계산은 단위 테스트가 지키고 여기서는 화면 규칙을 확인함

const PHOTO = { name: "pet.png", mimeType: "image/png", buffer: makePng() };

// 실종 위치. 목격 제보도 같은 동네에 만들어 후보가 잡히게 함
const 서교동 = { latitude: 37.5561, longitude: 126.9231 };

test.use({
  geolocation: 서교동,
  permissions: ["geolocation", "clipboard-read", "clipboard-write"],
});

/** 후보로 쓸 목격 제보를 하나 만들어 둠 */
async function seedSighting(request: import("@playwright/test").APIRequestContext) {
  const response = await request.post("/api/reports", {
    multipart: {
      photo: PHOTO,
      payload: JSON.stringify({
        careSituation: "roaming",
        animalType: "dog",
        appearance: "흰색 소형견, 말티즈 계열 추정",
        colors: ["흰색"],
        size: "small",
        collar: true,
        injury: false,
        coordinates: { lat: 37.5626, lng: 126.9257 },
        areaName: "서울 마포구 연남동",
        // 실종보다 나중이어야 시간 점수를 받음
        occurredAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
        conditionTags: ["배회 중"],
      }),
    },
  });
  expect(response.status()).toBe(201);
}

test("실종 신고를 등록하면 조회 주소를 한 번 받고 후보를 확인한다", async ({
  page,
  request,
}) => {
  await seedSighting(request);

  await page.goto("/lost/new");
  await expect(page.getByText("반려동물을 잃어버렸어요")).toBeVisible();
  // 연락처를 받지 않는다는 약속이 화면에 드러나야 함
  await expect(page.getByText(/연락처는 받지 않습니다/)).toBeVisible();
  await expect(page.locator('input[type="tel"]')).toHaveCount(0);
  await expect(page.locator('input[type="email"]')).toHaveCount(0);

  await expect(page.getByRole("button", { name: "신고 등록하기" })).toBeDisabled();

  await page.locator('input[type=file]').setInputFiles(PHOTO);
  await expect(page.locator('img[alt="잃어버린 반려동물 사진"]')).toBeVisible();

  await page.getByRole("button", { name: "현재 위치 사용" }).click();
  await expect(page.getByText(/서울|마포/).first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "흰색" }).click();
  await page.getByRole("radio", { name: "소형" }).click();

  await expect(page.getByRole("button", { name: "신고 등록하기" })).toBeEnabled();
  await page.getByRole("button", { name: "신고 등록하기" }).click();

  // 토큰 화면. 복사 전에는 이동을 막음
  await expect(page.getByText("신고를 등록했습니다")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText(/이 주소를 잃으면/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /주소를 복사하면/ }),
  ).toBeDisabled();

  await page.getByRole("button", { name: "주소 복사하기" }).click();
  await expect(page.getByRole("button", { name: "복사했습니다" })).toBeVisible();

  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("/lost/");

  await page.getByRole("button", { name: "확인할 후보 보기" }).click();

  // 후보 조회. 점수 옆에 유사도 문구가 항상 붙음
  await expect(page.getByText(/확인할 후보/)).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByText("유사도이며 동일 개체 확정이 아닙니다").first(),
  ).toBeVisible();
  await expect(page.getByText(/마지막 위치에서/)).toBeVisible();
  // 배점 구성 5개를 모두 노출
  await expect(page.getByText(/거리 35 중/)).toBeVisible();
  await expect(page.getByText(/시간 25 중/)).toBeVisible();
  await expect(page.getByText(/털색 20 중/)).toBeVisible();
  await expect(page.getByText(/크기 10 중/)).toBeVisible();
  await expect(page.getByText(/특징 10 중/)).toBeVisible();
});

test("후보는 제스처 없이 버튼과 키보드로 훑을 수 있다", async ({ page, request }) => {
  await seedSighting(request);
  await seedSighting(request);

  // 화면을 거치지 않고 신고를 만들어 토큰을 받음
  const created = await request.post("/api/lost", {
    multipart: {
      photo: PHOTO,
      payload: JSON.stringify({
        animalType: "dog",
        appearance: "왼쪽 귀에 갈색 반점",
        colors: ["흰색"],
        size: "small",
        collar: true,
        coordinates: { lat: 서교동.latitude, lng: 서교동.longitude },
        areaName: "서울 마포구 서교동",
        occurredAt: new Date(Date.now() - 6 * 3_600_000).toISOString(),
      }),
    },
  });
  expect(created.status()).toBe(201);
  const { token } = (await created.json()) as { token: string };

  await page.goto(`/lost/${token}`);
  await expect(page.getByText(/확인할 후보/)).toBeVisible({ timeout: 20_000 });

  // 첫 장에서는 되돌리기가 막혀 있음
  await expect(page.getByRole("button", { name: "되돌리기" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "맞는 것 같아요" })).toBeVisible();
  await expect(page.getByRole("button", { name: "아니에요" })).toBeVisible();

  // 앞선 테스트가 남긴 제보 때문에 전체 건수는 고정되지 않음. 순서만 확인
  const progress = page.getByText(/^\d+ \/ \d+$/);
  await expect(progress).toHaveText(/^1 \//);
  await page.getByRole("button", { name: "판정하지 않고 넘기기" }).click();
  await expect(progress).toHaveText(/^2 \//);

  // 키보드만으로도 같은 일을 할 수 있어야 함
  await page.keyboard.press("ArrowDown");
  await expect(progress).toHaveText(/^1 \//);
  await page.keyboard.press("Enter");
  await expect(page.getByText("이 후보를 표시했습니다")).toBeVisible();
});

test("잘못된 조회 주소는 안내만 하고 다른 정보를 내주지 않는다", async ({ page }) => {
  await page.goto("/lost/이건-없는-토큰-입니다");
  await expect(page.getByText("조회 주소가 맞지 않습니다")).toBeVisible({
    timeout: 15_000,
  });
  // 후보나 신고 내용이 새어 나오지 않음
  await expect(page.getByText(/확인할 후보/)).toHaveCount(0);
});
