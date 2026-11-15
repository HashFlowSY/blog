import { expect } from "@playwright/test";

import { SITE_COPY, STABLE_PROJECT, test } from "./fixtures";
import { goToHome } from "./helpers/navigation";
import {
  drawTo,
  expectPencilAtStroke,
  installDrawingClock,
  movePencilToDrawing,
  paintedPencilLength,
  waitForFinishedWorkbench,
  waitForWorkbenchArtwork,
} from "./helpers/workbench";

test.describe("Home page", () => {
  test("redraws on entry, return, back and refresh without progress or replay controls", async ({
    page,
  }) => {
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    const scene = workbench.locator("[data-progress]");
    async function expectFreshDrawing() {
      await expect(scene).toHaveAttribute("data-progress", "0");
      await expect(
        workbench.getByRole("button", { name: "暂停构建" }),
      ).toBeVisible();
      await drawTo(page, workbench, 2);
      expect(
        Number(
          await workbench
            .locator('[data-construction-layer="pencil"]')
            .getAttribute("data-pencil-length"),
        ),
      ).toBeGreaterThan(200);
    }
    await expectFreshDrawing();
    await expect(workbench.getByRole("slider")).toHaveCount(0);
    await expect(workbench).not.toContainText(
      /100%|回到起点|重看细节|先落点|从点开始/,
    );
    await drawTo(page, workbench, 100);
    await page
      .getByRole("navigation", { name: "主导航" })
      .getByRole("link", { name: /关于/ })
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: SITE_COPY.aboutTitle }),
    ).toBeVisible();
    await page.getByRole("link", { name: "回到首页", exact: true }).click();
    await expectFreshDrawing();
    await drawTo(page, workbench, 100);
    await page.reload();
    await expectFreshDrawing();
    await drawTo(page, workbench, 100);
    await page
      .getByRole("navigation", { name: "主导航" })
      .getByRole("link", { name: /关于/ })
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: SITE_COPY.aboutTitle }),
    ).toBeVisible();
    await page.goBack();
    await expectFreshDrawing();
  });

  test("reveals the first position mark only when the pencil touches it", async ({
    page,
  }) => {
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    const marks = workbench.locator(
      '[data-construction-layer="points"] circle[visibility="visible"]',
    );
    await expect(marks).toHaveCount(0);
    await drawTo(page, workbench, 1);
    await expect(marks).toHaveCount(0);
    await drawTo(page, workbench, 2);
    await expect(
      workbench.locator('[data-pencil-point="point-topLeft"]'),
    ).toBeVisible();
    expect(await marks.count()).toBeLessThan(
      await workbench.locator("[data-pencil-point]").count(),
    );
  });

  test("visibly consumes the pencil and exhausts the last tip at completion", async ({
    page,
  }) => {
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    const pen = workbench.locator('[data-construction-layer="pencil"]');
    await drawTo(page, workbench, 2);
    const early = await paintedPencilLength(page, workbench);
    await drawTo(page, workbench, 88);
    const late = await paintedPencilLength(page, workbench);
    expect(early.pixels).toBeGreaterThan(30);
    expect(late.pixels).toBeGreaterThan(30);
    expect(late.extent).toBeLessThan(early.extent * 0.35);
    await drawTo(page, workbench, 99);
    await expect(pen).toBeVisible();
    await expect(pen).toHaveAttribute("opacity", "1");
    expect(
      Number(await pen.getAttribute("data-pencil-length")),
    ).toBeGreaterThan(0);
    await drawTo(page, workbench, 100);
    await expect(pen).toHaveCount(0);
    await waitForFinishedWorkbench(workbench);
  });

  test("keeps the pencil on the actual leading line, shading and detail", async ({
    page,
  }) => {
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    for (const progress of [50, 65, 95]) {
      await drawTo(page, workbench, progress);
      await movePencilToDrawing(page, workbench);
      await expectPencilAtStroke(workbench);
    }
  });

  test("opens the yellow drawer by pointer and restores the original drawing by keyboard", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    const scene = await waitForFinishedWorkbench(workbench);
    await expect(
      workbench.locator('[data-construction-layer="pencil"]'),
    ).not.toBeVisible();
    await expect(workbench.getByText("点按部件试试")).toBeVisible();

    const drawer = workbench.getByRole("button", { name: "黄色抽屉" });
    await expect(drawer).toHaveAttribute("aria-pressed", "false");
    await waitForWorkbenchArtwork(scene);
    const resting = await scene.screenshot();
    await drawer.click();
    await expect(drawer).toHaveAttribute("aria-pressed", "true");
    await expect(
      workbench.getByRole("status").filter({ hasText: "拉出黄色抽屉" }),
    ).toBeAttached();
    await page.mouse.move(0, 0);
    await drawer.blur();
    expect((await scene.screenshot()).equals(resting)).toBe(false);

    await drawer.press("Enter");
    await expect(drawer).toHaveAttribute("aria-pressed", "false");
    await expect(
      workbench.getByRole("status").filter({ hasText: "合上黄色抽屉" }),
    ).toBeAttached();
    await drawer.blur();
    expect((await scene.screenshot()).equals(resting)).toBe(true);

    await drawer.press("Space");
    await expect(drawer).toHaveAttribute("aria-pressed", "true");
  });

  test("redraws the two computer screens in place after typing", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    await drawTo(page, workbench, 100);
    await waitForFinishedWorkbench(workbench);

    for (const [name, device, typing] of [
      ["笔记本", "laptop", "笔记本正在打字"],
      ["显示器", "display", "外接键盘正在打字"],
    ] as const) {
      const screen = workbench.locator(`[data-blueprint-device="${device}"]`);
      await workbench.getByRole("button", { name, exact: true }).click();
      await page.clock.fastForward(600);
      await expect(workbench.getByText(typing, { exact: true })).toBeAttached();
      await page.clock.fastForward(1600);
      await expect(
        workbench.getByText("正在逐笔绘图", { exact: true }),
      ).toBeAttached();
      const partial = await screen.screenshot();
      await page.clock.fastForward(1200);
      expect((await screen.screenshot()).equals(partial)).toBe(false);
      await page.clock.fastForward(1500);
      await expect(
        workbench.getByText("图纸绘制完成", { exact: true }),
      ).toBeAttached();
    }
    expect(errors).toEqual([]);
  });

  test("waits for a short viewport and keeps touch scrolling from opening parts", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    const touch = await page.context().newCDPSession(page);
    await touch.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 2,
    });
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    const scene = workbench.locator("[data-progress]");
    await page.clock.fastForward(1000);
    await expect(scene).toHaveAttribute("data-progress", "0");
    await expect(
      workbench.getByRole("button", { name: "暂停构建" }),
    ).toHaveCount(0);
    await scene.scrollIntoViewIfNeeded();
    await drawTo(page, workbench, 100);
    await page.setViewportSize({ width: 320, height: 844 });

    const enter = workbench.getByRole("button", { name: "操作工作台" });
    const exit = workbench.getByRole("button", { name: "退出操作" });
    const drawer = workbench.getByRole("button", { name: "黄色抽屉" });

    async function drawerPoint() {
      await drawer.scrollIntoViewIfNeeded();
      const bounds = await drawer.boundingBox();
      if (!bounds) throw new Error("The drawer must be a visible touch target");
      return {
        id: 1,
        x: Math.round(bounds.x + bounds.width / 2),
        y: Math.round(bounds.y + bounds.height / 2),
      };
    }

    async function tapDrawer() {
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [await drawerPoint()],
      });
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    }

    await tapDrawer();
    await expect(drawer).toHaveAttribute("aria-pressed", "false");
    await enter.click();
    const point = await drawerPoint();

    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [point],
    });
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchCancel",
      touchPoints: [],
    });
    await expect(drawer).toHaveAttribute("aria-pressed", "false");

    const scrollBefore = await page.evaluate(() => scrollY);
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [point],
    });
    for (let step = 1; step <= 8; step++)
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ ...point, y: point.y - step * 12 }],
      });
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeGreaterThan(scrollBefore);
    await expect(drawer).toHaveAttribute("aria-pressed", "false");

    await page.evaluate(() => scrollTo({ top: scrollY, behavior: "instant" }));
    await tapDrawer();
    await expect(drawer).toHaveAttribute("aria-pressed", "true");

    await page.setViewportSize({ width: 667, height: 375 });
    await scene.evaluate((element) => {
      const { top, height } = element.getBoundingClientRect();
      window.scrollTo({
        top: scrollY + top + height / 2 - innerHeight / 2,
        behavior: "instant",
      });
    });
    const [exitBox, headerBox] = await Promise.all([
      exit.boundingBox(),
      page.getByRole("banner").boundingBox(),
    ]);
    if (!exitBox || !headerBox)
      throw new Error("Missing workbench exit or header");
    expect(exitBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height);
    expect(exitBox.y + exitBox.height).toBeLessThanOrEqual(375);

    await drawer.press("Escape");
    await expect(enter).toBeFocused();
    await tapDrawer();
    await expect(drawer).toHaveAttribute("aria-pressed", "true");
    await touch.detach();
  });

  test("links the hero to the featured project and the footer to contact", async ({
    page,
  }) => {
    const copy = SITE_COPY;

    await goToHome(page);

    await expect(
      page.getByRole("heading", { name: /Hashflow AI 全栈工程师/ }),
    ).toBeVisible();

    const viewProjectsLink = page.getByRole("link", {
      name: copy.viewFeaturedProject,
      exact: true,
    });
    await expect(viewProjectsLink).toBeVisible();
    await viewProjectsLink.click();
    await expect(page).toHaveURL(/#selected-work$/);
    await expect(
      page.getByRole("heading", { name: copy.featuredProjects }),
    ).toBeInViewport();

    await page
      .getByRole("region", { name: "求职与合作" })
      .getByRole("link", { name: "联系我", exact: true })
      .click();
    await expect(page).toHaveURL(/\/about\/#contact$/);
    await expect(
      page
        .getByRole("region", { name: "求职或合作，欢迎联系我。" })
        .getByRole("link", { name: /GitHub/ }),
    ).toBeInViewport();
  });

  test("shows recent posts section", async ({ page }) => {
    const copy = SITE_COPY;

    await goToHome(page);

    await expect(
      page.getByRole("heading", { name: copy.recentPosts }),
    ).toBeVisible();
    const recentSection = page
      .getByRole("heading", { name: copy.recentPosts })
      .locator("xpath=ancestor::section[1]");
    const recentPostLinks = recentSection.locator(
      'a[href*="/posts/"]:not([href$="/posts/"])',
    );

    await expect(recentSection).toBeVisible();
    expect(await recentPostLinks.count()).toBeGreaterThan(0);
  });

  test("shows featured projects section", async ({ page }) => {
    const copy = SITE_COPY;

    await goToHome(page);

    await expect(
      page.getByRole("heading", { name: copy.featuredProjects }),
    ).toBeVisible();

    const featuredProjectLink = page.getByRole("link", {
      name: "查看项目详情",
      exact: true,
    });
    await expect(featuredProjectLink).toHaveAttribute(
      "href",
      new RegExp(`/projects/${STABLE_PROJECT.slug}/$`),
    );
  });
});
