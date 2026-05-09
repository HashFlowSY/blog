import { expect } from "@playwright/test";

import { test } from "./fixtures";
import { goToPosts, getText } from "./helpers/navigation";

test.describe("Post detail", () => {
  test("renders post metadata", async ({ page }) => {
    const zh = getText("zh-CN");

    await goToPosts(page);

    const firstPostTitle = await page
      .locator("article")
      .first()
      .getByRole("heading")
      .textContent();

    await Promise.all([
      page.waitForURL(/\/posts\/.+\/$/),
      page.locator("article a").first().click(),
    ]);

    await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(
      firstPostTitle!,
    );

    await expect(
      page.locator(".detail-panel").getByText(new RegExp(`\\d+ ${zh.minutes}`)),
    ).toBeVisible();
  });

  test("related reading section exists", async ({ page }) => {
    await goToPosts(page);

    await Promise.all([
      page.waitForURL(/\/posts\/.+\/$/),
      page.locator("article a").first().click(),
    ]);

    await expect(page.getByRole("heading", { name: "关联阅读" })).toBeVisible();
    await expect(page.locator(".related-section")).toBeAttached();
  });

  test("back link returns to the posts archive", async ({ page }) => {
    await goToPosts(page);

    await Promise.all([
      page.waitForURL(/\/posts\/.+\/$/),
      page.locator("article a").first().click(),
    ]);

    await Promise.all([
      page.waitForURL(/\/posts\/$/),
      page.getByRole("link", { name: "返回文章档案室" }).click(),
    ]);

    await expect(page.getByRole("heading", { name: "档案室" })).toBeVisible();
  });
});
