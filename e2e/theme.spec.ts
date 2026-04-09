import { expect } from "@playwright/test";

import { test } from "./fixtures";
import { goToHome } from "./helpers/navigation";

test.describe("Theme toggle", () => {
  test("switches between dark and light mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await goToHome(page, "zh-CN");

    const html = page.locator("html");
    const toggleButton = page.getByRole("button", { name: "Toggle theme" });
    await expect(toggleButton).toBeEnabled();

    const initialClasses = await html.getAttribute("class");
    const initiallyDark = initialClasses?.includes("dark") ?? false;

    await toggleButton.click();

    const afterFirst = await html.getAttribute("class");
    expect(afterFirst?.includes("dark")).toBe(!initiallyDark);

    await toggleButton.click();

    const afterSecond = await html.getAttribute("class");
    expect(afterSecond?.includes("dark")).toBe(initiallyDark);
  });

  test("persists theme preference after page reload", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await goToHome(page, "zh-CN");

    const html = page.locator("html");
    const toggleButton = page.getByRole("button", { name: "Toggle theme" });
    await expect(toggleButton).toBeEnabled();

    const initialClasses = await html.getAttribute("class");
    const initiallyDark = initialClasses?.includes("dark") ?? false;

    if (initiallyDark) {
      await toggleButton.click();
      await expect(html).not.toHaveClass(/dark/);
      await toggleButton.click();
    } else {
      await toggleButton.click();
    }

    await expect(html).toHaveClass(/dark/);

    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(html).toHaveClass(/dark/);

    const storedTheme = await page.evaluate(() =>
      localStorage.getItem("theme"),
    );
    expect(storedTheme).toBe("dark");
  });
});
