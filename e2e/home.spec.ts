import { expect } from "@playwright/test";

import {
  artworkSettledAt,
  drawingDuration,
  drawingStages,
  drawingTime,
} from "../src/components/home/pencil-plan";
import { pencilRoute } from "../src/components/home/pencil-route";

import { SITE_COPY, STABLE_PROJECT, test } from "./fixtures";
import { goToHome, waitForRouteEntry } from "./helpers/navigation";
import {
  artworkLuma,
  captureArtworkArea,
  captureWorkbenchArtwork,
  drawToTime,
  expectFirstWorkbenchPoint,
  expectPencilAtStroke,
  installDrawingClock,
  movePencilToDrawing,
  paintedPencilLength,
  waitForFinishedWorkbench,
  workbenchScene,
} from "./helpers/workbench";

import type { Locator, Page } from "@playwright/test";

async function holdRequest(page: Page, url: string | RegExp) {
  const { promise, resolve } = Promise.withResolvers<void>();
  await page.route(url, async (route) => {
    await promise;
    await route.continue();
  });
  return resolve;
}

function drawnMarkProgress(workbench: Locator) {
  return workbench
    .locator('[data-mark-kind="point"], [data-mark-kind="stroke"]')
    .evaluateAll((marks) =>
      Object.fromEntries(
        marks.map(
          (mark) =>
            [
              mark.getAttribute("data-drawing-mark")!,
              mark instanceof SVGCircleElement
                ? mark.r.baseVal.value
                : 1 - Number(mark.getAttribute("stroke-dashoffset")),
            ] as const,
        ),
      ),
    );
}

test.describe("Home page", () => {
  for (const [first, second] of [
    ["rest", "paper"],
    ["paper", "rest"],
  ] as const) {
    test(`keeps the paper stable when workbench ${first} loads first`, async ({
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
        const waitingPaper = scene.locator("[data-workbench-waiting]");
        await expect(scene).toBeVisible();
        await expect(waitingPaper).toBeVisible();
        const waitingLayout = await scene.boundingBox();
        const firstPaint = await scene.screenshot({ scale: "css" });

        const firstResponse = page.waitForResponse(firstUrl);
        releaseFirst();
        await (await firstResponse).finished();

        // A completed preload must still be reused after delayed hydration.
        releaseScripts();
        await waitForRouteEntry(page);
        await page.clock.fastForward(5000);
        await expect(scene).toHaveAttribute("data-drawing-state", "waiting");
        await expect(scene).toHaveAttribute("data-progress", "0");
        await expect(waitingPaper).toBeVisible();
        expect(
          (await scene.screenshot({ scale: "css" })).equals(firstPaint),
        ).toBe(true);

        releaseSecond();
        await expect(scene).toHaveAttribute("data-drawing-state", "drawing");
        await expect(scene).toHaveAttribute("data-progress", "0");
        await expect(waitingPaper).toHaveCount(0);
        expect(await scene.boundingBox()).toEqual(waitingLayout);
        await drawToTime(page, workbench, drawingDuration);
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

  test("announces unavailable artwork and leaves the workbench inactive", async ({
    page,
  }) => {
    await page.route("**/workbench-rest.webp", (route) => route.abort());
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    const scene = workbenchScene(workbench);
    await expect(scene).toHaveAttribute("data-drawing-state", "failed");
    await expect(scene).toBeVisible();
    await expect(scene.locator("[data-workbench-drawing]")).toHaveCount(0);
    await expect(workbench.getByRole("button")).toHaveCount(0);
    await expect(workbench.getByRole("status")).toHaveText(
      "工作台画稿未能载入",
    );
  });

  test("continues drawing when the pencil sprite is unavailable", async ({
    page,
  }) => {
    await page.route("**/drawing-pencil.webp", (route) => route.abort());
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    await drawToTime(page, workbench, drawingStages.line.end);
    await expect(
      workbench.locator('[data-construction-layer="pencil"]'),
    ).toHaveCount(0);
    await expect(
      workbench.locator('[data-pencil-path="guide-worktop"]'),
    ).toBeVisible();
    await drawToTime(page, workbench, drawingDuration);
    await waitForFinishedWorkbench(workbench);
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
      await expectFirstWorkbenchPoint(page, workbench);
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
    await drawToTime(page, workbench, drawingDuration);
    await page
      .getByRole("navigation", { name: "主导航" })
      .getByRole("link", { name: /关于/ })
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: SITE_COPY.aboutTitle }),
    ).toBeVisible();
    await page.getByRole("link", { name: "回到首页", exact: true }).click();
    await expectFreshDrawing();
    await drawToTime(page, workbench, drawingDuration);
    await page.reload();
    await expectFreshDrawing();
    await drawToTime(page, workbench, drawingDuration);
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
    await expectFirstWorkbenchPoint(page, workbench);
  });

  test("visibly consumes the pencil and exhausts the last tip at completion", async ({
    page,
  }) => {
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    const pen = workbench.locator('[data-construction-layer="pencil"]');
    await expectFirstWorkbenchPoint(page, workbench);
    const early = await paintedPencilLength(page, workbench);
    await drawToTime(page, workbench, drawingStages.finish.start);
    const late = await paintedPencilLength(page, workbench);
    expect(early.pixels).toBeGreaterThan(30);
    expect(late.pixels).toBeGreaterThan(30);
    expect(late.extent).toBeLessThan(early.extent);
    expect(
      Number(await pen.getAttribute("data-pencil-length")),
    ).toBeGreaterThan(0);
    await drawToTime(page, workbench, drawingDuration);
    await expect(pen).toHaveCount(0);
    await waitForFinishedWorkbench(workbench);
  });

  test("keeps the pencil on the visible construction, ink, and shading strokes", async ({
    page,
  }) => {
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    for (const stage of ["line", "ink", "shadow"] as const) {
      await drawToTime(page, workbench, drawingStages[stage].start);
      await movePencilToDrawing(page, workbench);
      await expect(workbenchScene(workbench)).toHaveAttribute(
        "data-drawing-stage",
        stage,
      );
      await expectPencilAtStroke(workbench);
    }
  });

  test("adds strokes only where the pencil makes contact", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    const scene = workbenchScene(workbench);
    const pen = workbench.locator('[data-construction-layer="pencil"]');
    const shelfArea = [730, 190, 1220, 228] as const;
    const samples = [
      { id: "guide-right-leg", area: [1155, 536, 1176, 662] },
      { id: "guide-worktop", area: [800, 435, 1060, 480] },
    ] as const;

    for (const { id, area } of samples) {
      const stroke = pencilRoute.find((item) => item.id === id)!;
      const start = drawingTime(stroke.start);
      const end = drawingTime(stroke.end);
      await drawToTime(page, workbench, start + (end - start) / 4);
      await expect(pen).toHaveAttribute("data-stroke", id);
      await expectPencilAtStroke(workbench);
      const before = await drawnMarkProgress(workbench);
      const nearby = await captureArtworkArea(scene, area);
      const farAway = await captureArtworkArea(scene, shelfArea);

      await drawToTime(page, workbench, (start + end) / 2);
      await expect(pen).toHaveAttribute("data-stroke", id);
      await expectPencilAtStroke(workbench);
      const after = await drawnMarkProgress(workbench);
      const growing = Object.keys(after).filter(
        (mark) => after[mark]! > (before[mark] ?? 0),
      );
      expect(growing).toEqual([id]);
      expect((await captureArtworkArea(scene, area)).equals(nearby)).toBe(
        false,
      );
      expect((await captureArtworkArea(scene, shelfArea)).equals(farAway)).toBe(
        true,
      );
    }

    const worktop = pencilRoute.find(
      (stroke) => stroke.id === "guide-worktop",
    )!;
    const post = pencilRoute.find((stroke) => stroke.id === "guide-left-post")!;
    const liftStart = drawingTime(worktop.end);
    const drawingWithoutPencil = () =>
      scene.locator("[data-workbench-drawing]").evaluate((svg) => {
        const drawing = svg.cloneNode(true) as SVGSVGElement;
        drawing.querySelector('[data-construction-layer="pencil"]')?.remove();
        return drawing.outerHTML;
      });
    await drawToTime(page, workbench, liftStart);
    await expect(pen).toHaveAttribute("data-phase", "lifting");
    const lifted = await drawingWithoutPencil();
    const initialPose = await pen.getAttribute("transform");
    await drawToTime(
      page,
      workbench,
      (liftStart + drawingTime(post.start)) / 2,
    );
    await expect(pen).toHaveAttribute("data-phase", "lifting");
    expect(await pen.getAttribute("transform")).not.toBe(initialPose);
    expect(await drawingWithoutPencil()).toBe(lifted);
  });

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    test(`builds the whole workbench before adding details at ${viewport.width}px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await installDrawingClock(page);
      await goToHome(page);
      const workbench = page.getByRole("region", { name: "交互工作台" });
      const scene = workbenchScene(workbench);
      await scene.scrollIntoViewIfNeeded();
      await expect(scene).toHaveAttribute("data-drawing-stage", "point");

      const regions = [
        [730, 190, 1220, 228], // upper shelf
        [635, 427, 945, 475], // front edge of the worktop
        [1149, 494, 1181, 689], // lower right support
      ] as const;
      const paper: Buffer[] = [];
      for (const area of regions)
        paper.push(await captureArtworkArea(scene, area));

      await drawToTime(page, workbench, drawingStages.line.end);
      for (const [index, area] of regions.entries()) {
        const structure = await captureArtworkArea(scene, area);
        expect(structure.equals(paper[index]!)).toBe(false);
      }
      for (const id of ["guide-shelf", "guide-worktop", "guide-right-leg"])
        await expect(
          workbench.locator(`[data-pencil-path="${id}"]`),
        ).toBeVisible();
      await expect(
        workbench.locator(
          '[data-mark-stage="rough"], [data-mark-stage="finish"]',
        ),
      ).toHaveCount(0);

      await drawToTime(page, workbench, drawingStages.plane.end);
      await expect(
        workbench.locator('[data-mark-stage="plane"]').first(),
      ).toBeVisible();

      await drawToTime(page, workbench, drawingStages.rough.end);
      for (const id of [
        "rough-notebook",
        "rough-display",
        "rough-stool",
        "rough-tools",
      ])
        await expect(
          workbench.locator(`[data-pencil-path="${id}"]`),
        ).toBeVisible();
      await expect(
        workbench.locator(
          '[data-mark-stage="shadow"], [data-mark-stage="finish"]',
        ),
      ).toHaveCount(0);

      await drawToTime(page, workbench, drawingStages.shadow.end - 48);
      await expect(
        workbench.locator('[data-mark-stage="ink"]').first(),
      ).toBeVisible();
      await expect(
        workbench
          .locator('[data-mark-stage="shadow"][data-mark-kind="stroke"]')
          .first(),
      ).toBeVisible();
      await expect(workbench.locator('[data-mark-stage="finish"]')).toHaveCount(
        0,
      );
      await expect(workbench.getByRole("button")).toHaveCount(0);

      const finishing = [
        { id: "finish-notebook-study", area: [774, 362, 853, 416] },
        { id: "finish-display-study", area: [1027, 347, 1068, 394] },
        { id: "finish-yellow-pencil", area: [1025, 579, 1125, 628] },
      ] as const;
      const beforeFinish: Buffer[] = [];
      for (const { area } of finishing)
        beforeFinish.push(await captureArtworkArea(scene, area));

      const pen = workbench.locator('[data-construction-layer="pencil"]');
      for (const [index, { id, area }] of finishing.entries()) {
        const stroke = pencilRoute.find((item) => item.id === id)!;
        await drawToTime(
          page,
          workbench,
          drawingTime((stroke.start + stroke.end) / 2),
        );
        await expect(pen).toHaveAttribute("data-stroke", id);
        await expectPencilAtStroke(workbench);
        expect(
          (await captureArtworkArea(scene, area)).equals(beforeFinish[index]!),
        ).toBe(false);
        for (const [later, sample] of finishing.entries()) {
          if (later <= index) continue;
          expect(
            (await captureArtworkArea(scene, sample.area)).equals(
              beforeFinish[later]!,
            ),
          ).toBe(true);
        }
      }

      await drawToTime(page, workbench, artworkSettledAt - 96);
      await expect(
        workbench.locator('[data-drawing-mark="finish-yellow-drawer"]'),
      ).toBeVisible();
      await drawToTime(page, workbench, artworkSettledAt);
      await expect(scene).toHaveAttribute("data-drawing-stage", "finish");
      const settled = await captureWorkbenchArtwork(scene);
      await drawToTime(page, workbench, drawingDuration);
      await waitForFinishedWorkbench(workbench);
      expect((await captureWorkbenchArtwork(scene)).equals(settled)).toBe(true);
    });
  }

  test("exposes only the computers, leaves, and light and keeps the other artwork static", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    await drawToTime(page, workbench, drawingDuration);
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
    await drawToTime(page, workbench, drawingDuration);
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

  test("rotates the targeted leaves around fixed stems and holds the background guide", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    await drawToTime(page, workbench, drawingDuration);
    const scene = await waitForFinishedWorkbench(workbench);
    const leaf = workbench.getByRole("button", {
      name: "盆栽叶片",
      exact: true,
    });
    const foliage = scene.locator('[data-workbench-plant="foliage"]');
    const movingLeaf = foliage.locator('[data-workbench-leaf="leaf-0"]');
    const movingNeighbor = foliage.locator('[data-workbench-leaf="leaf-1"]');
    const background = scene.locator('[data-workbench-plant="background"]');
    const backgroundImage = background.locator("image");
    const backgroundGuide = [807, 90, 808, 95] as const;
    const pot = [785, 174, 829, 179] as const;
    const restingGuide = await captureArtworkArea(scene, backgroundGuide);
    const restingPot = await captureArtworkArea(scene, pot);
    const restingHotspot = await leaf.boundingBox();

    async function captureLeafFrame() {
      return {
        target: await captureArtworkArea(scene, [778, 95, 808, 121]),
        neighbor: await captureArtworkArea(scene, [754, 135, 790, 158]),
        farLeaves: await captureArtworkArea(scene, [839, 134, 861, 148]),
        stems: await captureArtworkArea(scene, [804, 160, 817, 165]),
      };
    }

    async function readLeafRotation(layer: typeof movingLeaf) {
      return layer.evaluate((element) => {
        const group = element as SVGGElement;
        const matrix = group
          .ownerSVGElement!.getScreenCTM()!
          .inverse()
          .multiply(group.getScreenCTM()!);
        const { a, b, c, d, e, f } = matrix;
        // Recover the point that the branch's artwork transform leaves fixed.
        const pivotDeterminant = (1 - a) * (1 - d) - b * c;
        return {
          xScale: Math.hypot(a, b),
          yScale: Math.hypot(c, d),
          skew: a * c + b * d,
          angle: Math.atan2(b, a),
          pivotX: ((1 - d) * e + c * f) / pivotDeterminant,
          pivotY: (b * e + (1 - a) * f) / pivotDeterminant,
        };
      });
    }

    await leaf.hover();
    await page.clock.runFor(48);
    await expect(backgroundImage).toHaveCount(1);
    await expect(movingLeaf).toBeVisible();
    expect(await leaf.boundingBox()).toEqual(restingHotspot);

    // Compare two active frames, after the clean background has been mounted.
    const early = await captureLeafFrame();
    await page.clock.runFor(80);
    const peak = await captureLeafFrame();
    const forward = await readLeafRotation(movingLeaf);
    const neighbor = await readLeafRotation(movingNeighbor);
    expect(peak.farLeaves.equals(early.farLeaves)).toBe(true);
    expect(peak.stems.equals(early.stems)).toBe(true);
    expect(peak.target.equals(early.target)).toBe(false);
    expect(peak.neighbor.equals(early.neighbor)).toBe(false);
    expect(forward.xScale).toBeCloseTo(1, 5);
    expect(forward.yScale).toBeCloseTo(1, 5);
    expect(forward.skew).toBeCloseTo(0, 5);
    expect(forward.angle).toBeGreaterThan(0);
    expect(neighbor.angle).toBeLessThan(0);
    expect(Math.abs(neighbor.angle)).toBeLessThan(forward.angle);

    const alpha = await backgroundImage.evaluate(async (element) => {
      const layer = element as SVGImageElement;
      const image = new Image();
      image.src = layer.href.baseVal.replace(
        "plant-background.webp",
        "plant-foliage.webp",
      );
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0);
      const x = 807 - layer.x.baseVal.value;
      const top = layer.y.baseVal.value;
      const columnAlpha = (start: number, end: number) =>
        Array.from(
          context.getImageData(x, start - top, 1, end - start).data,
        ).filter((_, index) => index % 4 === 3);
      return {
        guide: [...columnAlpha(92, 95), ...columnAlpha(109, 115)],
        leaf: columnAlpha(97, 104),
      };
    });
    // The guide's gaps stay transparent without opening a slit in the leaf.
    expect(alpha.guide).toEqual(Array<number>(9).fill(0));
    expect(alpha.leaf).toEqual(Array<number>(7).fill(255));
    expect((await captureArtworkArea(scene, pot)).equals(restingPot)).toBe(
      true,
    );
    expect(
      (await captureArtworkArea(scene, backgroundGuide)).equals(restingGuide),
    ).toBe(true);

    await page.clock.runFor(304);
    const rebound = await readLeafRotation(movingLeaf);
    expect(rebound.angle).toBeLessThan(0);
    expect(rebound.pivotX).toBeCloseTo(forward.pivotX, 2);
    expect(rebound.pivotY).toBeCloseTo(forward.pivotY, 2);

    await page.mouse.move(0, 0);
    await page.clock.runFor(2400);
    await expect(foliage).toHaveCount(0);
    await expect(background).toHaveCount(0);

    await leaf.press("Space");
    await page.clock.runFor(96);
    await expect(movingLeaf).toBeVisible();
  });

  test("redraws the two computer screens in place after typing", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    await drawToTime(page, workbench, drawingDuration);
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
    await drawToTime(page, workbench, drawingDuration);
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
    await expect(scene.locator('[data-workbench-leaf="leaf-2"]')).toBeVisible();
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
