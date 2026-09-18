import { expect, test, type Page } from "@playwright/test";

import { dismissSplash } from "./fixtures/splash";

// 홈 지도 위 시트가 손가락과 키보드 양쪽으로 같은 단계에 붙는지 보는 자리
// 손잡이는 button 이라 스크린리더가 누르라고 읽어 주므로 Enter 와 화살표로도 열려야 함

const 서교동 = { latitude: 37.5561, longitude: 126.9231 };

test.use({ geolocation: 서교동, permissions: ["geolocation"] });

/** 시트 윗변의 화면 안 세로 자리, 단계가 올라갈수록 작아짐 */
async function sheetTop(page: Page) {
  return page.locator("section").first().evaluate((el) => Math.round(el.getBoundingClientRect().top));
}

function handle(page: Page) {
  return page.getByRole("button", { name: /목록 펼치기|목록 접기/ }).first();
}

async function openHome(page: Page) {
  await page.goto("/");
  await dismissSplash(page);
  await expect(page.locator(".rebirth-my-location")).toBeVisible({ timeout: 20_000 });
  // 붙는 애니메이션이 끝난 자리를 재도록 한 박자 둠
  await page.waitForTimeout(500);
}

test("키보드만으로 시트를 펼치고 접는다", async ({ page }) => {
  await openHome(page);
  const collapsed = await sheetTop(page);

  await handle(page).focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => sheetTop(page), { timeout: 5000 }).toBeLessThan(collapsed);

  await page.keyboard.press("ArrowDown");
  await expect.poll(() => sheetTop(page), { timeout: 5000 }).toBe(collapsed);

  // 한 단 더 내리면 시트를 화면 밖으로 걷고 손잡이 알약만 남김
  await page.keyboard.press("ArrowDown");
  const viewport = page.viewportSize()?.height ?? 0;
  await expect.poll(() => sheetTop(page), { timeout: 5000 }).toBe(viewport);
  await expect(page.getByRole("button", { name: /제보 \d+건, 목록 펼치기/ })).toBeVisible();
});

test("끌어 올리면 단계에 붙고 튕기면 한 단계 넘어간다", async ({ page }) => {
  await openHome(page);
  const collapsed = await sheetTop(page);

  const box = await handle(page).boundingBox();
  if (!box) throw new Error("손잡이를 찾지 못했습니다");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  // 천천히 끌면 손을 뗀 자리에서 가장 가까운 단계로
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 30; i += 1) {
    await page.mouse.move(x, y - i * 5);
    await page.waitForTimeout(20);
  }
  await page.mouse.up();
  await expect.poll(() => sheetTop(page), { timeout: 5000 }).toBeLessThan(collapsed);
  // 붙는 동안 손잡이가 아직 움직여 다음 제스처는 다 붙은 뒤에 잡음
  await page.waitForTimeout(700);

  // 아래로 튕기면 40px 만 끌어도 한 단계 내려옴, 거리가 아니라 속도로 판정한다는 뜻
  const flick = await handle(page).boundingBox();
  if (!flick) throw new Error("손잡이를 찾지 못했습니다");
  const fx = flick.x + flick.width / 2;
  const fy = flick.y + flick.height / 2;
  await page.mouse.move(fx, fy);
  await page.mouse.down();
  for (let i = 1; i <= 4; i += 1) {
    await page.mouse.move(fx, fy + i * 10);
  }
  await page.mouse.up();
  await expect.poll(() => sheetTop(page), { timeout: 5000 }).toBe(collapsed);
});
