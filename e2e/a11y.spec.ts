import { expect } from "@playwright/test";

import { test } from "./fixtures";
import { goToHome } from "./helpers/navigation";

test.describe("Accessibility", () => {
  test("basic accessibility structure on home page", async ({ page }) => {
    await goToHome(page);

    const html = page.locator("html");
    await expect(html).toHaveAttribute("lang", "zh-CN");

    const skipLink = page.getByRole("link", { name: "跳到内容" });
    await expect(skipLink).toBeAttached();
    await expect(skipLink).toHaveAttribute("href", "#content");

    const main = page.locator("main#content");
    await expect(main).toBeAttached();

    const mainNav = page.locator('nav[aria-label="主导航"]');
    await expect(mainNav).toBeAttached();
  });
});
