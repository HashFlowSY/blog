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
      page.waitForURL(/\/zh-CN\/posts\/.+\/$/),
      page.locator("article a").first().click(),
    ]);

    await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(
      firstPostTitle!,
    );

    await expect(page.getByText(zh.publishedAt)).toBeVisible();
    await expect(page.getByText(zh.minutes)).toBeVisible();
  });

  test("table of contents exists", async ({ page }) => {
    await goToPosts(page);

    await Promise.all([
      page.waitForURL(/\/zh-CN\/posts\/.+\/$/),
      page.locator("article a").first().click(),
    ]);

    const toc = page.locator('nav[aria-label="Table of contents"]');
    await expect(toc).toBeAttached();

    const tocLinks = toc.locator("a");
    await expect(tocLinks.first()).toBeVisible();
  });

  test("previous and next post navigation exists", async ({ page }) => {
    await goToPosts(page);

    await Promise.all([
      page.waitForURL(/\/zh-CN\/posts\/.+\/$/),
      page.locator("article a").first().click(),
    ]);

    await expect(
      page.locator('nav[aria-label="Post navigation"]'),
    ).toBeAttached();
  });

  test("copy link button works", async ({ page }) => {
    await goToPosts(page);

    await Promise.all([
      page.waitForURL(/\/zh-CN\/posts\/.+\/$/),
      page.locator("article a").first().click(),
    ]);

    const copyButton = page.getByRole("button", { name: "Copy link" });
    await expect(copyButton).toBeVisible();

    await copyButton.click();

    await expect(copyButton).not.toContainText("Copy link");
    await expect(copyButton).toContainText("Copied");
  });
});
