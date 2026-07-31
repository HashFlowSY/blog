import { expect } from "@playwright/test";

import { SITE_COPY, test } from "./fixtures";
import { goToAbout } from "./helpers/navigation";

test.describe("About page", () => {
  test("renders skills and experience", async ({ page }) => {
    const copy = SITE_COPY;

    await goToAbout(page);

    await expect(
      page.getByRole("heading", { name: copy.aboutTitle }),
    ).toBeVisible();

    await expect(page.getByLabel(copy.skills)).toBeVisible();
    expect(await page.locator(".portfolio-skill-card").count()).toBeGreaterThan(
      0,
    );

    await expect(page.getByLabel(copy.experience)).toBeVisible();
    const githubLinks = page.locator('a[href="https://github.com/HashFlowSY"]');
    expect(await githubLinks.count()).toBeGreaterThan(0);
  });
});
