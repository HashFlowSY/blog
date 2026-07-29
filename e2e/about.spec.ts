import { expect } from "@playwright/test";

import { test } from "./fixtures";
import { goToAbout, getText } from "./helpers/navigation";

test.describe("About page", () => {
  test("renders skills and experience", async ({ page }) => {
    const zh = getText("zh-CN");

    await goToAbout(page);

    await expect(
      page.getByRole("heading", { name: zh.aboutTitle }),
    ).toBeVisible();

    await expect(page.getByLabel(zh.skills)).toBeVisible();
    await expect(page.locator(".portfolio-skill-card").first()).toBeVisible();

    await expect(page.getByLabel(zh.experience)).toBeVisible();
    await expect(
      page
        .getByLabel(zh.aboutTitle)
        .getByRole("link", { name: "GitHub / HashFlowSY" }),
    ).toHaveAttribute("href", "https://github.com/HashFlowSY");
  });
});
