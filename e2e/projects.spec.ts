import { expect } from "@playwright/test";

import { SITE_COPY, test } from "./fixtures";
import { goToProjects } from "./helpers/navigation";

test.describe("Projects", () => {
  test("project list renders project cards", async ({ page }) => {
    const copy = SITE_COPY;

    await goToProjects(page);

    await expect(
      page.getByRole("heading", { name: copy.allProjects }),
    ).toBeVisible();

    const projectCards = page.locator("article");
    await expect(projectCards.first()).toBeVisible();
    await expect(projectCards.first().getByRole("heading")).toBeVisible();
  });

  test("project detail renders full info", async ({ page }) => {
    const copy = SITE_COPY;

    await goToProjects(page);

    const firstProjectTitle = await page
      .locator("article")
      .first()
      .getByRole("heading")
      .textContent();

    await Promise.all([
      page.waitForURL(/\/projects\/.+\/$/),
      page.locator("article a").first().click(),
    ]);

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      firstProjectTitle!,
    );

    const sourceLink = page.getByRole("link", { name: copy.source });
    await expect(sourceLink).toHaveAttribute("href", /github\.com/);

    const demoLink = page.getByRole("link", { name: copy.demo });
    await expect(demoLink).toBeVisible();
  });
});
