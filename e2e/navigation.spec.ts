import { expect, type Page } from "@playwright/test";

import { SITE_COPY, STABLE_POST, test } from "./fixtures";
import { goToHome, goToPosts } from "./helpers/navigation";

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
  pathnameSuffix: string,
) {
  const nav = page.locator(navSelector);
  const link = nav.getByRole("link", { name: linkText, exact: true });
  await Promise.all([
    page.waitForURL((url) => url.pathname.endsWith(pathnameSuffix)),
    link.click(),
  ]);
}

test.describe("Navigation", () => {
  test("root path / renders the Chinese home page", async ({ page }) => {
    await goToHome(page);

    expect(new URL(page.url()).pathname.endsWith("/")).toBe(true);
    await expect(
      page.getByRole("heading", { name: /Hashflow AI 全栈工程师/ }),
    ).toBeVisible();
  });

  test("header navigation links navigate correctly on desktop", async ({
    page,
  }) => {
    const copy = SITE_COPY;

    await goToHome(page);
    await clickNavAndWait(
      page,
      'nav[aria-label="主导航"]',
      copy.posts,
      "/posts/",
    );
    expect(new URL(page.url()).pathname).toMatch(/\/posts\/$/);

    await goToHome(page);
    await clickNavAndWait(
      page,
      'nav[aria-label="主导航"]',
      copy.projects,
      "/projects/",
    );
    expect(new URL(page.url()).pathname).toMatch(/\/projects\/$/);

    await goToHome(page);
    await clickNavAndWait(
      page,
      'nav[aria-label="主导航"]',
      copy.about,
      "/about/",
    );
    expect(new URL(page.url()).pathname).toMatch(/\/about\/$/);

    await goToHome(page);
    await goToPosts(page);
    const logoLink = page.getByRole("link", { name: "回到首页" });
    await Promise.all([
      page.waitForURL((url) => /\/$/.test(url.pathname)),
      logoLink.click(),
    ]);
    expect(new URL(page.url()).pathname).toMatch(/\/$/);
  });

  test("header highlights active page link", async ({ page }) => {
    const copy = SITE_COPY;

    await goToPosts(page);

    const nav = page.locator('nav[aria-label="主导航"]');
    const postsLink = nav.getByRole("link", {
      name: copy.posts,
      exact: true,
    });
    await expect(postsLink).toHaveAttribute("aria-current", "page");

    const projectsLink = nav.getByRole("link", {
      name: copy.projects,
      exact: true,
    });
    await expect(projectsLink).toHaveAttribute("aria-current", "false");
  });

  test("browser back/forward works correctly", async ({ page }) => {
    const copy = SITE_COPY;

    await goToHome(page);
    await clickNavAndWait(
      page,
      'nav[aria-label="主导航"]',
      copy.posts,
      "/posts/",
    );
    expect(new URL(page.url()).pathname).toMatch(/\/posts\/$/);

    const stablePostLink = page.getByRole("link", {
      name: `阅读${STABLE_POST.title}`,
      exact: true,
    });
    await Promise.all([
      page.waitForURL((url) =>
        url.pathname.endsWith(`/posts/${STABLE_POST.slug}/`),
      ),
      stablePostLink.click(),
    ]);
    expect(new URL(page.url()).pathname).toMatch(
      new RegExp(`/posts/${STABLE_POST.slug}/$`),
    );

    await page.goBack();
    await page.waitForURL((url) => url.pathname.endsWith("/posts/"));
    expect(new URL(page.url()).pathname).toMatch(/\/posts\/$/);

    await page.goBack();
    await page.waitForURL((url) => /\/$/.test(url.pathname));
    expect(new URL(page.url()).pathname).toMatch(/\/$/);

    await page.goForward();
    await page.waitForURL((url) => url.pathname.endsWith("/posts/"));
    expect(new URL(page.url()).pathname).toMatch(/\/posts\/$/);
  });

  test("mobile hamburger menu opens and navigates", async ({ page }) => {
    const copy = SITE_COPY;

    await page.setViewportSize({ width: 375, height: 667 });
    await goToHome(page);

    const menuButton = page.getByRole("button", { name: "菜单" });
    await menuButton.click();

    await expect(menuButton).toHaveAttribute("aria-expanded", "true");

    const mobileNav = page.locator("#site-nav");
    await expect(mobileNav).toBeVisible();

    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await expect(mobileNav).not.toBeVisible();

    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    await expect(mobileNav).toBeVisible();

    await clickNavAndWait(page, "#site-nav", copy.posts, "/posts/");

    expect(new URL(page.url()).pathname).toMatch(/\/posts\/$/);

    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await expect(mobileNav).not.toBeVisible();
  });
});
