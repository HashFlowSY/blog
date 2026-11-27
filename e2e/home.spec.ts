import { expect } from "@playwright/test";

import {
  artworkSettledAt,
  backgroundDrawing,
  drawingDuration,
  drawingObjects,
  drawingTime,
} from "../src/components/home/pencil-plan";
import { pencilRoute } from "../src/components/home/pencil-route";
import { drawingParts } from "../src/components/home/workbench-geometry";

import { SITE_COPY, STABLE_PROJECT, test } from "./fixtures";
import { goToHome, waitForRouteEntry } from "./helpers/navigation";
import {
  artworkLuma,
  captureArtworkArea,
  captureWorkbenchArtwork,
  drawToTime,
  expectFirstBackgroundStroke,
  expectFirstWorkbenchPoint,
  expectPencilAtStroke,
  expectUnchangedArtwork,
  installDrawingClock,
  movePencilToDrawing,
  paintedPencilLength,
  waitForFinishedWorkbench,
  workbenchScene,
} from "./helpers/workbench";

import type { Locator, Page } from "@playwright/test";

const workbenchArtwork = {
  paper: "sketchbook-paper.webp",
  rest: "workbench-rest.webp",
};

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
                ? Number(mark.getAttribute("opacity"))
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
      const firstUrl = `**/${workbenchArtwork[first]}`;
      const artworkRequests: string[] = [];
      page.on("request", (request) => {
        const pathname = new URL(request.url()).pathname;
        const asset = pathname.split("/").at(-1);
        if (
          asset === workbenchArtwork[first] ||
          asset === workbenchArtwork[second]
        )
          artworkRequests.push(asset);
      });
      const releaseScripts = await holdRequest(page, /\/_next\/.*\.js$/);
      const releaseFirst = await holdRequest(page, firstUrl);
      const releaseSecond = await holdRequest(
        page,
        `**/${workbenchArtwork[second]}`,
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
          workbenchArtwork.paper,
          workbenchArtwork.rest,
        ]);
      } finally {
        releaseScripts();
        releaseFirst();
        releaseSecond();
        releaseLamp();
      }
    });
  }

  for (const [reason, asset] of [
    ["reduced motion", undefined],
    ["missing paper", workbenchArtwork.paper],
    ["missing tabletop texture", "workbench-table-texture.webp"],
    ["missing chair background", "workbench-chair-background.webp"],
  ] as const) {
    test(`shows the finished workbench without drawing for ${reason}`, async ({
      page,
    }) => {
      const animationAssetRequests: string[] = [];
      if (asset) {
        await page.route(`**/${asset}`, (route) => route.abort());
      } else {
        await page.emulateMedia({ reducedMotion: "reduce" });
        page.on("request", (request) => {
          const pathname = new URL(request.url()).pathname;
          if (
            /\/(?:sketchbook-paper|drawing-pencil|workbench-(?:(?:table|pegboard|shelf)-texture|chair-background))\.webp$/.test(
              pathname,
            )
          ) {
            animationAssetRequests.push(pathname);
          }
        });
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
        if (!asset) {
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
    const scene = workbenchScene(workbench);
    const worktop = [750, 435, 1050, 476] as const;
    const paper = await captureArtworkArea(scene, worktop);
    await drawToTime(page, workbench, drawingObjects[0]!.end - 18);
    await expect(
      workbench.locator('[data-construction-layer="pencil"]'),
    ).toHaveCount(0);
    expect((await captureArtworkArea(scene, worktop)).equals(paper)).toBe(
      false,
    );
    await drawToTime(page, workbench, drawingDuration);
    await waitForFinishedWorkbench(workbench);
  });

  test("lets visitors skip or replay the drawing and opens the finished workbench on return", async ({
    page,
  }) => {
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    const scene = workbenchScene(workbench);
    async function expectFreshDrawing() {
      await expect(scene).toHaveAttribute("data-progress", "0");
      await expectFirstBackgroundStroke(page, workbench);
      await expect(workbench.getByRole("button")).toHaveCount(0);
      expect(
        Number(
          await workbench
            .locator('[data-construction-layer="pencil"]')
            .getAttribute("data-pencil-wear"),
        ),
      ).toBeLessThan(0.03);
    }
    await expectFreshDrawing();
    await page.getByRole("button", { name: "直接体验" }).press("Enter");
    const lamp = workbench.getByRole("button", { name: "工作灯" });
    await expect(lamp).toBeFocused();
    await lamp.press("Space");
    await expect(lamp).toHaveAttribute("aria-pressed", "false");
    await page
      .getByRole("navigation", { name: "主导航" })
      .getByRole("link", { name: /关于/ })
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: SITE_COPY.aboutTitle }),
    ).toBeVisible();
    await page.getByRole("link", { name: "回到首页", exact: true }).click();
    await expect(scene).toHaveAttribute("data-progress", "100");
    await page.reload();
    await expect(scene).toHaveAttribute("data-progress", "100");
    await page.getByRole("button", { name: "重看绘制" }).press("Enter");
    await expectFreshDrawing();
    await page
      .getByRole("navigation", { name: "主导航" })
      .getByRole("link", { name: /关于/ })
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: SITE_COPY.aboutTitle }),
    ).toBeVisible();
    await page.goBack();
    await expect(scene).toHaveAttribute("data-progress", "100");
    await expect(lamp).toBeEnabled();
  });

  test("reveals the first position mark only when the pencil touches it", async ({
    page,
  }) => {
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    await expectFirstWorkbenchPoint(page, workbench);
  });

  test("shortens the pencil while drawing and lifts the remaining stub", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    const pen = workbench.locator('[data-construction-layer="pencil"]');
    await expectFirstBackgroundStroke(page, workbench);
    const early = await paintedPencilLength(page, workbench);
    await expect(pen).toHaveAttribute("data-pencil-medium", "graphite");
    const yellow = pencilRoute.find(({ id }) => id === "drawer-yellow-second")!;
    await drawToTime(
      page,
      workbench,
      drawingTime((yellow.start + yellow.end) / 2),
    );
    const middle = await paintedPencilLength(page, workbench);
    await expect(pen).toHaveAttribute("data-pencil-medium", "yellow");
    expect(early.pixels).toBeGreaterThan(30);
    expect(early.extent).toBeGreaterThan(146);
    expect(early.extent).toBeLessThan(153);
    expect(middle.pixels).toBeGreaterThan(30);
    expect(middle.extent).toBeLessThan(early.extent - 15);
    await drawToTime(page, workbench, artworkSettledAt);
    await expect(pen).toHaveAttribute("data-phase", "lifting");
    await expect(pen).toHaveAttribute("data-pencil-medium", "graphite");
    await expect(pen).toBeVisible();
    const stub = await paintedPencilLength(page, workbench);
    expect(stub.pixels).toBeGreaterThan(30);
    expect(stub.extent).toBeLessThan(middle.extent - 15);
    expect(stub.extent).toBeGreaterThan(80);
    expect(stub.extent).toBeLessThan(106);
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
    for (const object of drawingObjects.slice(1)) {
      await drawToTime(page, workbench, object.start);
      await movePencilToDrawing(page, workbench);
      await expect(workbenchScene(workbench)).toHaveAttribute(
        "data-drawing-object",
        object.id,
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
      { id: "guide-depth", area: [1173, 438, 1250, 476] },
      { id: "guide-worktop", area: [800, 435, 1060, 480] },
    ] as const;

    for (const { id, area } of samples) {
      const stroke = pencilRoute.find((item) => item.id === id)!;
      const start = drawingTime(stroke.start);
      const end = drawingTime(stroke.end);
      await drawToTime(page, workbench, start + (end - start) / 8);
      await expect(pen).toHaveAttribute("data-stroke", id);
      await expectPencilAtStroke(workbench);
      const before = await drawnMarkProgress(workbench);
      const nearby = await captureArtworkArea(scene, area);
      const farAway = await captureArtworkArea(scene, shelfArea);

      await drawToTime(page, workbench, start + (end - start) * 0.58);
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
      await expectUnchangedArtwork(
        page,
        await captureArtworkArea(scene, shelfArea),
        farAway,
      );
    }

    const yellow = pencilRoute.find(({ id }) => id === "drawer-yellow-first")!;
    const previousStroke = pencilRoute[pencilRoute.indexOf(yellow) - 1]!;
    const liftStart = drawingTime(previousStroke.end);
    const liftEnd = drawingTime(yellow.start);
    await drawToTime(page, workbench, liftStart + 4);
    await expect(pen).toHaveAttribute("data-phase", "lifting");
    const lifted = await captureWorkbenchArtwork(scene);
    const initialPose = await pen.getAttribute("transform");
    await drawToTime(page, workbench, (liftStart + liftEnd) / 2);
    await expect(pen).toHaveAttribute("data-phase", "lifting");
    expect(await pen.getAttribute("transform")).not.toBe(initialPose);
    await expectUnchangedArtwork(
      page,
      await captureWorkbenchArtwork(scene),
      lifted,
    );
  });

  test("shades the cabinet progressively beside the moving pencil", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    const scene = workbenchScene(workbench);
    const near = [1030, 575, 1050, 592] as const;
    const far = [1118, 610, 1134, 630] as const;
    const wash = pencilRoute.find(
      (stroke) => stroke.id === "drawers-lower-tone",
    )!;
    await drawToTime(page, workbench, drawingTime(wash.start) - 33);
    const bareSide = await captureArtworkArea(scene, near);
    const bareBase = await captureArtworkArea(scene, far);
    await drawToTime(
      page,
      workbench,
      drawingTime(wash.start + (wash.end - wash.start) / 4),
    );
    await expectPencilAtStroke(workbench);
    expect((await captureArtworkArea(scene, near)).equals(bareSide)).toBe(
      false,
    );
    await expectUnchangedArtwork(
      page,
      await captureArtworkArea(scene, far),
      bareBase,
    );
  });

  for (const { viewport, deviceScaleFactor } of [
    { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
    { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 },
  ]) {
    test.describe(() => {
      test.use({ viewport, deviceScaleFactor });
      test(
        `draws each object over finished supports in order at ${viewport.width}px`,
        drawObjectsInOrder,
      );
    });

    async function drawObjectsInOrder({ page }: { page: Page }) {
      await installDrawingClock(page);
      await goToHome(page);
      const workbench = page.getByRole("region", { name: "交互工作台" });
      const scene = workbenchScene(workbench);
      await scene.scrollIntoViewIfNeeded();
      await expect(scene).toHaveAttribute("data-drawing-object", "background");
      const wallLine = [729, 245, 741, 312] as const;
      const farFloor = [1020, 714, 1080, 746] as const;
      const unmarkedWall = await captureArtworkArea(scene, wallLine);
      const unmarkedFloor = await captureArtworkArea(scene, farFloor);
      const firstStroke = pencilRoute[0]!;
      await drawToTime(
        page,
        workbench,
        drawingTime(
          firstStroke.start + (firstStroke.end - firstStroke.start) * 0.65,
        ),
      );
      await expectPencilAtStroke(workbench);
      expect(
        (await captureArtworkArea(scene, wallLine)).equals(unmarkedWall),
      ).toBe(false);
      await expectUnchangedArtwork(
        page,
        await captureArtworkArea(scene, farFloor),
        unmarkedFloor,
      );
      await expect(scene.locator('[data-mark-object="table"]')).toHaveCount(0);
      await drawToTime(page, workbench, backgroundDrawing.end);
      await expect(scene).toHaveAttribute("data-drawing-object", "table");
      expect(
        (await captureArtworkArea(scene, farFloor)).equals(unmarkedFloor),
      ).toBe(false);

      const roomGuides = [
        [688, 250, 740, 340],
        [1256, 109, 1337, 396],
        [585, 724, 737, 756],
        [803, 83, 811, 94],
      ] as const;
      const roomAtFirstStroke = await Promise.all(
        roomGuides.map((area) => captureArtworkArea(scene, area)),
      );
      const tabletopSpots = [
        { name: "under the notebook", area: [782, 427, 839, 436] },
        { name: "clear wood between the devices", area: [927, 459, 952, 464] },
        { name: "under the monitor", area: [1008, 433, 1045, 443] },
        { name: "under the vise", area: [1143, 440, 1186, 452] },
        { name: "under the left toolbox", area: [749, 546, 791, 553] },
      ] as const;
      const supportDetails = [
        {
          object: "table",
          name: "diagonal brace",
          area: [693, 473, 733, 492],
          contrast: 18,
        },
        {
          object: "table",
          name: "rear foot plate",
          area: [752, 591, 780, 606],
          contrast: 25,
        },
        {
          object: "table",
          name: "floor shading",
          area: [713, 607, 805, 650],
          contrast: 12,
        },
        {
          object: "upper-shelf",
          name: "shadow beneath the shelf",
          area: [1050, 218, 1142, 240],
          contrast: 6,
        },
      ] as const;
      const objectAreas = {
        table: [660, 598, 697, 633],
        toolbox: [731, 508, 797, 549],
        drawers: [1030, 578, 1120, 629],
        pegboard: [812, 264, 1190, 415],
        "upper-shelf": [834, 205, 1057, 219],
        chair: [853, 534, 920, 563],
        laptop: [770, 360, 863, 410],
        display: [1000, 345, 1095, 398],
        vise: [1144, 412, 1178, 449],
        plant: [769, 108, 854, 192],
        "shelf-boxes": [833, 175, 939, 197],
        books: [1065, 137, 1114, 193],
        "small-drawers": [1131, 153, 1199, 193],
        lamp: [863, 221, 1003, 234],
        tools: [794, 267, 1190, 330],
      } as const;
      const paper = [];
      for (const { area } of tabletopSpots) {
        paper.push(
          await artworkLuma(page, await captureArtworkArea(scene, area)),
        );
      }
      const clearTabletop = tabletopSpots[1].area;
      const desktopBackgroundAreas = [
        { object: "chair", area: [916, 631, 922, 634] },
        { object: "laptop", area: [923, 365, 940, 395] },
        { object: "display", area: [1137, 351, 1152, 388] },
        { object: "lamp", area: [870, 245, 1006, 256] },
        { object: "tools", area: [779, 267, 787, 330] },
      ] as const;
      const stableBackgroundAreas = [
        { object: "chair", area: [823, 531, 830, 566] },
        { object: "chair", area: [905, 578, 930, 602] },
        { object: "chair", area: [1070, 700, 1190, 730] },
        ...(viewport.width === 1440 ? desktopBackgroundAreas : []),
      ] as const;
      let finishedTabletop: Buffer | undefined;
      const seen: string[] = [];

      for (const { id, start, end } of drawingObjects) {
        await drawToTime(page, workbench, start);
        const before = await captureArtworkArea(scene, objectAreas[id]);
        const backgroundAreas = stableBackgroundAreas.filter(
          ({ object }) => object === id,
        );
        const backgroundBefore: Buffer[] = [];
        for (const { area } of backgroundAreas) {
          backgroundBefore.push(await captureArtworkArea(scene, area));
        }
        const details = supportDetails.filter(({ object }) => object === id);
        const unpainted: number[] = [];
        for (const { area } of details) {
          unpainted.push(
            await artworkLuma(page, await captureArtworkArea(scene, area)),
          );
        }
        if (id === "tools") {
          const right = [1158, 291, 1188, 326] as const;
          const left = [798, 268, 818, 329] as const;
          const bareRight = await captureArtworkArea(scene, right);
          const bareLeft = await captureArtworkArea(scene, left);
          const firstTool = pencilRoute.find(
            (stroke) => stroke.id === "left-pliers-hatch",
          )!;
          await drawToTime(page, workbench, drawingTime(firstTool.end));
          expect((await captureArtworkArea(scene, left)).equals(bareLeft)).toBe(
            false,
          );
          await expectUnchangedArtwork(
            page,
            await captureArtworkArea(scene, right),
            bareRight,
          );
        }

        if (id === "display") {
          const pencilArea = [920, 436, 960, 447] as const;
          const pen = pencilRoute.find(
            (stroke) => stroke.id === "desk-pencil-point",
          )!;
          await drawToTime(page, workbench, drawingTime(pen.start) - 24);
          await expect(
            scene.locator('[data-mark-part="desk-pencil"]'),
          ).toHaveCount(0);
          const onTheWood = await captureArtworkArea(scene, pencilArea);
          await drawToTime(page, workbench, end - 18);
          const shadedPencil = await artworkLuma(
            page,
            await captureArtworkArea(scene, pencilArea),
          );
          expect(
            (await artworkLuma(page, onTheWood)) - shadedPencil,
            "pencil on the desk",
          ).toBeGreaterThan(4);
        } else {
          await drawToTime(page, workbench, end - 18);
        }
        await expect(scene).toHaveAttribute("data-drawing-object", id);
        seen.push(id);
        const painted = await scene
          .locator("[data-mark-object]")
          .evaluateAll((marks) =>
            Array.from(
              new Set(
                marks.map((mark) => mark.getAttribute("data-mark-object")),
              ),
            ),
          );
        expect(painted.sort()).toEqual([backgroundDrawing.id, ...seen].sort());
        expect(
          (await captureArtworkArea(scene, objectAreas[id])).equals(before),
          id,
        ).toBe(false);
        if (["table", "pegboard", "plant", "tools"].includes(id)) {
          for (const [index, area] of roomGuides.entries()) {
            await expectUnchangedArtwork(
              page,
              await captureArtworkArea(scene, area),
              roomAtFirstStroke[index]!,
            );
          }
        }
        for (const [index, background] of backgroundBefore.entries()) {
          // Chromium can round the fixed pegboard texture by two channel values
          // beside the display when the SVG mask is composited again.
          await expectUnchangedArtwork(
            page,
            await captureArtworkArea(scene, backgroundAreas[index]!.area),
            background,
            id === "display" ? 2 : 1,
          );
        }
        for (const [index, { area, name, contrast }] of details.entries()) {
          const darkened = await artworkLuma(
            page,
            await captureArtworkArea(scene, area),
          );
          expect(unpainted[index]! - darkened, name).toBeGreaterThan(contrast);
        }

        if (id === "table") {
          for (const [index, { name, area }] of tabletopSpots.entries()) {
            const surface = await artworkLuma(
              page,
              await captureArtworkArea(scene, area),
            );
            expect(paper[index]! - surface, name).toBeGreaterThan(3);
          }
          finishedTabletop = await captureArtworkArea(scene, clearTabletop);
        } else if (id === "laptop" || id === "vise") {
          // The SVG table gradient can round differently at subpixel scales.
          await expectUnchangedArtwork(
            page,
            await captureArtworkArea(scene, clearTabletop),
            finishedTabletop!,
            2,
          );
        }
      }

      await expect(workbench.getByRole("button")).toHaveCount(0);
      await drawToTime(page, workbench, artworkSettledAt);
      await expect(scene).toHaveAttribute("data-drawing-object", "lift");
      const settled = await captureWorkbenchArtwork(scene);
      await drawToTime(page, workbench, artworkSettledAt + 125);
      await expectUnchangedArtwork(
        page,
        await captureWorkbenchArtwork(scene),
        settled,
      );
      await drawToTime(page, workbench, drawingDuration);
      await waitForFinishedWorkbench(workbench);
      await expectUnchangedArtwork(
        page,
        await captureWorkbenchArtwork(scene),
        settled,
      );
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect(scene.locator("[data-workbench-surface]")).toHaveCount(0);
      await expectUnchangedArtwork(
        page,
        settled,
        await captureWorkbenchArtwork(scene),
      );
    }
  }

  for (const { edge, earlier, later, area } of [
    {
      edge: "monitor upper-left corner",
      earlier: "monitor",
      later: "t-handle",
      area: [988, 329, 994, 334],
    },
    {
      edge: "monitor stand",
      earlier: "monitor",
      later: "external-keyboard",
      area: [1018, 434, 1047, 438],
    },
    {
      edge: "right edge of the plant pot",
      earlier: "plant",
      later: "shelf-box-left",
      area: [819, 184, 825, 197],
    },
    {
      edge: "right edge of the leftmost book",
      earlier: "book-left",
      later: "book-inner-left",
      area: [1068, 155, 1073, 183],
    },
    {
      edge: "right edge of the middle book",
      earlier: "book-center",
      later: "book-inner-right",
      area: [1095, 141, 1098, 186],
    },
  ] as const) {
    test(`keeps the finished ${edge} through the next stroke`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await installDrawingClock(page);
      await goToHome(page);
      const workbench = page.getByRole("region", { name: "交互工作台" });
      const scene = workbenchScene(workbench);
      const endOf = (id: string) =>
        drawingParts.find((part) => part.id === id)!.marks.at(-1)!.toMs;

      await drawToTime(page, workbench, endOf(earlier));
      const finished = await captureArtworkArea(scene, area);
      await drawToTime(page, workbench, endOf(later));
      await expectUnchangedArtwork(
        page,
        await captureArtworkArea(scene, area),
        finished,
      );
    });
  }

  test("keeps the second book's upper edge hidden until its own strokes", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    const scene = workbenchScene(workbench);
    const firstBook = drawingParts.find(({ id }) => id === "book-left")!;
    const secondBook = drawingParts.find(({ id }) => id === "book-inner-left")!;
    const area = [1073, 134, 1076, 141] as const;

    await drawToTime(page, workbench, firstBook.marks[0]!.fromMs - 24);
    const barePaper = await captureArtworkArea(scene, area);
    await drawToTime(page, workbench, firstBook.marks.at(-1)!.toMs);
    await expectUnchangedArtwork(
      page,
      await captureArtworkArea(scene, area),
      barePaper,
    );
    await drawToTime(page, workbench, secondBook.marks.at(-1)!.toMs);
    const drawn = await captureArtworkArea(scene, area);
    expect(
      (await artworkLuma(page, barePaper)) - (await artworkLuma(page, drawn)),
    ).toBeGreaterThan(4);
  });

  test("keeps each finished tool and the surrounding pegboard stable", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installDrawingClock(page);
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    const scene = workbenchScene(workbench);
    const endOf = (tool: string) =>
      drawingParts.find(({ id }) => id === tool)!.marks.at(-1)!.toMs;
    const samples = [
      {
        before: "first-spanner",
        after: "second-spanner",
        areas: [[904, 285, 910, 322]],
      },
      {
        before: "second-spanner",
        after: "third-spanner",
        areas: [[937, 272, 939, 279]],
      },
      {
        before: "hammer",
        after: "right-tall-driver",
        areas: [[1162, 273, 1170, 284]],
      },
      {
        before: "right-tall-driver",
        after: "right-short-driver",
        areas: [
          [1160, 290, 1171, 345],
          [1176, 301, 1183, 306],
        ],
      },
    ] as const;

    for (const { before, after, areas } of samples) {
      await drawToTime(page, workbench, endOf(before));
      const finished: Buffer[] = [];
      for (const area of areas) {
        finished.push(await captureArtworkArea(scene, area));
      }
      await drawToTime(page, workbench, endOf(after));
      for (const [index, area] of areas.entries()) {
        await expectUnchangedArtwork(
          page,
          await captureArtworkArea(scene, area),
          finished[index]!,
        );
      }
    }
  });

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
    const points = await scene
      .locator("[data-workbench-drawing]")
      .evaluate((element) => {
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
    await expectUnchangedArtwork(page, await scene.screenshot(), resting);
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
    await expectUnchangedArtwork(page, await scene.screenshot(), resting);

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
    // Source-resolution crops temporarily reposition the hit targets. Keep the
    // pointer off the sheet so taking a sample cannot trigger a second sweep.
    await page.mouse.move(-1, -1);
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

    async function tap(target: typeof keyboard, offsetY = 0) {
      const point = await center(target);
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ ...point, y: point.y + offsetY }],
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

    await tap(keyboard, 7);
    await expect(screen).toHaveAttribute("data-phase", "typing");
    await page.clock.fastForward(5000);
    await expect(screen).toHaveCount(0);

    await tap(lamp, 7);
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

  test("links the hero to projects and keeps the featured section and contact reachable", async ({
    page,
  }) => {
    const copy = SITE_COPY;

    await goToHome(page);

    await expect(
      page.getByRole("heading", { name: /Hashflow AI 全栈工程师/ }),
    ).toBeVisible();

    const allProjects = page.getByRole("link", {
      name: "浏览项目",
      exact: true,
    });
    await expect(allProjects).toHaveAttribute("href", /\/projects\/$/);
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
        .getByRole("region", { name: "求职与合作" })
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
      name: `${STABLE_PROJECT.title} 查看项目详情`,
    });
    await expect(featuredProjectLink).toHaveAttribute(
      "href",
      new RegExp(`/projects/${STABLE_PROJECT.slug}/$`),
    );
  });
});
