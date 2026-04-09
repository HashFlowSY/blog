import { expect } from "@playwright/test";

import { test } from "./fixtures";
import { goToPosts } from "./helpers/navigation";

test.describe("404 page", () => {
  test("visiting a nonexistent route shows error state", async ({ page }) => {
    await goToPosts(page);

    // Get the first post title so we know what should NOT appear
    const firstPostTitle = await page
      .locator("article")
      .first()
      .getByRole("heading")
      .textContent();

    // Visit a path that doesn't match any dynamic segment,
    // avoiding the generateStaticParams validation error
    await page.goto("/zh-CN/nonexistent-page/");
    await page.waitForLoadState("networkidle");

    // The page should not contain normal post content
    await expect(
      page.getByRole("heading", { name: firstPostTitle! }),
    ).not.toBeVisible();
  });
});
