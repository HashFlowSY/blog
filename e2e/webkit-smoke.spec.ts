import { expect } from "@playwright/test";

import { SITE_COPY, STABLE_POST, STABLE_PROJECT, test } from "./fixtures";
import {
  goToHome,
  goToPost,
  goToProject,
  goToRoute,
} from "./helpers/navigation";

test.describe("WebKit smoke", () => {
  test("renders the home page and primary navigation", async ({ page }) => {
    await goToHome(page);

    await expect(
      page.getByRole("heading", { name: /Hashflow AI 全栈工程师/ }),
    ).toBeVisible();

    const navigation = page.locator('nav[aria-label="主导航"]');
    await expect(navigation).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: SITE_COPY.posts, exact: true }),
    ).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: SITE_COPY.projects, exact: true }),
    ).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: SITE_COPY.about, exact: true }),
    ).toBeVisible();

    await Promise.all([
      page.waitForURL((url) => url.pathname.endsWith("/projects/")),
      navigation
        .getByRole("link", { name: SITE_COPY.projects, exact: true })
        .click(),
    ]);
    expect(new URL(page.url()).pathname).toMatch(/\/projects\/$/);
  });

  test("opens the explicitly selected post and real project details", async ({
    page,
  }) => {
    await goToPost(page, STABLE_POST.slug);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      STABLE_POST.title,
    );
    expect(new URL(page.url()).pathname).toMatch(
      new RegExp(`/posts/${STABLE_POST.slug}/$`),
    );

    await goToProject(page, STABLE_PROJECT.slug);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      STABLE_PROJECT.title,
    );
    expect(new URL(page.url()).pathname).toMatch(
      new RegExp(`/projects/${STABLE_PROJECT.slug}/$`),
    );
  });

  test("supports mobile menu open, close, navigation, and basic layout", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await goToHome(page);

    await expect(page.locator(".site-frame")).toBeVisible();
    await expect(page.locator("main#content")).toBeVisible();

    const menuButton = page.getByRole("button", { name: "菜单" });
    const mobileNavigation = page.locator("#site-nav");

    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    await expect(mobileNavigation).toBeVisible();

    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await expect(mobileNavigation).not.toBeVisible();

    await menuButton.click();
    await expect(mobileNavigation).toBeVisible();
    await Promise.all([
      page.waitForURL((url) => url.pathname.endsWith("/posts/")),
      mobileNavigation
        .getByRole("link", { name: SITE_COPY.posts, exact: true })
        .click(),
    ]);

    expect(new URL(page.url()).pathname).toMatch(/\/posts\/$/);
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await expect(mobileNavigation).not.toBeVisible();

    await goToRoute(page, "/posts/");
    await expect(page.locator("main#content")).toBeVisible();
  });
});
