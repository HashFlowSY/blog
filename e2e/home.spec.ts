import { expect } from "@playwright/test";

import { drawingAreas } from "../src/components/home/workbench-geometry";

import { SITE_COPY, STABLE_PROJECT, test } from "./fixtures";
import { goToHome, waitForRouteEntry } from "./helpers/navigation";
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

import type { Page } from "@playwright/test";

async function holdRequest(page: Page, url: string | RegExp) {
  const { promise, resolve } = Promise.withResolvers<void>();
  await page.route(url, async (route) => {
    await promise;
    await route.continue();
  });
  return resolve;
}

async function expectUniformWorkbenchBackground(page: Page) {
  // At 1440 × 900 the paper mask starts at x = 594.
  const swatch = { y: 140, width: 4, height: 4 };
  const outside = await page.screenshot({
    clip: { x: 590, ...swatch },
    scale: "css",
  });
  const inside = await page.screenshot({
    clip: { x: 600, ...swatch },
    scale: "css",
  });
  expect(inside.equals(outside), "Both sides of the paper edge match").toBe(
    true,
  );
}

test.describe("Home page", () => {
  for (const [first, second] of [
    ["rest", "paper"],
    ["paper", "rest"],
  ] as const) {
    test(`keeps a uniform first paint when workbench ${first} loads first`, async ({
      browserName,
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await installDrawingClock(page);
      const firstUrl = `**/workbench-${first}.webp`;
      const artworkRequests: string[] = [];
      page.on("request", (request) => {
        const pathname = new URL(request.url()).pathname;
        const asset = /\/(workbench-(?:paper|rest)\.webp)$/.exec(pathname)?.[1];
        if (asset) artworkRequests.push(asset);
      });
      const releaseScripts = await holdRequest(page, /\/_next\/.*\.js$/);
      const releaseFirst = await holdRequest(page, firstUrl);
      const releaseSecond = await holdRequest(
        page,
        `**/workbench-${second}.webp`,
      );
      const releaseLamp = await holdRequest(
        page,
        "**/lamp-diffuser-sprite.webp",
      );
      try {
        await page.goto("./", { waitUntil: "domcontentloaded" });
        const workbench = page.getByRole("region", { name: "交互工作台" });
        const scene = workbenchScene(workbench);
        // WebKit's screenshot can wait on the requests held by this test.
        const expectWaitingArtwork =
          browserName === "webkit"
            ? () => expect(scene.locator("svg").first()).toBeHidden()
            : () => expectUniformWorkbenchBackground(page);
        await expect(scene).toBeVisible();
        const waitingLayout = await scene.boundingBox();
        await expectWaitingArtwork();

        const firstResponse = page.waitForResponse(firstUrl);
        releaseFirst();
        await (await firstResponse).finished();

        // A completed preload must still be reused after delayed hydration.
        releaseScripts();
        await waitForRouteEntry(page);
        await page.clock.fastForward(5000);
        await expect(scene).toHaveAttribute("data-drawing-state", "waiting");
        await expect(scene).toHaveAttribute("data-progress", "0");
        await expectWaitingArtwork();

        releaseSecond();
        await expect(scene).toHaveAttribute("data-drawing-state", "drawing");
        await expect(scene).toHaveAttribute("data-progress", "0");
        expect(await scene.boundingBox()).toEqual(waitingLayout);
        await drawTo(page, workbench, 100);
        await waitForFinishedWorkbench(workbench);
        await expect(workbench.getByRole("button")).toHaveCount(0);

        releaseLamp();
        await expect(workbench.getByRole("button")).toHaveCount(7);
        expect(artworkRequests.sort()).toEqual([
          "workbench-paper.webp",
          "workbench-rest.webp",
        ]);
      } finally {
        releaseScripts();
        releaseFirst();
        releaseSecond();
        releaseLamp();
      }
    });
  }

  for (const reason of ["reduced motion", "missing paper"] as const) {
    test(`shows the finished workbench without drawing for ${reason}`, async ({
      page,
    }) => {
      const animationAssetRequests: string[] = [];
      if (reason === "reduced motion") {
        await page.emulateMedia({ reducedMotion: "reduce" });
        page.on("request", (request) => {
          const pathname = new URL(request.url()).pathname;
          if (/\/(?:workbench-paper|drawing-pencil)\.webp$/.test(pathname)) {
            animationAssetRequests.push(pathname);
          }
        });
      } else {
        await page.route("**/workbench-paper.webp", (route) => route.abort());
      }
      await installDrawingClock(page);
      const restUrl = "**/workbench-rest.webp";
      const releaseRest = await holdRequest(page, restUrl);
      try {
        await page.goto("./", { waitUntil: "domcontentloaded" });
        await waitForRouteEntry(page);
        const workbench = page.getByRole("region", { name: "交互工作台" });
        const scene = workbenchScene(workbench);
        await page.clock.runFor(32);
        await expect(scene).toHaveAttribute("data-drawing-state", "waiting");
        await expect(workbench.getByRole("button")).toHaveCount(0);

        releaseRest();
        await waitForFinishedWorkbench(workbench);
        await expect(workbench.getByRole("button")).toHaveCount(7);
        if (reason === "reduced motion") {
          expect(animationAssetRequests).toEqual([]);
        }
      } finally {
        releaseRest();
      }
    });
  }

  test("keeps an unavailable workbench blank and non-interactive", async ({
    page,
  }) => {
    await page.route("**/workbench-rest.webp", (route) => route.abort());
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    const scene = workbenchScene(workbench);
    await expect(scene).toHaveAttribute("data-drawing-state", "failed");
    await expect(scene).toBeVisible();
    await expect(scene.locator("svg")).toHaveCount(0);
    await expect(workbench.getByRole("button")).toHaveCount(0);
    await expect(workbench.getByRole("status")).toHaveText(
      "工作台画稿未能载入",
    );
  });

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

  test("finishes hanging tools and the notebook screen before moving on", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    const scene = workbenchScene(workbench);
    await page.addStyleTag({
      content:
        '[data-construction-layer="pencil"] { visibility: hidden !important; }',
    });
    const [toolsClip, notebookClip] = await scene
      .locator('svg[focusable="false"]')
      .evaluate((element) => {
        const transform = (element as SVGSVGElement).getScreenCTM();
        if (!transform) throw new Error("Drawing has no coordinate transform");
        const clip = (
          left: number,
          top: number,
          right: number,
          bottom: number,
        ) => {
          const topLeft = new DOMPoint(left, top).matrixTransform(transform);
          const bottomRight = new DOMPoint(right, bottom).matrixTransform(
            transform,
          );
          const x = Math.ceil(topLeft.x);
          const y = Math.ceil(topLeft.y);
          return {
            x,
            y,
            width: Math.floor(bottomRight.x) - x,
            height: Math.floor(bottomRight.y) - y,
          };
        };
        return [clip(1150, 327, 1191, 361), clip(770, 356, 868, 412)] as const;
      });

    const pegboard = drawingAreas.find((area) => area.id === "pegboard")!;
    await drawTo(page, workbench, 2);
    const toolsPaper = await page.screenshot({ clip: toolsClip, scale: "css" });
    const notebookPaper = await page.screenshot({
      clip: notebookClip,
      scale: "css",
    });
    await drawTo(page, workbench, pegboard.end);
    const toolsDrawn = await page.screenshot({ clip: toolsClip, scale: "css" });
    expect(
      (await page.screenshot({ clip: notebookClip, scale: "css" })).equals(
        notebookPaper,
      ),
    ).toBe(true);

    await drawTo(page, workbench, 70);
    await expect(scene).toHaveAttribute("data-drawing-state", "drawing");
    const notebookDrawn = await page.screenshot({
      clip: notebookClip,
      scale: "css",
    });

    await drawTo(page, workbench, 100);
    await waitForFinishedWorkbench(workbench);

    expect(toolsDrawn.equals(toolsPaper)).toBe(false);
    expect(
      toolsDrawn.equals(
        await page.screenshot({ clip: toolsClip, scale: "css" }),
      ),
    ).toBe(true);
    expect(notebookDrawn.equals(notebookPaper)).toBe(false);
    expect(
      notebookDrawn.equals(
        await page.screenshot({ clip: notebookClip, scale: "css" }),
      ),
    ).toBe(true);
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

  test("fades the workbench light in place by mouse and keyboard", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    await drawTo(page, workbench, 100);
    const scene = await waitForFinishedWorkbench(workbench);
    const lamp = workbench.getByRole("button", { name: "工作灯" });
    const lampStatus = workbench
      .getByRole("status")
      .filter({ hasText: /^工作灯/ });
    const diffuser = [887, 224, 976, 230] as const;
    const pegboard = [900, 245, 975, 265] as const;
    const tabletop = [931, 446, 955, 452] as const;
    const controlRegions = [
      { name: "display drawing", area: [1026, 365, 1070, 385] },
      { name: "drawer", area: [1030, 590, 1100, 620] },
      { name: "paper outside the workbench", area: [667, 265, 696, 285] },
    ] as const;

    async function luma(area: Parameters<typeof captureArtworkArea>[1]) {
      return artworkLuma(page, await captureArtworkArea(scene, area));
    }

    async function sampleLamp() {
      return {
        diffuser: await luma(diffuser),
        pegboard: await luma(pegboard),
        tabletop: await luma(tabletop),
      };
    }

    await expect(lamp).toHaveAttribute("aria-pressed", "true");
    await page.mouse.move(0, 0);
    const resting = await scene.screenshot();
    const lit = await sampleLamp();
    const controlSamples = await Promise.all(
      controlRegions.map(async (region) => ({
        ...region,
        on: await captureArtworkArea(scene, region.area),
      })),
    );

    async function expectUnlitRegionsUnchanged() {
      for (const { name, area, on } of controlSamples) {
        const frame = await captureArtworkArea(scene, area);
        expect(frame.equals(on), `${name} should keep its colors`).toBe(true);
      }
    }

    await lamp.click();
    await expect(lamp).toHaveAttribute("aria-pressed", "false");
    await expect(lampStatus).toHaveText("工作灯已关闭");
    await page.clock.runFor(85);
    const dimming = await sampleLamp();
    await page.clock.runFor(265);
    await lamp.blur();
    await page.mouse.move(0, 0);
    const dark = await sampleLamp();
    expect(
      lit.diffuser - dark.diffuser,
      "diffuser should dim",
    ).toBeGreaterThanOrEqual(25);
    expect(
      lit.pegboard - dark.pegboard,
      "pegboard should dim",
    ).toBeGreaterThanOrEqual(12);
    expect(
      lit.tabletop - dark.tabletop,
      "tabletop should dim",
    ).toBeGreaterThanOrEqual(7);
    await expectUnlitRegionsUnchanged();

    await lamp.press("Space");
    await expect(lamp).toHaveAttribute("aria-pressed", "true");
    await expect(lampStatus).toHaveText("工作灯已开启");
    await page.clock.runFor(90);
    const brightening = await sampleLamp();
    await expectUnlitRegionsUnchanged();
    await page.clock.runFor(260);
    await lamp.blur();
    expect((await scene.screenshot()).equals(resting)).toBe(true);

    for (const [direction, frame, start, end] of [
      ["off", dimming, lit, dark],
      ["on", brightening, dark, lit],
    ] as const) {
      const progress = (area: keyof typeof frame) =>
        (frame[area] - start[area]) / (end[area] - start[area]);
      const board = progress("pegboard");
      const table = progress("tabletop");
      for (const [name, fraction] of [
        ["pegboard", board],
        ["tabletop", table],
      ] as const) {
        expect(
          fraction,
          `${name} starts fading when turning ${direction}`,
        ).toBeGreaterThan(0.15);
        expect(
          fraction,
          `${name} is still fading when turning ${direction}`,
        ).toBeLessThan(0.85);
      }
      expect(
        Math.abs(board - table),
        `both surfaces fade together when turning ${direction}`,
      ).toBeLessThan(0.25);
      expect(
        progress("diffuser") - Math.max(board, table),
        `diffuser responds sooner when turning ${direction}`,
      ).toBeGreaterThan(0.15);
    }
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
