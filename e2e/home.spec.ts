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
  workbenchScene,
} from "./helpers/workbench";

test.describe("Home page", () => {
  test("redraws on entry, return, back and refresh without playback controls", async ({
    page,
  }) => {
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    const scene = workbenchScene(workbench);
    async function expectFreshDrawing() {
      await expect(scene).toHaveAttribute("data-progress", "0");
      await drawTo(page, workbench, 2);
      await expect(workbench.getByRole("button")).toHaveCount(0);
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
    await expect(workbenchScene(workbench)).toHaveAttribute(
      "data-drawing-state",
      "drawing",
    );
    await expect(marks).toHaveCount(0);
    // The first point starts around 42 ms into the shortened animation.
    await page.clock.runFor(32);
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

  test("exposes only the computers, leaves, and light and keeps the other artwork static", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    await drawTo(page, workbench, 100);
    const scene = await waitForFinishedWorkbench(workbench);
    await expect(workbench.getByRole("button")).toHaveCount(7);
    for (const name of [
      "笔记本",
      "显示器",
      "外接键盘",
      "盆栽叶片",
      "左侧叶片",
      "右侧叶片",
      "工作灯",
    ]) {
      await expect(
        workbench.getByRole("button", { name, exact: true }),
      ).toHaveCount(1);
    }

    await waitForWorkbenchArtwork(scene);
    await page.mouse.move(0, 0);
    const resting = await scene.screenshot();
    const points = await scene.locator("svg").evaluate((element) => {
      const transform = (element as SVGSVGElement).getScreenCTM();
      if (!transform)
        throw new Error("Finished drawing has no coordinate transform");
      return [
        [808, 286], // hanging tool
        [1072, 447], // mouse
        [771, 524], // toolbox
        [882, 546], // stool
        [1076, 605], // drawer
        [1147, 445], // vise handle
      ].map(([x, y]) => {
        const point = new DOMPoint(x, y).matrixTransform(transform);
        return { x: point.x, y: point.y };
      });
    });
    for (const { x, y } of points) await page.mouse.click(x, y);
    const handle = points.at(-1)!;
    await page.mouse.down();
    await page.mouse.move(handle.x + 16, handle.y + 16, { steps: 4 });
    await page.mouse.up();
    await page.mouse.move(0, 0);
    await page.clock.runFor(100);
    expect((await scene.screenshot()).equals(resting)).toBe(true);
  });

  test("turns the work light off by mouse and back on by keyboard", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    await drawTo(page, workbench, 100);
    const scene = await waitForFinishedWorkbench(workbench);
    await waitForWorkbenchArtwork(scene);
    const lamp = workbench.getByRole("button", { name: "工作灯" });
    const diffuser = scene.locator('[data-workbench-part="lamp-diffuser"]');

    await expect(lamp).toHaveAttribute("aria-pressed", "true");
    await expect(diffuser).toHaveCount(0);
    const resting = await scene.screenshot();

    await lamp.click();
    await expect(lamp).toHaveAttribute("aria-pressed", "false");
    await page.clock.runFor(600);
    await expect(diffuser).toBeVisible();
    await lamp.blur();
    expect((await scene.screenshot()).equals(resting)).toBe(false);

    await lamp.press("Space");
    await expect(lamp).toHaveAttribute("aria-pressed", "true");
    await page.clock.runFor(600);
    await expect(diffuser).toHaveCount(0);
    await lamp.blur();
    expect((await scene.screenshot()).equals(resting)).toBe(true);
  });

  test("sways the plant on hover and keyboard activation, then restores the drawing", async ({
    page,
  }) => {
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    await drawTo(page, workbench, 100);
    const scene = await waitForFinishedWorkbench(workbench);
    const leaf = workbench.getByRole("button", {
      name: "盆栽叶片",
      exact: true,
    });
    const movingLeaves = scene.locator('[data-workbench-part^="leaf-"]');

    await leaf.hover();
    await page.clock.runFor(96);
    await expect(scene.locator('[data-workbench-part="leaf-0"]')).toHaveCount(
      1,
    );
    await expect(scene.locator('[data-workbench-part="leaf-1"]')).toHaveCount(
      1,
    );
    await page.mouse.move(0, 0);
    await page.clock.runFor(2400);
    await expect(movingLeaves).toHaveCount(0);

    await leaf.press("Space");
    await page.clock.runFor(96);
    await expect(movingLeaves).toHaveCount(2);
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
      await expect(screen).toHaveAttribute("data-phase", "typing");
      await expect(workbench.getByText(typing, { exact: true })).toBeAttached();
      const otherDevice = device === "laptop" ? "显示器" : "笔记本";
      await workbench
        .getByRole("button", { name: otherDevice, exact: true })
        .click();
      await expect(workbench.locator("[data-blueprint-device]")).toHaveCount(1);
      await expect(screen).toHaveAttribute("data-phase", "typing");
      await page.clock.fastForward(1600);
      await expect(screen).toHaveAttribute("data-phase", "drawing");
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
      await expect(screen).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  });

  test("waits for the workbench to enter view and lets touch tap parts without activating them on scroll", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 360 });
    const touch = await page.context().newCDPSession(page);
    await touch.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 2,
    });
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    const scene = workbenchScene(workbench);
    await page.clock.fastForward(1000);
    await expect(scene).toHaveAttribute("data-drawing-state", "waiting");
    await expect(workbench.getByRole("button")).toHaveCount(0);
    await scene.scrollIntoViewIfNeeded();
    await drawTo(page, workbench, 100);
    await page.setViewportSize({ width: 320, height: 844 });
    await expect(workbench.getByRole("button")).toHaveCount(7);

    const keyboard = workbench.getByRole("button", {
      name: "外接键盘",
      exact: true,
    });
    const leaf = workbench.getByRole("button", {
      name: "右侧叶片",
      exact: true,
    });
    const lamp = workbench.getByRole("button", { name: "工作灯" });
    const screen = workbench.locator('[data-blueprint-device="display"]');

    async function center(target: typeof keyboard) {
      return target.evaluate((element) => {
        element.scrollIntoView({ block: "center", behavior: "instant" });
        const bounds = element.getBoundingClientRect();
        const x = Math.round(bounds.x + bounds.width / 2);
        const y = Math.round(bounds.y + bounds.height / 2);
        if (!element.contains(document.elementFromPoint(x, y)))
          throw new Error(
            "The workbench part's center must accept touch input",
          );
        return { id: 1, x, y };
      });
    }

    async function tap(target: typeof keyboard) {
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [await center(target)],
      });
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    }

    const point = await center(keyboard);

    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [point],
    });
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchCancel",
      touchPoints: [],
    });
    await expect(screen).toHaveCount(0);

    const scrollBefore = await page.evaluate(() => {
      const start = scrollY;
      function markScrollEnd() {
        if (scrollY === start) return;
        document.documentElement.dataset["workbenchScrollFinished"] = "true";
        document.removeEventListener("scrollend", markScrollEnd);
      }
      document.addEventListener("scrollend", markScrollEnd);
      return start;
    });
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
    // Touch momentum can move the hotspot after the first scroll event.
    await expect(page.locator("html")).toHaveAttribute(
      "data-workbench-scroll-finished",
      "true",
    );
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(scrollBefore);
    await expect(screen).toHaveCount(0);

    await tap(keyboard);
    await expect(screen).toHaveAttribute("data-phase", "typing");
    await page.clock.fastForward(5000);
    await expect(screen).toHaveCount(0);

    await tap(lamp);
    await expect(lamp).toHaveAttribute("aria-pressed", "false");
    await tap(lamp);
    await expect(lamp).toHaveAttribute("aria-pressed", "true");

    await page.setViewportSize({ width: 667, height: 375 });
    await leaf.evaluate((element) => {
      element.scrollIntoView({ block: "center", behavior: "instant" });
    });
    const [leafBox, headerBox] = await Promise.all([
      leaf.boundingBox(),
      page.getByRole("banner").boundingBox(),
    ]);
    if (!leafBox || !headerBox) throw new Error("Missing leaf or header");
    expect(leafBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height);
    expect(leafBox.y + leafBox.height).toBeLessThanOrEqual(375);
    await tap(leaf);
    await page.clock.runFor(96);
    await expect(scene.locator('[data-workbench-part="leaf-2"]')).toHaveCount(
      1,
    );
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
