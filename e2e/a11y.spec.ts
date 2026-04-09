import { expect } from "@playwright/test";

import { test } from "./fixtures";
import { goToHome } from "./helpers/navigation";

test.describe("Accessibility", () => {
  test("basic accessibility structure on home page", async ({ page }) => {
    await goToHome(page, "zh-CN");

    const html = page.locator("html");
    await expect(html).toHaveAttribute("lang", "zh-CN");

    const skipLink = page.locator('[data-testid="skip-link"]');
    await expect(skipLink).toBeAttached();
    await expect(skipLink).toHaveAttribute("href", "#main-content");

    const main = page.locator("main#main-content");
    await expect(main).toBeAttached();

    const mainNav = page.locator('nav[aria-label="Main navigation"]');
    await expect(mainNav).toBeAttached();
  });
});
