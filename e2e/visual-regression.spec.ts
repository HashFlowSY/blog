import { expect } from "@playwright/test";

import {
  routeForPost,
  routeForProject,
  STABLE_POST,
  STABLE_PROJECT,
  test,
} from "./fixtures";
import { routePath } from "./static-artifact-config";

import type { Page, ViewportSize } from "@playwright/test";

const DESKTOP_VIEWPORT: ViewportSize = { height: 900, width: 1440 };
const MOBILE_VIEWPORT: ViewportSize = { height: 667, width: 375 };

const SCREENSHOT_OPTIONS = {
  animations: "disabled" as const,
  caret: "hide" as const,
  fullPage: false,
  maxDiffPixelRatio: 0,
  maxDiffPixels: 0,
  scale: "css" as const,
  threshold: 0,
};

const STABILIZATION_STYLE = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
  }

  html {
    scroll-behavior: auto !important;
  }
`;

async function visit(page: Page, pathname: string): Promise<void> {
  const response = await page.goto(routePath(pathname));
  if (!response) {
    throw new Error(`Static server did not respond to ${routePath(pathname)}`);
  }

  expect(response.status(), routePath(pathname)).toBe(200);
  await page.waitForLoadState("networkidle");
}

async function waitForFontsAndImages(page: Page): Promise<void> {
  const unloadedImages = await page.evaluate(async () => {
    await document.fonts.ready;

    const images = Array.from(document.images);
    for (const image of images) {
      // Lazy images below the viewport should still be decoded before the
      // page is accepted as a stable visual fixture.
      image.loading = "eager";
    }

    await Promise.all(
      images.map(async (image) => {
        if (!image.complete) {
          await new Promise<void>((resolve) => {
            const finish = () => resolve();
            image.addEventListener("load", finish, { once: true });
            image.addEventListener("error", finish, { once: true });
          });
        }

        if (image.complete && image.naturalWidth > 0) {
          if (typeof image.decode === "function") {
            await image.decode().catch(() => undefined);
          }
        }
      }),
    );

    return images
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src);
  });

  expect(
    unloadedImages,
    "Every page image must finish loading before the visual assertion",
  ).toEqual([]);
}

async function clearTransientState(page: Page): Promise<void> {
  // Move outside the viewport so a prior interaction cannot leave a :hover state.
  await page.mouse.move(-1, -1);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) activeElement.blur();
  });
}

async function stabilizePage(page: Page): Promise<void> {
  await page.addStyleTag({ content: STABILIZATION_STYLE });
  await waitForFontsAndImages(page);
  await clearTransientState(page);
}

async function expectStableScreenshot(page: Page, name: string): Promise<void> {
  // Exact comparison is intentional. Baselines are generated in the CI-aligned
  // Linux/Chromium environment; no tolerance or broad mask hides layout drift.
  await expect(page).toHaveScreenshot(name, SCREENSHOT_OPTIONS);
}

test.use({
  colorScheme: "light",
  contextOptions: { reducedMotion: "reduce" },
  deviceScaleFactor: 1,
  locale: "zh-CN",
  timezoneId: "Asia/Shanghai",
});

test.describe("Focused visual regression", () => {
  test.skip(
    process.platform !== "linux",
    "Canonical visual baselines are generated and compared only on Linux.",
  );

  test.describe("desktop viewport", () => {
    test.use({ viewport: DESKTOP_VIEWPORT });

    test("captures the home page", async ({ page }) => {
      await visit(page, "/");
      await expect(
        page.getByRole("heading", { name: /Hashflow AI 全栈工程师/ }),
      ).toBeVisible();
      await expect(page.locator(".workbench-hero-visual img")).toBeVisible();
      await stabilizePage(page);
      await expectStableScreenshot(page, "home-desktop.png");
    });

    test("captures the stable post detail", async ({ page }) => {
      await visit(page, routeForPost(STABLE_POST.slug));
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        STABLE_POST.title,
      );
      await stabilizePage(page);
      await expectStableScreenshot(page, "post-detail-desktop.png");
    });

    test("captures the real project detail", async ({ page }) => {
      await visit(page, routeForProject(STABLE_PROJECT.slug));
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        STABLE_PROJECT.title,
      );
      await expect(page.locator(".portfolio-case-cover img")).toBeVisible();
      await stabilizePage(page);
      await expectStableScreenshot(page, "project-detail-desktop.png");
    });
  });

  test.describe("mobile viewport", () => {
    test.use({ viewport: MOBILE_VIEWPORT });

    test("captures the home page with mobile navigation open", async ({
      page,
    }) => {
      await visit(page, "/");
      await expect(page.getByRole("button", { name: "菜单" })).toBeVisible();
      await stabilizePage(page);

      const menuButton = page.getByRole("button", { name: "菜单" });
      const mobileNavigation = page.locator("#site-nav");
      await menuButton.click();
      await expect(menuButton).toHaveAttribute("aria-expanded", "true");
      await expect(mobileNavigation).toBeVisible();
      const navigationDimensions = await mobileNavigation.evaluate(
        (element) => ({
          clientHeight: element.clientHeight,
          scrollHeight: element.scrollHeight,
        }),
      );
      expect(
        navigationDimensions.scrollHeight,
        "The open mobile navigation must not clip its final row",
      ).toBeLessThanOrEqual(navigationDimensions.clientHeight);
      await expect(
        mobileNavigation.getByRole("link", { name: "联系我", exact: true }),
      ).toBeVisible();
      await clearTransientState(page);

      await expectStableScreenshot(page, "home-mobile-menu-open.png");
    });
  });
});
