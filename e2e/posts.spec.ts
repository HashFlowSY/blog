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
    const zh = getText("zh-CN");

    await goToPosts(page);

    const postCards = page.locator("article");
    const totalCount = await postCards.count();
    expect(totalCount).toBeGreaterThan(0);

    // Click the last tag button (assumed to be a specific tag, not "All")
    const allTagButtons = page.locator("button").filter({ hasText: zh.all });
    const lastTag = allTagButtons.last();

    // If there's only one tag button ("All"), skip this test
    const tagCount = await allTagButtons.count();
    if (tagCount <= 1) return;

    await lastTag.click();

    // After filtering, count should be less than total
    const filteredCount = await postCards.count();
    expect(filteredCount).toBeLessThan(totalCount);

    // Reset by clicking "All"
    await allTagButtons.first().click();
    await expect(postCards).toHaveCount(totalCount);
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
