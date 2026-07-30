import { expect } from "@playwright/test";

import { SITE_COPY, test } from "./fixtures";
import { goToHome } from "./helpers/navigation";

test.describe("Home page", () => {
  test("renders hero section", async ({ page }) => {
    const copy = SITE_COPY;

    await goToHome(page);

    await expect(
      page.getByRole("heading", { name: /Hashflow AI 全栈工程师/ }),
    ).toBeVisible();

    const viewProjectsLink = page.getByRole("link", {
      name: copy.viewProjects,
      exact: true,
    });
    await expect(viewProjectsLink).toBeVisible();
    await expect(viewProjectsLink).toHaveAttribute("href", /\/projects\/$/);

    const contactLink = page.getByRole("link", { name: "联系我" }).first();
    await expect(contactLink).toHaveAttribute("href", /\/about\/#contact$/);
  });

  test("shows recent posts section", async ({ page }) => {
    const copy = SITE_COPY;

    await goToHome(page);

    await expect(
      page.getByRole("heading", { name: copy.recentPosts }),
    ).toBeVisible();
    await expect(page.locator(".writing-item")).toHaveCount(2);
  });

  test("shows featured projects section", async ({ page }) => {
    const copy = SITE_COPY;

    await goToHome(page);

    await expect(
      page.getByRole("heading", { name: copy.featuredProjects }),
    ).toBeVisible();
    await expect(page.locator(".featured-work")).toBeVisible();
  });
});
