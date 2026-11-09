import { expect } from "@playwright/test";

import { STABLE_POST, test } from "./fixtures";
import { goToPost } from "./helpers/navigation";

test.describe("Post detail", () => {
  test("back link returns to the posts archive", async ({ page }) => {
    await goToPost(page, STABLE_POST.slug);

    await Promise.all([
      page.waitForURL(/\/posts\/$/),
      page.getByRole("link", { name: "返回技术写作" }).click(),
    ]);

    await expect(page.getByRole("heading", { name: "技术写作" })).toBeVisible();
  });
});
