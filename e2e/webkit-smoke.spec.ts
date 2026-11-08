import { expect } from "@playwright/test";

import { SITE_COPY, STABLE_POST, STABLE_PROJECT, test } from "./fixtures";
import {
  goToHome,
  goToPost,
  goToProject,
  goToRoute,
} from "./helpers/navigation";
import {
  drawTo,
  expectPencilAtStroke,
  installDrawingClock,
  movePencilToDrawing,
  paintedPencilLength,
  waitForWorkbenchModel,
} from "./helpers/workbench";

test.describe("WebKit smoke", () => {
  test("draws contacted points and consumes the pencil before enabling the solid model", async ({
    page,
  }) => {
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    const revealed = workbench.locator(
      '[data-construction-layer="points"] circle[visibility="visible"]',
    );
    await expect(revealed).toHaveCount(0);
    await drawTo(page, workbench, 1);
    await expect(revealed).toHaveCount(0);
    await drawTo(page, workbench, 2);
    await expect(
      workbench.locator('[data-pencil-point="point-topLeft"]'),
    ).toBeVisible();
    const early = await paintedPencilLength(page, workbench);
    await drawTo(page, workbench, 88);
    const late = await paintedPencilLength(page, workbench);
    console.log(
      "WebKit painted pencil lengths",
      JSON.stringify({ early, late }),
    );
    expect(early.pixels).toBeGreaterThan(30);
    expect(late.pixels).toBeGreaterThan(30);
    expect(late.extent).toBeLessThan(early.extent * 0.35);
    await drawTo(page, workbench, 95);
    await movePencilToDrawing(page, workbench);
    await expectPencilAtStroke(workbench);
    await drawTo(page, workbench, 100);
    await waitForWorkbenchModel(workbench);
    await expect(workbench.getByRole("slider")).toHaveCount(0);
    await expect(workbench.getByRole("button")).toHaveCount(0);
  });

  test("rotates the finished view and resets it when a refresh starts a fresh drawing", async ({
    page,
  }) => {
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    await drawTo(page, workbench, 100);
    const view = await waitForWorkbenchModel(workbench);
    await view.press("ArrowLeft");
    await page.clock.runFor(750);
    await expect(view.locator("canvas")).toHaveAttribute("data-yaw", "-15");
    for (let i = 0; i < 25; i++) await view.press("ArrowRight");
    await page.clock.runFor(32);
    expect(
      Number(await view.locator("canvas").getAttribute("data-yaw")),
    ).toBeCloseTo(360, 1);
    await page.reload();
    await expect(workbench.locator("[data-progress]")).toHaveAttribute(
      "data-progress",
      "0",
    );
    await expect(view).toHaveCount(0);
    await drawTo(page, workbench, 100);
    await waitForWorkbenchModel(workbench);
    await expect(view.locator("canvas")).toHaveAttribute("data-yaw", "0");
    await expect(view.locator("canvas")).toHaveAttribute("data-pitch", "0");
  });

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
