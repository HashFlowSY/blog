import { expect } from "@playwright/test";

import {
  artworkSettledAt,
  drawingDuration,
  drawingTime,
} from "../src/components/home/pencil-plan";
import { pencilRoute } from "../src/components/home/pencil-route";

import { SITE_COPY, STABLE_POST, STABLE_PROJECT, test } from "./fixtures";
import { goToHome, goToPost, goToProject } from "./helpers/navigation";
import {
  artworkLuma,
  captureArtworkArea,
  captureWorkbenchArtwork,
  drawToTime,
  expectFirstBackgroundStroke,
  expectPencilAtStroke,
  expectUnchangedArtwork,
  installDrawingClock,
  paintedPencilLength,
  waitForFinishedWorkbench,
  workbenchScene,
} from "./helpers/workbench";

test.describe("WebKit smoke", () => {
  test("draws contacted strokes and lifts the shortened pencil from the finished illustration", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    await expectFirstBackgroundStroke(page, workbench);
    const early = await paintedPencilLength(page, workbench);
    const yellow = pencilRoute.find(({ id }) => id === "drawer-yellow-second")!;
    await drawToTime(
      page,
      workbench,
      drawingTime((yellow.start + yellow.end) / 2),
    );
    await expectPencilAtStroke(workbench);
    const middle = await paintedPencilLength(page, workbench);
    expect(early.pixels).toBeGreaterThan(30);
    expect(early.extent).toBeGreaterThan(146);
    expect(early.extent).toBeLessThan(153);
    expect(middle.pixels).toBeGreaterThan(30);
    expect(middle.extent).toBeLessThan(early.extent - 15);
    const scene = workbenchScene(workbench);
    await drawToTime(page, workbench, artworkSettledAt);
    const stub = await paintedPencilLength(page, workbench);
    expect(stub.extent).toBeGreaterThan(80);
    expect(stub.extent).toBeLessThan(106);
    const settled = await captureWorkbenchArtwork(scene);
    await drawToTime(page, workbench, drawingDuration);
    await waitForFinishedWorkbench(workbench);
    await expectUnchangedArtwork(
      page,
      await captureWorkbenchArtwork(scene),
      settled,
    );
  });

  test("starts the computer animation by keyboard and resets it after a refresh", async ({
    page,
  }) => {
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    await drawToTime(page, workbench, drawingDuration);
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
      "100",
    );
    await expect(laptop).toBeEnabled();
    await expect(screen).toHaveCount(0);
    await page.getByRole("button", { name: "重看绘制" }).click();
    await expectFirstBackgroundStroke(page, workbench);
    await expect(laptop).toHaveCount(0);
    await drawToTime(page, workbench, drawingDuration);
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

  test("navigates from the article and project contents to their sections", async ({
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
    const chapterUrl = page.url();
    const related = page.locator(".content-related .article-card-link").first();
    const relatedTitle = await related.getByRole("heading").innerText();
    await related.click();
    await expect(title).toHaveText(relatedTitle);
    await page.goBack();
    await expect(page).toHaveURL(chapterUrl);
    await expect(title).toHaveText(STABLE_POST.title);
    await expect(checklist).toBeFocused();
    await expect(checklist).toBeInViewport();
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
    await page
      .getByRole("button", { name: "目录", exact: true })
      .press("Enter");
    const chapters = page.getByRole("navigation", { name: "项目章节" });
    await chapters.getByRole("link", { name: "首页交互工作台" }).press("Enter");
    const chapter = page.getByRole("heading", { name: "首页交互工作台" });
    await expect(chapter).toBeFocused();
    await expect(chapter).toBeInViewport();
    await expect(
      page.getByRole("img", { name: /首页手绘工作台/u }),
    ).toHaveJSProperty("naturalWidth", 900);
  });

  test("supports direct mobile navigation and basic layout", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await goToHome(page);
    const nav = page.getByRole("navigation", { name: "主导航" });
    await expect(page.locator("main#content")).toBeVisible();
    await expect(nav.getByRole("link", { name: "关于" })).toBeInViewport();
    await nav.getByRole("link", { name: SITE_COPY.posts, exact: true }).click();
    await page.waitForURL((url) => url.pathname.endsWith("/posts/"));
    await expect(
      nav.getByRole("link", { name: SITE_COPY.posts }),
    ).toHaveAttribute("aria-current", "page");
  });
});
