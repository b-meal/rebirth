import { expect, test, type Page } from "@playwright/test";

import { makePng } from "./fixtures/make-photo.mjs";
import { dismissSplash } from "./fixtures/splash";

// 제보 흐름이 되돌아온 자리에서 막다른 화면에 떨어지지 않는지 보는 자리
// 보는 것이 화면 제어라 모델 응답을 기다리지 않고 분석은 가로채 정해진 답을 줌

const PHOTO = { name: "sighting.png", mimeType: "image/png", buffer: makePng() };

// 품종은 이름만 담음. 계열 추정은 화면이 붙임
const DRAFT = {
  animalType: "dog",
  breedGuess: "말티즈",
  appearance: "흰색 소형견 한 마리",
  color: ["흰색"],
  size: "small",
  condition: "",
  story: "골목 끝에서 혼자 있었어요",
  collarOrHarness: false,
  visibleInjury: false,
  earTip: null,
  confidence: 0.8,
  warnings: [],
};

const JOB_ID = "00000000-0000-4000-8000-000000000001";
const NOT_ANIMAL_MESSAGE = "동물이 보이지 않아요. 동물이 담긴 사진으로 다시 찍어 주세요";

async function stubAnalyze(page: Page, advice: "draft" | "not-animal") {
  await page.route("**/api/draft/analyze", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        jobId: JOB_ID,
        status: "succeeded",
        uploadId: "00000000-0000-4000-8000-000000000002",
        revision: 1,
        draft: DRAFT,
        advice,
        message: advice === "not-animal" ? NOT_ANIMAL_MESSAGE : null,
        model: "claude-sonnet-5",
        analyzedAt: new Date().toISOString(),
      }),
    });
  });
}

/** 1단계에서 앨범 입력으로 사진 한 장을 올리고 2단계로 보냄 */
async function goToDetailStep(page: Page) {
  await page.goto("/report");
  await dismissSplash(page);
  await page.locator("input[type=file]:not([capture])").setInputFiles(PHOTO);
  await expect(page.getByText("이 사진으로 할까요")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page).toHaveURL(/step=2/);
}

test("비동물로 되돌린 뒤 뒤로가기가 빈 2단계에 착지하지 않는다", async ({ page }) => {
  // 되돌림을 걸음으로 쌓으면 뒤로가기 한 칸 뒤에 갈 수 없는 2단계가 남음
  await stubAnalyze(page, "not-animal");
  await goToDetailStep(page);

  await expect(page.getByRole("heading", { name: "다시 찍어 주세요" })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("button", { name: "확인" }).click();
  await expect(page).toHaveURL(/step=1/);

  // 알럿이 시킨 대로 문제 사진을 지움
  await page.getByRole("button", { name: "사진 1 삭제" }).click();
  await expect(page.getByText("발견한 동물을 찍어 주세요")).toBeVisible();

  await page.goBack();
  await expect(page).not.toHaveURL(/step=2/);
  await expect(page.getByText("사진을 정리하고 있어요")).toHaveCount(0);
  await expect(page.getByText("발견한 동물을 찍어 주세요")).toBeVisible();
});

test("사진을 지운 뒤 앞으로가기로 2단계에 가지 못한다", async ({ page }) => {
  // 사진 없는 2단계는 올릴 것도 분석할 것도 없어 아무것도 끝나지 않는 화면이 됨
  await stubAnalyze(page, "draft");
  await goToDetailStep(page);
  await expect(page.getByText("AI 초안")).toBeVisible({ timeout: 20_000 });

  await page.goBack();
  await expect(page.getByText("이 사진으로 할까요")).toBeVisible();
  await page.getByRole("button", { name: "사진 1 삭제" }).click();
  await expect(page.getByText("발견한 동물을 찍어 주세요")).toBeVisible();

  await page.goForward();
  await expect(page).not.toHaveURL(/step=2/);
  await expect(page.getByText("사진을 정리하고 있어요")).toHaveCount(0);
  await expect(page.getByText("발견한 동물을 찍어 주세요")).toBeVisible();
});

test("분석에 실패하면 알리고 다음 을 누르면 다시 분석한다", async ({ page }) => {
  // 사진은 이미 올라가 있어 다시 올리지 않고 분석만 다시 함
  let calls = 0;
  await page.route("**/api/draft/analyze", async (route) => {
    calls += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        calls === 1
          ? { jobId: JOB_ID, status: "failed", advice: "failed", message: "잠시 후 다시 시도해 주세요" }
          : {
              jobId: JOB_ID,
              status: "succeeded",
              draft: DRAFT,
              advice: "draft",
              message: null,
              model: "claude-sonnet-5",
              analyzedAt: new Date().toISOString(),
            },
      ),
    });
  });

  await goToDetailStep(page);

  await expect(page.getByRole("heading", { name: "분석에 실패했어요" })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("button", { name: "확인" }).click();
  await expect(page).toHaveURL(/step=1/);

  // 같은 사진으로 다시 걸어 들어감
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.getByText("AI 초안")).toBeVisible({ timeout: 20_000 });
});

test("사진이 안 올라가도 그 자리에서 다시 올린다", async ({ page }) => {
  // 한 장이라도 실패하면 참조가 모자라 등록이 끝까지 막혔음
  await stubAnalyze(page, "draft");

  let attempts = 0;
  await page.route("**/api/draft/uploads", async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "사진을 올리지 못했어요" }),
      });
      return;
    }
    await route.continue();
  });

  await goToDetailStep(page);

  const retry = page.getByRole("button", { name: /다시 올리기/ });
  await expect(retry).toBeVisible({ timeout: 20_000 });
  await retry.click();

  // 참조를 다시 받아 분석까지 이어짐
  await expect(page.getByText("AI 초안")).toBeVisible({ timeout: 20_000 });
});
