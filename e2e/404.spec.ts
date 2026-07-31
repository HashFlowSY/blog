import { expect } from "@playwright/test";

import { test } from "./fixtures";
import { relativeRoute } from "./helpers/navigation";

import type { Page } from "@playwright/test";

async function expectNotFoundRoute(
  page: Page,
  pathname: string,
): Promise<void> {
  const response = await page.goto(relativeRoute(pathname));
  if (!response) {
    throw new Error(`No response for missing route ${pathname}`);
  }

  expect(response.status(), pathname).toBe(404);
  await page.waitForLoadState("networkidle");

  await expect(page).toHaveTitle("Hashflow｜AI 全栈工程师");
  await expect(
    page.locator("main#content").getByRole("heading", { name: "页面不存在" }),
  ).toBeVisible();
  await expect(page.getByText("404 / missing signal")).toBeVisible();
  await expect(
    page.getByText("这条通信线路没有找到对应的页面。"),
  ).toBeVisible();

  const robots = await page
    .locator('meta[name="robots"]')
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("content") ?? ""),
    );
  expect(robots.some((content) => /\bnoindex\b/i.test(content))).toBe(true);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);

  const homeLink = page.getByRole("link", { name: "返回首页" });
  await expect(homeLink).toHaveAttribute("href", /\/(?:blog\/)?$/);
}

test.describe("404 page", () => {
  test("a missing route renders the not-found document", async ({ page }) => {
    await expectNotFoundRoute(page, "/nonexistent-page/");
  });
});
