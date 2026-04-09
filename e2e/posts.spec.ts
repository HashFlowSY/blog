import { expect } from "@playwright/test";

import { test } from "./fixtures";
import { goToPosts, getText } from "./helpers/navigation";

test.describe("Posts list", () => {
  test("renders published articles with search and tags", async ({ page }) => {
    const zh = getText("zh-CN");

    await goToPosts(page);

    await expect(
      page.getByRole("heading", { name: zh.allPosts }),
    ).toBeVisible();

    await expect(page.locator('input[role="combobox"]')).toBeVisible();

    const tagButtons = page.locator("button").filter({ hasText: zh.all });
    await expect(tagButtons.first()).toBeVisible();
  });

  test("tag filtering works", async ({ page }) => {
    await goToPosts(page);

    await page.locator("button").filter({ hasText: "general" }).first().click();

    const postCards = page.locator("article");
    await expect(postCards).toHaveCount(1);

    await page.locator("button").filter({ hasText: "全部" }).first().click();

    await expect(postCards).toHaveCount(2);

    await page.locator("button").filter({ hasText: "nextjs" }).first().click();

    await expect(postCards).toHaveCount(1);
  });

  test("clicking post card navigates to detail", async ({ page }) => {
    await goToPosts(page);

    const firstPost = page.locator("article a").first();
    await Promise.all([
      page.waitForURL(/\/zh-CN\/posts\/.+\/$/),
      firstPost.click(),
    ]);

    expect(page.url()).toMatch(/\/zh-CN\/posts\/.+\/$/);
  });
});
