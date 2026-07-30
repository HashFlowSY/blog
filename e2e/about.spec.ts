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
    await expect(page.locator(".portfolio-skill-card").first()).toBeVisible();

    await expect(page.getByLabel(copy.experience)).toBeVisible();
    await expect(
      page
        .getByLabel(copy.aboutTitle)
        .getByRole("link", { name: "GitHub / HashFlowSY" }),
    ).toHaveAttribute("href", "https://github.com/HashFlowSY");
  });
});
