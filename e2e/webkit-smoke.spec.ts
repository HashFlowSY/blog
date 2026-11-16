import { expect } from "@playwright/test";

import { SITE_COPY, STABLE_POST, STABLE_PROJECT, test } from "./fixtures";
import {
  goToHome,
  goToPost,
  goToProject,
  goToRoute,
} from "./helpers/navigation";
import {
  artworkLuma,
  captureArtworkArea,
  drawTo,
  expectPencilAtStroke,
  installDrawingClock,
  movePencilToDrawing,
  paintedPencilLength,
  waitForFinishedWorkbench,
  workbenchScene,
} from "./helpers/workbench";

test.describe("WebKit smoke", () => {
  test("draws contacted points and consumes the pencil before revealing the finished illustration", async ({
    page,
  }) => {
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    const revealed = workbench.locator(
      '[data-construction-layer="points"] circle[visibility="visible"]',
    );
    await expect(workbenchScene(workbench)).toHaveAttribute(
      "data-drawing-state",
      "drawing",
    );
    await expect(revealed).toHaveCount(0);
    await page.clock.runFor(32);
    await expect(revealed).toHaveCount(0);
    await drawTo(page, workbench, 2);
    await expect(
      workbench.locator('[data-pencil-point="point-topLeft"]'),
    ).toBeVisible();
    const early = await paintedPencilLength(page, workbench);
    await drawTo(page, workbench, 88);
    const late = await paintedPencilLength(page, workbench);
    expect(early.pixels).toBeGreaterThan(30);
    expect(late.pixels).toBeGreaterThan(30);
    expect(late.extent).toBeLessThan(early.extent * 0.35);
    await drawTo(page, workbench, 95);
    await movePencilToDrawing(page, workbench);
    await expectPencilAtStroke(workbench);
    await drawTo(page, workbench, 100);
    await waitForFinishedWorkbench(workbench);
    await expect(workbench.getByRole("slider")).toHaveCount(0);
  });

  test("starts the computer animation by keyboard and resets it after a refresh", async ({
    page,
  }) => {
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    await drawTo(page, workbench, 100);
    await waitForFinishedWorkbench(workbench);
    const laptop = workbench.getByRole("button", {
      name: "笔记本",
      exact: true,
    });
    const screen = workbench.locator('[data-blueprint-device="laptop"]');
    await laptop.press("Space");
    await expect(screen).toHaveAttribute("data-phase", "typing");
    await page.reload();
    await expect(workbenchScene(workbench)).toHaveAttribute(
      "data-progress",
      "0",
    );
    await expect(laptop).toHaveCount(0);
    await drawTo(page, workbench, 100);
    await expect(laptop).toBeVisible();
    await expect(screen).toHaveCount(0);
  });

  test("dims the narrow workbench immediately with reduced motion", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    const scene = await waitForFinishedWorkbench(workbench);
    const lamp = workbench.getByRole("button", { name: "工作灯" });
    await expect(lamp).toHaveAttribute("aria-pressed", "true");
    await scene.scrollIntoViewIfNeeded();

    const litPegboard = [890, 245, 982, 265] as const;
    const resting = await captureArtworkArea(scene, litPegboard);
    await lamp.click();
    await expect(lamp).toHaveAttribute("aria-pressed", "false");
    const dark = await captureArtworkArea(scene, litPegboard);
    expect(
      (await artworkLuma(page, resting)) - (await artworkLuma(page, dark)),
    ).toBeGreaterThanOrEqual(12);

    await lamp.click();
    await expect(lamp).toHaveAttribute("aria-pressed", "true");
    expect((await captureArtworkArea(scene, litPegboard)).equals(resting)).toBe(
      true,
    );
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

  test("opens the article contents and project image preview", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await goToPost(page, STABLE_POST.slug);
    const title = page.getByRole("heading", { level: 1 });
    await expect(title).toHaveText(STABLE_POST.title);
    expect(new URL(page.url()).pathname).toMatch(
      new RegExp(`/posts/${STABLE_POST.slug}/$`),
    );
    await page.getByRole("button", { name: "目录", exact: true }).click();
    const contents = page.getByRole("navigation", { name: "文章章节" });
    await expect(contents).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(contents).toBeHidden();

    const checklist = page.getByRole("heading", {
      name: "使用前的检查清单",
    });
    await page
      .getByRole("link", { name: "直达使用前的检查清单" })
      .press("Enter");
    await expect(checklist).toBeFocused();
    expect((await checklist.boundingBox())?.y ?? 0).toBeGreaterThan(56);
    await expect(
      page.locator("#article-body").getByRole("listitem"),
    ).toHaveCount(5);
    await page.getByRole("button", { name: "回到顶部" }).press("Enter");
    await expect(title).toBeFocused();
    expect(new URL(page.url()).hash).toBe("");

    await page.setViewportSize({ width: 1280, height: 900 });
    await goToPost(page, STABLE_POST.slug);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    const floatingTop = page.getByRole("button", { name: "回到顶部" });
    await expect(floatingTop).toBeHidden();
    await page
      .getByRole("link", { name: "直达使用前的检查清单" })
      .press("Enter");
    await expect(floatingTop).toBeVisible();
    await floatingTop.press("Enter");
    await expect(title).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(floatingTop).toBeHidden();

    await goToProject(page, STABLE_PROJECT.slug);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      STABLE_PROJECT.title,
    );
    expect(new URL(page.url()).pathname).toMatch(
      new RegExp(`/projects/${STABLE_PROJECT.slug}/$`),
    );
    const preview = page.getByRole("button", { name: "查看项目大图" });
    await preview.click();
    const dialog = page.getByRole("dialog", {
      name: `${STABLE_PROJECT.title}项目大图`,
    });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(preview).toBeFocused();
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
