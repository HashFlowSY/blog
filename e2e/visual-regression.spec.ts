import { readFile } from "node:fs/promises";

import { expect } from "@playwright/test";

import {
  routeForPost,
  routeForProject,
  STABLE_POST,
  STABLE_PROJECT,
  test,
} from "./fixtures";
import { visitStaticPage } from "./helpers/static-page";
import { waitForFinishedWorkbench } from "./helpers/workbench";
import {
  VISUAL_DESKTOP_VIEWPORT,
  VISUAL_MOBILE_VIEWPORT,
  VISUAL_SCREENSHOT_OPTIONS,
  VISUAL_USE_OPTIONS,
} from "./visual-regression-config";

import type { Page } from "@playwright/test";

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
  await expect(page).toHaveScreenshot(name, VISUAL_SCREENSHOT_OPTIONS);
}

async function waitForHomeArtwork(page: Page): Promise<void> {
  const workbench = page.getByRole("region", { name: "交互工作台" });
  await waitForFinishedWorkbench(workbench);
}

async function expectCanonicalWorkbenchArtwork(page: Page): Promise<void> {
  // The crop covers the bench and drafting lines, excluding editable UI text.
  const crop = { x: 618, y: 91, width: 720, height: 607 };
  const source = await readFile("docs/design/workbench-2d/concept-1440.png");
  const screenshot = await page.screenshot({ clip: crop, scale: "css" });
  const differentPixels = await page.evaluate(
    async ({ source, screenshot, crop }) => {
      async function pngPixels(png: string, x = 0, y = 0) {
        const image = new Image();
        image.src = `data:image/png;base64,${png}`;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = crop.width;
        canvas.height = crop.height;
        const context = canvas.getContext("2d")!;
        context.drawImage(
          image,
          x,
          y,
          crop.width,
          crop.height,
          0,
          0,
          crop.width,
          crop.height,
        );
        return context.getImageData(0, 0, crop.width, crop.height).data;
      }

      const [expected, actual] = await Promise.all([
        pngPixels(source, crop.x, crop.y),
        pngPixels(screenshot),
      ]);
      let differences = 0;
      for (let index = 0; index < expected.length; index += 4)
        if (
          expected[index] !== actual[index] ||
          expected[index + 1] !== actual[index + 1] ||
          expected[index + 2] !== actual[index + 2]
        )
          differences++;
      return differences;
    },
    {
      source: source.toString("base64"),
      screenshot: screenshot.toString("base64"),
      crop,
    },
  );
  expect(
    differentPixels,
    "Rendered bench pixels must match the selected concept",
  ).toBe(0);
}

test.use(VISUAL_USE_OPTIONS);

test.describe("Focused visual regression", () => {
  test.skip(
    process.platform !== "linux",
    "Canonical visual baselines are generated and compared only on Linux.",
  );

  test.describe("desktop viewport", () => {
    test.use({ viewport: VISUAL_DESKTOP_VIEWPORT });

    test("captures the home page", async ({ page }) => {
      await visitStaticPage(page, "/");
      await expect(
        page.getByRole("heading", { name: /Hashflow AI 全栈工程师/ }),
      ).toBeVisible();
      await waitForHomeArtwork(page);
      await stabilizePage(page);
      await expectCanonicalWorkbenchArtwork(page);
      await expectStableScreenshot(page, "home-desktop.png");
    });

    test("captures the stable post detail", async ({ page }) => {
      await visitStaticPage(page, routeForPost(STABLE_POST.slug));
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        STABLE_POST.title,
      );
      await stabilizePage(page);
      await expectStableScreenshot(page, "post-detail-desktop.png");
    });

    test("captures the real project detail", async ({ page }) => {
      await visitStaticPage(page, routeForProject(STABLE_PROJECT.slug));
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        STABLE_PROJECT.title,
      );
      await expect(page.locator(".portfolio-case-cover img")).toBeVisible();
      await stabilizePage(page);
      await expectStableScreenshot(page, "project-detail-desktop.png");
    });
  });

  test.describe("mobile viewport", () => {
    test.use({ hasTouch: true, viewport: VISUAL_MOBILE_VIEWPORT });

    test("captures the home page with mobile navigation open", async ({
      page,
    }) => {
      await visitStaticPage(page, "/");
      await expect(page.getByRole("button", { name: "菜单" })).toBeVisible();
      await waitForHomeArtwork(page);
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
        mobileNavigation.getByRole("link", { name: "关于", exact: true }),
      ).toBeVisible();
      await clearTransientState(page);

      await expectStableScreenshot(page, "home-mobile-menu-open.png");
    });
  });
});
