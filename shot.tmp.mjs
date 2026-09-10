import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("response", async (r) => {
  if (r.url().includes("/api/draft/analyze")) {
    console.log("analyze 응답:", JSON.stringify(await r.json().catch(() => null)).slice(0, 400));
  }
});
await page.goto("http://localhost:3000/search", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(1500);
await page.getByRole("button", { name: "사진으로 찾기" }).click();
await page.waitForTimeout(1000);
await page.locator('input[type=file]').nth(1).setInputFiles("/tmp/dog.jpg");
await page.waitForTimeout(20000);
await browser.close();
