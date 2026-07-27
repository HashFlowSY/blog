import { expect } from "@playwright/test";

import { test } from "./fixtures";
import { goToPosts, getText } from "./helpers/navigation";

test.describe("Posts list", () => {
  test("renders published articles with topic context", async ({ page }) => {
    const zh = getText("zh-CN");

    await goToPosts(page);

    await expect(
      page.getByRole("heading", { name: zh.allPosts }),
    ).toBeVisible();

    await expect(page.getByLabel("当前写作主题")).toBeVisible();
    await expect(page.getByLabel("文章列表")).toBeVisible();
    await expect(page.locator(".portfolio-article-row").first()).toBeVisible();
  });

  test("clicking post card navigates to detail", async ({ page }) => {
    await goToPosts(page);

    const firstPost = page.locator("article a").first();
    await Promise.all([page.waitForURL(/\/posts\/.+\/$/), firstPost.click()]);

    expect(page.url()).toMatch(/\/posts\/.+\/$/);
  });
});
