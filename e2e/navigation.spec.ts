import { expect, type Page } from "@playwright/test";

import { test } from "./fixtures";
import { goToHome, goToPosts, getText } from "./helpers/navigation";

/**
 * Click a navigation link and wait for the URL to change.
 * Next.js client-side navigation doesn't trigger a full page load,
 * so waitForLoadState("networkidle") is insufficient.
 * We use waitForURL to reliably detect SPA navigation.
 */
async function clickNavAndWait(
  page: Page,
  navSelector: string,
  linkText: string,
  urlPattern: RegExp,
) {
  const nav = page.locator(navSelector);
  const link = nav.getByRole("link", { name: linkText, exact: true });
  await Promise.all([page.waitForURL(urlPattern), link.click()]);
}

test.describe("Navigation", () => {
  test("root path / renders the Chinese home page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    expect(new URL(page.url()).pathname).toBe("/");
  });

  test("header navigation links navigate correctly on desktop", async ({
    page,
  }) => {
    const zh = getText("zh-CN");

    await goToHome(page);
    await clickNavAndWait(
      page,
      'nav[aria-label="主导航"]',
      zh.posts,
      /\/posts\//,
    );
    expect(page.url()).toContain("/posts/");

    await goToHome(page);
    await clickNavAndWait(
      page,
      'nav[aria-label="主导航"]',
      zh.projects,
      /\/projects\//,
    );
    expect(page.url()).toContain("/projects/");

    await goToHome(page);
    await clickNavAndWait(
      page,
      'nav[aria-label="主导航"]',
      zh.about,
      /\/about\//,
    );
    expect(page.url()).toContain("/about/");

    await goToHome(page);
    await goToPosts(page);
    const logoLink = page.getByRole("link", { name: "回到首页" });
    await Promise.all([
      page.waitForURL((url) => url.pathname === "/"),
      logoLink.click(),
    ]);
    expect(new URL(page.url()).pathname).toBe("/");
  });

  test("header highlights active page link", async ({ page }) => {
    const zh = getText("zh-CN");

    await goToPosts(page);

    const nav = page.locator('nav[aria-label="主导航"]');
    const postsLink = nav.locator("a").filter({ hasText: zh.posts }).first();
    await expect(postsLink).toHaveAttribute("aria-current", "page");

    const projectsLink = nav
      .locator("a")
      .filter({ hasText: zh.projects })
      .first();
    await expect(projectsLink).toHaveAttribute("aria-current", "false");
  });

  test("browser back/forward works correctly", async ({ page }) => {
    const zh = getText("zh-CN");

    await goToHome(page);
    await clickNavAndWait(
      page,
      'nav[aria-label="主导航"]',
      zh.posts,
      /\/posts\//,
    );
    expect(page.url()).toContain("/posts/");

    const firstPost = page.locator("article a").first();
    await Promise.all([page.waitForURL(/\/posts\/.+\//), firstPost.click()]);
    expect(page.url()).toMatch(/\/posts\/.+\//);

    await page.goBack();
    await page.waitForURL(/\/posts\//);
    expect(page.url()).toContain("/posts/");

    await page.goBack();
    await page.waitForURL((url) => url.pathname === "/");
    expect(new URL(page.url()).pathname).toBe("/");

    await page.goForward();
    await page.waitForURL(/\/posts\//);
    expect(page.url()).toContain("/posts/");
  });

  test("mobile hamburger menu opens and navigates", async ({ page }) => {
    const zh = getText("zh-CN");

    await page.setViewportSize({ width: 375, height: 667 });
    await goToHome(page);

    const menuButton = page.getByRole("button", { name: "菜单" });
    await menuButton.click();

    await expect(menuButton).toHaveAttribute("aria-expanded", "true");

    const mobileNav = page.locator("#site-nav");
    await expect(mobileNav).toBeVisible();

    await clickNavAndWait(page, "#site-nav", zh.posts, /\/posts\//);

    expect(page.url()).toContain("/posts/");

    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await expect(mobileNav).not.toBeVisible();
  });
});
