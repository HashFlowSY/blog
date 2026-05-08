import { expect } from "@playwright/test";

import { test } from "./fixtures";
import { goToPosts, goToProjects } from "./helpers/navigation";

test.describe("Filter integration", () => {
  test("article filter buttons narrow and restore the archive list", async ({
    page,
  }) => {
    await goToPosts(page, "zh-CN");

    const articles = page.locator(".article-list article");
    const totalCount = await articles.count();
    expect(totalCount).toBeGreaterThan(0);

    const filters = page.getByLabel("文章筛选").getByRole("button");
    const filterCount = await filters.count();
    expect(filterCount).toBeGreaterThan(0);

    if (filterCount > 1) {
      await filters.nth(1).click();
      expect(await articles.count()).toBeLessThanOrEqual(totalCount);
      await expect(filters.nth(1)).toHaveAttribute("aria-pressed", "true");
    }

    await filters.first().click();
    await expect(filters.first()).toHaveAttribute("aria-pressed", "true");
    await expect(articles).toHaveCount(totalCount);
  });

  test("project filter buttons narrow the project board", async ({ page }) => {
    await goToProjects(page, "zh-CN");

    const projects = page.locator(".project-grid article");
    const totalCount = await projects.count();
    expect(totalCount).toBeGreaterThan(0);

    const filters = page.getByLabel("项目筛选").getByRole("button");
    const filterCount = await filters.count();
    expect(filterCount).toBeGreaterThan(0);

    if (filterCount > 1) {
      await filters.nth(1).click();
      expect(await projects.count()).toBeLessThanOrEqual(totalCount);
      await expect(filters.nth(1)).toHaveAttribute("aria-pressed", "true");
    }
  });
});
