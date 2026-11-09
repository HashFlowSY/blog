import { expect } from "@playwright/test";

import { SITE_COPY, test } from "./fixtures";
import { goToPosts } from "./helpers/navigation";

test.describe("Posts list", () => {
  test("renders published articles with topic context", async ({ page }) => {
    const copy = SITE_COPY;

    await goToPosts(page);

    await expect(
      page.getByRole("heading", { name: copy.allPosts }),
    ).toBeVisible();

    await expect(page.getByLabel("当前写作主题")).toBeVisible();
    await expect(page.locator("section[aria-label='文章列表']")).toBeVisible();
    expect(
      await page.locator(".portfolio-article-row").count(),
    ).toBeGreaterThan(0);
  });
});
