import { expect } from "@playwright/test";

import { test } from "./fixtures";
import { goToProjects, getText } from "./helpers/navigation";

test.describe("Projects", () => {
  test("project list renders project cards", async ({ page }) => {
    const zh = getText("zh-CN");

    await goToProjects(page);

    await expect(
      page.getByRole("heading", { name: zh.allProjects }),
    ).toBeVisible();

    const projectCards = page.locator("article");
    await expect(projectCards.first()).toBeVisible();
    await expect(projectCards.first().getByRole("heading")).toBeVisible();
  });

  test("project detail renders full info", async ({ page }) => {
    const zh = getText("zh-CN");

    await goToProjects(page);

    const firstProjectTitle = await page
      .locator("article")
      .first()
      .getByRole("heading")
      .textContent();

    await Promise.all([
      page.waitForURL(/\/zh-CN\/projects\/.+\/$/),
      page.locator("article a").first().click(),
    ]);

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      firstProjectTitle!,
    );

    const sourceLink = page.getByRole("link", { name: zh.source });
    await expect(sourceLink).toHaveAttribute("href", /github\.com/);

    const demoLink = page.getByRole("link", { name: zh.demo });
    await expect(demoLink).toBeVisible();
  });
});
