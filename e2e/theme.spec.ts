import { expect } from "@playwright/test";

import { test } from "./fixtures";
import { goToHome } from "./helpers/navigation";

test.describe("Industrial shell behavior", () => {
  test("uses the fixed industrial theme without a theme toggle", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await goToHome(page, "zh-CN");

    await expect(
      page.getByRole("button", { name: "Toggle theme" }),
    ).toHaveCount(0);
    await expect(page.locator(".site-frame")).toBeVisible();
    await expect(page.locator(".scrap-monument")).toBeVisible();
  });

  test("reveals the back-to-top control after scrolling", async ({ page }) => {
    await goToHome(page, "zh-CN");

    const backToTop = page.locator(".back-to-top");
    await expect(backToTop).toHaveAttribute("aria-hidden", "true");

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(backToTop).toHaveAttribute("aria-hidden", "false");
  });
});
