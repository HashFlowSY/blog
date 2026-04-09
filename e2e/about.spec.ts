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

    await expect(page.getByText(zh.skills)).toBeVisible();

    const progressBars = page.locator('[role="progressbar"]');
    await expect(progressBars.first()).toBeVisible();

    await expect(page.getByText(zh.experience)).toBeVisible();
  });
});
