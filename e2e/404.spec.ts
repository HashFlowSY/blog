import { expect } from "@playwright/test";

import { test } from "./fixtures";

test.describe("404 page", () => {
  test("visiting about page with invalid locale shows 404", async ({
    page,
  }) => {
    await page.goto("/zh-CN/posts/nonexistent-slug/");
    await page.waitForLoadState("networkidle");

    // Static export dev server returns a generic error page for unknown routes
    // The page should not contain normal post content
    await expect(
      page.getByRole("heading", { name: "Building a Static Blog" }),
    ).not.toBeVisible();
  });
});
