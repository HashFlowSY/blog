import { expect } from "@playwright/test";

import { STABLE_PROJECT, test } from "./fixtures";
import { goToPosts, goToProjects } from "./helpers/navigation";

test.describe("Archive structure", () => {
  test("article archive keeps one scannable list", async ({ page }) => {
    await goToPosts(page);

    const articles = page.locator("section[aria-label='文章列表'] article");
    expect(await articles.count()).toBeGreaterThan(0);
    await expect(page.getByLabel("当前写作主题")).toBeVisible();
    await expect(page.getByLabel("文章筛选")).toHaveCount(0);
  });

  test("project archive links the stable public Project Case", async ({
    page,
  }) => {
    await goToProjects(page);

    const projectLink = page.getByRole("link", {
      name: STABLE_PROJECT.title,
      exact: true,
    });
    await expect(projectLink).toHaveAttribute(
      "href",
      new RegExp(`/projects/${STABLE_PROJECT.slug}/$`),
    );
    await expect(
      page.locator(
        `a[href$="/projects/${STABLE_PROJECT.slug}/"] .portfolio-project-kind`,
      ),
    ).toHaveText("项目案例");
    await expect(page.getByLabel("项目筛选")).toHaveCount(0);
  });
});
