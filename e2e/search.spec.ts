import { expect } from "@playwright/test";

import { LOCALES, test } from "./fixtures";
import { goToPosts } from "./helpers/navigation";

test.describe("Search integration", () => {
  test("typing search query shows matching results", async ({ page }) => {
    await goToPosts(page, "zh-CN");

    const searchInput = page.locator('input[role="combobox"]');
    await expect(searchInput).toBeVisible();

    // Get the title of the first post to use as a content-agnostic search query
    const firstPostTitle = await page
      .locator("article")
      .first()
      .getByRole("heading")
      .textContent();

    // Type the first word of the title
    const firstWord = firstPostTitle?.split(/\s+/)[0] ?? "";
    await searchInput.pressSequentially(firstWord, { delay: 100 });

    const listbox = page.locator('[role="listbox"]');
    await expect(listbox).toBeVisible();

    const resultItems = listbox.locator('[role="option"]');
    await expect(resultItems.first()).toContainText(firstPostTitle!);
  });

  test("no matching results shows empty state", async ({ page }) => {
    await goToPosts(page, "zh-CN");

    const searchInput = page.locator('input[role="combobox"]');
    await expect(searchInput).toBeVisible();

    await searchInput.pressSequentially("xyznonexistent123", { delay: 100 });

    const listbox = page.locator('[role="listbox"]');
    await expect(listbox).toContainText(LOCALES["zh-CN"].noResults);

    const resultItems = listbox.locator('[role="option"]');
    await expect(resultItems).toHaveCount(0);
  });

  test("clearing search restores full article list", async ({ page }) => {
    await goToPosts(page, "zh-CN");

    const searchInput = page.locator('input[role="combobox"]');
    await expect(searchInput).toBeVisible();

    // Get the first post title for a content-agnostic search query
    const firstPostTitle = await page
      .locator("article")
      .first()
      .getByRole("heading")
      .textContent();

    const firstWord = firstPostTitle?.split(/\s+/)[0] ?? "";
    await searchInput.pressSequentially(firstWord, { delay: 100 });

    const listbox = page.locator('[role="listbox"]');
    await expect(listbox).toBeVisible();

    const clearButton = page.locator(
      'button[aria-label="Clear search"], button[aria-label="清除搜索"]',
    );
    await expect(clearButton).toBeVisible();
    await clearButton.click();

    await expect(searchInput).toHaveValue("");

    const postCards = page.locator("article");
    await expect(postCards.first()).toBeVisible();
  });
});
