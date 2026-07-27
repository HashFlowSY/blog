import { expect } from "@playwright/test";

import { test } from "./fixtures";
import { goToPosts, goToProjects } from "./helpers/navigation";

test.describe("Archive structure", () => {
  test("article archive keeps one scannable list", async ({ page }) => {
    await goToPosts(page, "zh-CN");

    const articles = page.locator(".portfolio-article-list article");
    expect(await articles.count()).toBeGreaterThan(0);
    await expect(page.getByLabel("当前写作主题")).toBeVisible();
    await expect(page.getByLabel("文章筛选")).toHaveCount(0);
  });

  test("project archive clearly distinguishes real and template cases", async ({
    page,
  }) => {
    await goToProjects(page, "zh-CN");

    const projects = page.locator(".portfolio-project-grid article");
    expect(await projects.count()).toBeGreaterThanOrEqual(3);
    await expect(page.getByText("真实项目").first()).toBeVisible();
    await expect(page.getByText("示例案例").first()).toBeVisible();
    await expect(page.getByLabel("项目筛选")).toHaveCount(0);
  });
});
