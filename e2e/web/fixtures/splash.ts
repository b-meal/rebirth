import { expect, type Page } from "@playwright/test";

// 문서로 들어올 때마다 덮개가 화면 전체를 덮고 스스로 걷히지 않음
// 걷는 방법이 단추를 누르는 것뿐이라 테스트도 사람이 하는 대로 누름

export async function dismissSplash(page: Page): Promise<void> {
  const splash = page.locator("[data-splash]");
  if ((await splash.count()) === 0) return;

  // 단추는 로고 이미지와 글꼴이 닿은 뒤에야 눌리므로 기다렸다 누름
  // 지도 둘러보기 는 옮겨 가지 않고 덮개만 걷어 어느 화면에서든 쓸 수 있음
  await splash.getByRole("button", { name: "지도 둘러보기" }).click();
  await expect(splash).toHaveCount(0);
}
