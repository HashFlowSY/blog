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

  test("project archive links the stable public Project Case", async ({
    page,
  }) => {
    await goToProjects(page, "zh-CN");

    await expect(
      page.getByRole("link", { name: "Personal Blog", exact: true }),
    ).toHaveAttribute("href", "/projects/personal-blog/");
    await expect(
      page.locator(
        'a[href="/projects/personal-blog/"] .portfolio-project-kind',
      ),
    ).toHaveText("项目案例");
    await expect(page.getByLabel("项目筛选")).toHaveCount(0);
  });
});
