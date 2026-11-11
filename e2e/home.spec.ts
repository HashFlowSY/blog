import { expect } from "@playwright/test";

import { SITE_COPY, STABLE_PROJECT, test } from "./fixtures";
import { goToHome } from "./helpers/navigation";
import {
  drawTo,
  expectPencilAtStroke,
  installDrawingClock,
  movePencilToDrawing,
  paintedPencilLength,
  waitForWorkbenchModel,
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

  test("keeps the canvas blank until the pencil touches its first point", async ({
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
    console.log("Painted pencil lengths", JSON.stringify({ early, late }));
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
    await expect(pen).toHaveAttribute("data-pencil-length", "0");
    await expect(pen).not.toBeVisible();
    await waitForWorkbenchModel(workbench);
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

  test("provides the completed interactive artwork immediately for reduced motion", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    await expect(workbench.locator('[data-complete="true"]')).toBeVisible();
    await expect(
      workbench.locator('[data-construction-layer="pencil"]'),
    ).not.toBeVisible();
    await waitForWorkbenchModel(workbench);
    await expect(workbench.getByRole("button")).toHaveCount(0);
  });

  test("renders a solid workbench and allows continuous 360-degree orbit, underside and zoom", async ({
    page,
  }, testInfo) => {
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    await drawTo(page, workbench, 100);
    const view = await waitForWorkbenchModel(workbench);
    const canvas = view.locator("canvas");
    await view.scrollIntoViewIfNeeded();
    await page.clock.runFor(32);
    const initial = {
      x: Number(await canvas.getAttribute("data-camera-x")),
      y: Number(await canvas.getAttribute("data-camera-y")),
      z: Number(await canvas.getAttribute("data-camera-z")),
    };
    const front = await view.screenshot({
      path: testInfo.outputPath("model-front.png"),
    });
    for (let i = 0; i < 6; i++) await view.press("ArrowRight");
    await page.clock.runFor(32);
    expect(Number(await canvas.getAttribute("data-yaw"))).toBeCloseTo(90, 1);
    const side = await view.screenshot({
      path: testInfo.outputPath("model-side.png"),
    });
    expect(side.equals(front)).toBe(false);
    for (let i = 0; i < 6; i++) await view.press("ArrowRight");
    await page.clock.runFor(32);
    expect(Number(await canvas.getAttribute("data-yaw"))).toBeCloseTo(180, 1);
    expect(Number(await canvas.getAttribute("data-camera-z"))).toBeLessThan(0);
    const back = await view.screenshot({
      path: testInfo.outputPath("model-back.png"),
    });
    expect(back.equals(front)).toBe(false);
    for (let i = 0; i < 12; i++) await view.press("ArrowRight");
    await page.clock.runFor(32);
    expect(Number(await canvas.getAttribute("data-yaw"))).toBeCloseTo(360, 1);
    expect(Number(await canvas.getAttribute("data-camera-x"))).toBeCloseTo(
      initial.x,
      2,
    );
    expect(Number(await canvas.getAttribute("data-camera-z"))).toBeCloseTo(
      initial.z,
      2,
    );
    for (let i = 0; i < 4; i++) await view.press("ArrowDown");
    await page.clock.runFor(32);
    expect(Number(await canvas.getAttribute("data-camera-y"))).toBeLessThan(0);
    await view.screenshot({ path: testInfo.outputPath("model-underside.png") });
    await view.press("Home");
    await page.clock.runFor(32);
    await expect(canvas).toHaveAttribute("data-yaw", "0");
    await view.press("+");
    await page.clock.runFor(32);
    expect(Number(await canvas.getAttribute("data-zoom"))).toBeGreaterThan(1);
    await view.press("Home");
    await page.clock.runFor(32);
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Missing model canvas");
    for (let step = 0; step < 7; step++) await view.press("+");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -500);
    await page.clock.runFor(64);
    expect(Number(await canvas.getAttribute("data-zoom"))).toBeCloseTo(2.3, 3);
    await view.press("Home");
    await page.clock.runFor(32);
    for (let drag = 0; drag < 4; drag++) {
      await page.mouse.move(
        box.x + box.width * 0.75,
        box.y + box.height * 0.55,
      );
      await page.mouse.down();
      await page.mouse.move(
        box.x + box.width * 0.25,
        box.y + box.height * 0.55,
        { steps: 12 },
      );
      await page.mouse.up();
      // Skip intermediate inertia frames on CI's software WebGL renderer.
      await page.clock.fastForward(750);
    }
    expect(
      Math.abs(Number(await canvas.getAttribute("data-yaw"))),
    ).toBeGreaterThan(360);
    await expect(view).toBeFocused();
    await view.dblclick();
    await page.clock.runFor(32);
    await expect(canvas).toHaveAttribute("data-yaw", "0");
    await expect(canvas).toHaveAttribute("data-zoom", "1");
    expect(Number(await canvas.getAttribute("data-camera-y"))).toBeCloseTo(
      initial.y,
      2,
    );
    await expect(workbench.getByRole("button")).toHaveCount(0);
    await expect(workbench.getByRole("slider")).toHaveCount(0);
  });

  test("prepares graphite surfaces before the last stroke and crossfades without a blank frame", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const loaded: string[] = [];
    const errors: string[] = [];
    page.on("response", (response) => {
      if (response.ok()) loaded.push(response.url());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    const scene = workbench.locator("[data-progress]");
    const drawing = workbench
      .locator('[data-construction-layer="finish"]')
      .locator("..")
      .locator("..");
    await scene.scrollIntoViewIfNeeded();
    await drawTo(page, workbench, 99.9);
    const prepared = workbench.locator("[data-model-status]");
    await expect(prepared).toHaveAttribute("data-model-status", "ready", {
      timeout: 15000,
    });
    await expect(prepared).toHaveAttribute("aria-hidden", "true");
    await expect(prepared).toHaveCSS("opacity", "0");
    await expect(scene).toHaveAttribute("data-model-ready", "false");
    await workbench.screenshot({
      path: testInfo.outputPath("transition-drawing.png"),
    });
    await drawTo(page, workbench, 100);
    await expect(scene).toHaveAttribute("data-model-ready", "true");
    await expect(prepared).toHaveAttribute("data-active", "true");
    // The drawing clock controls JavaScript, while CSS uses the browser timeline.
    // Seek the real transitions so the sample cannot miss their middle frame.
    await scene.evaluate((element) => {
      for (const animation of element.getAnimations({ subtree: true })) {
        const duration = animation.effect?.getComputedTiming().duration;
        if (typeof duration !== "number" || duration <= 0) {
          throw new Error("Expected a finite workbench transition");
        }
        animation.pause();
        animation.currentTime = duration / 2;
      }
    });
    const opacity = await prepared.evaluate((element) =>
      Number(getComputedStyle(element).opacity),
    );
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(1);
    const drawingOpacity = await drawing.evaluate((element) =>
      Number(getComputedStyle(element).opacity),
    );
    expect(drawingOpacity).toBeGreaterThan(0);
    expect(drawingOpacity).toBeLessThan(1);
    await workbench.screenshot({
      path: testInfo.outputPath("transition-blend.png"),
    });
    await scene.evaluate((element) => {
      for (const animation of element.getAnimations({ subtree: true })) {
        animation.play();
      }
    });
    await waitForWorkbenchModel(workbench);
    await expect(drawing).toHaveCSS("opacity", "0");
    await workbench.screenshot({
      path: testInfo.outputPath("transition-model.png"),
    });
    expect(
      loaded.some((url) => url.includes("workbench-graphite-atlas.webp")),
    ).toBe(true);
    expect(
      loaded.some((url) => url.includes("workbench-pencil-detail.webp")),
    ).toBe(true);
    expect(errors).toEqual([]);
  });

  test("waits for the canvas on a short screen and supports touch orbit, pinch and scrolling", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });
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
    const view = await waitForWorkbenchModel(workbench);
    await view.scrollIntoViewIfNeeded();
    const canvas = view.locator("canvas");
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Missing touch model");
    const touch = await page.context().newCDPSession(page);
    await touch.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 2,
    });
    const x = Math.round(box.x + box.width * 0.35),
      y = Math.round(box.y + box.height * 0.6);
    const scrollBefore = await page.evaluate(() => scrollY);
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ id: 1, x, y }],
    });
    for (let i = 1; i <= 8; i++)
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ id: 1, x: x + i * 10, y }],
      });
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await page.clock.fastForward(750);
    expect(
      Math.abs(Number(await canvas.getAttribute("data-yaw"))),
    ).toBeGreaterThan(30);
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ id: 1, x, y }],
    });
    for (let i = 1; i <= 8; i++)
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ id: 1, x, y: y - i * 10 }],
      });
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await page.clock.fastForward(750);
    expect(
      Math.abs(Number(await canvas.getAttribute("data-pitch"))),
    ).toBeGreaterThan(20);
    expect(await page.evaluate(() => scrollY)).toBeCloseTo(scrollBefore, 0);
    const center = Math.round(box.x + box.width * 0.5);
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { id: 1, x: center - 24, y },
        { id: 2, x: center + 24, y },
      ],
    });
    for (let i = 1; i <= 8; i++)
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { id: 1, x: center - 24 - i * 4, y },
          { id: 2, x: center + 24 + i * 4, y },
        ],
      });
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await page.clock.fastForward(750);
    expect(Number(await canvas.getAttribute("data-zoom"))).toBeGreaterThan(1.2);
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ id: 1, x: 8, y: 600 }],
    });
    for (let i = 1; i <= 8; i++)
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ id: 1, x: 8, y: 600 - i * 12 }],
      });
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeGreaterThan(scrollBefore);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
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
