import { expect } from "@playwright/test";

import { SITE_COPY, STABLE_POST, test } from "./fixtures";
import { goToPost } from "./helpers/navigation";

test.describe("Post detail", () => {
  test("renders post metadata", async ({ page }) => {
    const copy = SITE_COPY;

    await goToPost(page, STABLE_POST.slug);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      STABLE_POST.title,
    );
    await expect(page.getByText(STABLE_POST.description)).toBeVisible();

    await expect(
      page
        .locator(".portfolio-article-meta")
        .getByText(new RegExp(`\\d+ ${copy.minutes}`)),
    ).toBeVisible();
  });

  test("recommendation section exists", async ({ page }) => {
    await goToPost(page, STABLE_POST.slug);

    await expect(
      page.getByRole("heading", { name: /关联阅读|最新文章/ }),
    ).toBeVisible();
    await expect(page.locator(".related-section")).toBeAttached();
  });

  test("back link returns to the posts archive", async ({ page }) => {
    await goToPost(page, STABLE_POST.slug);

    await Promise.all([
      page.waitForURL(/\/posts\/$/),
      page.getByRole("link", { name: "返回技术写作" }).click(),
    ]);

    await expect(page.getByRole("heading", { name: "技术写作" })).toBeVisible();
  });
});
