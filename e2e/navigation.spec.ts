import { expect, type Page } from "@playwright/test";

import { test } from "./fixtures";
import { goToHome, goToPosts, goToAbout, getText } from "./helpers/navigation";

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
  test("root path / redirects to /zh-CN/", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toMatch(/\/zh-CN\/$/);
  });

  test("header navigation links navigate correctly on desktop", async ({
    page,
  }) => {
    const zh = getText("zh-CN");

    await goToHome(page);
    await clickNavAndWait(
      page,
      'nav[aria-label="Main navigation"]',
      zh.posts,
      /\/zh-CN\/posts\//,
    );
    expect(page.url()).toContain("/zh-CN/posts/");

    await goToHome(page);
    await clickNavAndWait(
      page,
      'nav[aria-label="Main navigation"]',
      zh.projects,
      /\/zh-CN\/projects\//,
    );
    expect(page.url()).toContain("/zh-CN/projects/");

    await goToHome(page);
    await clickNavAndWait(
      page,
      'nav[aria-label="Main navigation"]',
      zh.about,
      /\/zh-CN\/about\//,
    );
    expect(page.url()).toContain("/zh-CN/about/");

    await goToHome(page);
    const logoLink = page.locator("header a").first();
    await Promise.all([page.waitForURL(/\/zh-CN\/$/), logoLink.click()]);
    expect(page.url()).toMatch(/\/zh-CN\/$/);
  });

  test("header highlights active page link", async ({ page }) => {
    const zh = getText("zh-CN");

    await goToPosts(page);

    const nav = page.locator('nav[aria-label="Main navigation"]');
    const postsLink = nav.locator("a").filter({ hasText: zh.posts }).first();
    await expect(postsLink).toHaveClass(/font-medium/);

    const projectsLink = nav
      .locator("a")
      .filter({ hasText: zh.projects })
      .first();
    await expect(projectsLink).toHaveClass(/text-muted-foreground/);
  });

  test("browser back/forward works correctly", async ({ page }) => {
    const zh = getText("zh-CN");

    await goToHome(page);
    await clickNavAndWait(
      page,
      'nav[aria-label="Main navigation"]',
      zh.posts,
      /\/zh-CN\/posts\//,
    );
    expect(page.url()).toContain("/zh-CN/posts/");

    const firstPost = page.locator("article a").first();
    await Promise.all([
      page.waitForURL(/\/zh-CN\/posts\/.+\//),
      firstPost.click(),
    ]);
    expect(page.url()).toMatch(/\/zh-CN\/posts\/.+\//);

    await page.goBack();
    await page.waitForURL(/\/zh-CN\/posts\//);
    expect(page.url()).toContain("/zh-CN/posts/");

    await page.goBack();
    await page.waitForURL(/\/zh-CN\/$/);
    expect(page.url()).toMatch(/\/zh-CN\/$/);

    await page.goForward();
    await page.waitForURL(/\/zh-CN\/posts\//);
    expect(page.url()).toContain("/zh-CN/posts/");
  });

  test("mobile hamburger menu opens and navigates", async ({ page }) => {
    const zh = getText("zh-CN");

    await page.setViewportSize({ width: 375, height: 667 });
    await goToHome(page);

    const menuButton = page.getByRole("button", { name: "Toggle menu" });
    await menuButton.click();

    await expect(menuButton).toHaveAttribute("aria-expanded", "true");

    const mobileNav = page.locator("#mobile-nav");
    await expect(mobileNav).toBeVisible();

    await clickNavAndWait(page, "#mobile-nav", zh.posts, /\/zh-CN\/posts\//);

    expect(page.url()).toContain("/zh-CN/posts/");

    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await expect(mobileNav).toBeHidden();
  });

  test("switch from zh-CN to en-US", async ({ page }) => {
    await goToPosts(page, "zh-CN");

    await clickNavAndWait(
      page,
      'nav[aria-label="Main navigation"]',
      "EN",
      /\/en-US\/posts\//,
    );

    expect(page.url()).toContain("/en-US/posts/");

    const en = getText("en-US");
    await expect(
      page.getByRole("heading", { name: en.allPosts }),
    ).toBeVisible();
  });

  test("switch from en-US back to zh-CN", async ({ page }) => {
    await goToAbout(page, "en-US");

    await clickNavAndWait(
      page,
      'nav[aria-label="Main navigation"]',
      "中文",
      /\/zh-CN\/about\//,
    );

    expect(page.url()).toContain("/zh-CN/about/");

    const zh = getText("zh-CN");
    await expect(
      page.getByRole("heading", { name: zh.aboutTitle }),
    ).toBeVisible();
  });
});
