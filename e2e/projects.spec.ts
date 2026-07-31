import { expect } from "@playwright/test";

import { SITE_COPY, STABLE_PROJECT, test } from "./fixtures";
import { goToProject, goToProjects } from "./helpers/navigation";

test.describe("Projects", () => {
  test("project list renders project cards", async ({ page }) => {
    const copy = SITE_COPY;

    await goToProjects(page);

    await expect(
      page.getByRole("heading", { name: copy.allProjects }),
    ).toBeVisible();

    const projectCards = page.locator("article");
    expect(await projectCards.count()).toBeGreaterThan(0);

    await expect(
      page.getByRole("link", { name: STABLE_PROJECT.title, exact: true }),
    ).toBeVisible();
  });

  test("project detail renders full info", async ({ page }) => {
    const copy = SITE_COPY;

    await goToProject(page, STABLE_PROJECT.slug);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      STABLE_PROJECT.title,
    );
    await expect(page.getByText(STABLE_PROJECT.description)).toBeVisible();

    const sourceLink = page.getByRole("link", { name: copy.source });
    await expect(sourceLink).toHaveAttribute("href", /github\.com/);

    const demoLink = page.getByRole("link", { name: copy.demo });
    await expect(demoLink).toBeVisible();
  });
});
