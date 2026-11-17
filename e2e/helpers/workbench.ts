import { expect } from "@playwright/test";

import { drawingTime } from "../../src/components/home/pencil-plan";

import type { Locator, Page } from "@playwright/test";

export async function installDrawingClock(page: Page) {
  const start = new Date("2026-11-08T00:00:00Z");
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.valueOf() + 1000));
}

export function workbenchScene(workbench: Locator) {
  return workbench.locator("[data-drawing-state]");
}

export async function drawToTime(page: Page, workbench: Locator, time: number) {
  const scene = workbenchScene(workbench);
  await expect(scene).toHaveAttribute("data-drawing-state", "drawing");
  const current = Number(await scene.getAttribute("data-progress"));
  await page.clock.fastForward(Math.max(0, time - drawingTime(current)) + 16);
  await expect
    .poll(async () =>
      drawingTime(Number(await scene.getAttribute("data-progress"))),
    )
    .toBeGreaterThanOrEqual(time);
}

export async function waitForFinishedWorkbench(workbench: Locator) {
  const scene = workbench.locator('[data-drawing-state="complete"]');
  const artwork = scene.locator('[data-workbench-art="rest"]');
  await expect(artwork).toBeVisible({ timeout: 15000 });
  return scene;
}

type ArtworkArea = readonly [
  left: number,
  top: number,
  right: number,
  bottom: number,
];

const hidePencil =
  '[data-construction-layer="pencil"] { visibility: hidden !important; }';

export function captureWorkbenchArtwork(scene: Locator) {
  return scene.screenshot({
    animations: "disabled",
    scale: "css",
    style: hidePencil,
  });
}

export async function captureArtworkArea(scene: Locator, area: ArtworkArea) {
  const clip = await scene
    .locator("[data-workbench-drawing]")
    .evaluate((element, area) => {
      const matrix = (element as SVGSVGElement).getScreenCTM();
      if (!matrix) throw new Error("The drawing has no coordinate transform");
      const [left, top, right, bottom] = area;
      const start = new DOMPoint(left, top).matrixTransform(matrix);
      const end = new DOMPoint(right, bottom).matrixTransform(matrix);
      const x = Math.ceil(start.x);
      const y = Math.ceil(start.y);
      return {
        x,
        y,
        width: Math.floor(end.x) - x,
        height: Math.floor(end.y) - y,
      };
    }, area);
  return scene.page().screenshot({ clip, scale: "css", style: hidePencil });
}

export async function artworkLuma(page: Page, screenshot: Buffer) {
  return page.evaluate(async (png) => {
    const image = new Image();
    image.src = `data:image/png;base64,${png}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let total = 0;
    for (let i = 0; i < data.length; i += 4) {
      total +=
        0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!;
    }
    return total / (canvas.width * canvas.height);
  }, screenshot.toString("base64"));
}

export async function paintedPencilLength(page: Page, workbench: Locator) {
  await page.evaluate(async () => {
    window.scrollTo({ top: 0, behavior: "instant" });
    const pencil = new Image();
    pencil.src = document
      .querySelector("[data-pencil-body] image")!
      .getAttribute("href")!;
    await pencil.decode();
  });
  await page.clock.runFor(16);
  const frame = await workbench.evaluate((element) => {
    const barrel = element.querySelector<SVGGElement>(
      '[data-construction-layer="pencil"] > g',
    )!;
    const matrix = barrel.getScreenCTM()!;
    const scale = Math.hypot(matrix.a, matrix.b);
    return {
      x: matrix.e,
      y: matrix.f,
      cos: matrix.a / scale,
      sin: matrix.b / scale,
      scale,
    };
  });
  const png = (await page.screenshot({ scale: "css" })).toString("base64");
  // Compare the same frame without the pencil so the drawer's yellow pixels
  // cannot be mistaken for a long barrel. Do not limit the search by its model length.
  const background = (
    await page.screenshot({ scale: "css", style: hidePencil })
  ).toString("base64");
  return page.evaluate(
    async ({ png, background, frame }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${png}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      ).data;
      const backdrop = new Image();
      backdrop.src = `data:image/png;base64,${background}`;
      await backdrop.decode();
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(backdrop, 0, 0);
      const behind = context.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      ).data;
      const density = canvas.width / innerWidth;
      let min = Infinity,
        max = -Infinity,
        count = 0;
      for (let y = 0; y < canvas.height; y++)
        for (let x = 0; x < canvas.width; x++) {
          const dx = x / density - frame.x,
            dy = y / density - frame.y;
          const along = (dx * frame.cos + dy * frame.sin) / frame.scale;
          const across = (-dx * frame.sin + dy * frame.cos) / frame.scale;
          if (along < 0 || along > 240 || Math.abs(across) > 12) continue;
          const index = (y * canvas.width + x) * 4;
          const red = pixels[index]!,
            green = pixels[index + 1]!,
            blue = pixels[index + 2]!;
          const difference = Math.max(
            Math.abs(red - behind[index]!),
            Math.abs(green - behind[index + 1]!),
            Math.abs(blue - behind[index + 2]!),
          );
          if (
            difference > 8 &&
            red > green * 1.22 &&
            green > blue * 1.25 &&
            red > 90
          ) {
            min = Math.min(min, along);
            max = Math.max(max, along);
            count++;
          }
        }
      return { extent: count ? max - min : 0, pixels: count };
    },
    { png, background, frame },
  );
}

export async function movePencilToDrawing(page: Page, workbench: Locator) {
  const pen = workbench.locator('[data-construction-layer="pencil"]');
  for (let step = 0; step < 20; step++) {
    if (
      (await pen.getAttribute("data-phase")) === "drawing" &&
      Number(await pen.getAttribute("data-fraction")) > 0
    )
      return;
    await page.clock.runFor(16);
  }
  await expect(pen).toHaveAttribute("data-phase", "drawing");
  expect(Number(await pen.getAttribute("data-fraction"))).toBeGreaterThan(0);
}

export async function expectPencilAtStroke(workbench: Locator) {
  const pen = workbench.locator('[data-construction-layer="pencil"]');
  await expect(pen).toBeVisible();
  await expect(pen).toHaveAttribute("data-phase", "drawing");
  const alignment = await workbench.evaluate((element) => {
    const pen = element.querySelector<SVGGElement>(
      '[data-construction-layer="pencil"]',
    )!;
    const id = pen.dataset["stroke"];
    const matrix = pen.transform.baseVal.consolidate()!.matrix;
    const point = element.querySelector<SVGCircleElement>(
      `[data-pencil-point="${id}"]`,
    );
    if (point) {
      return {
        distance: Math.hypot(
          matrix.e - point.cx.baseVal.value,
          matrix.f - point.cy.baseVal.value,
        ),
        fractionDifference: 0,
      };
    }
    const path = element.querySelector<SVGPathElement>(
      `[data-pencil-path="${id}"]`,
    )!;
    const offset = path.getAttribute("stroke-dashoffset");
    if (offset === null)
      throw new Error(`Stroke ${id} has no drawing progress`);
    const fraction = 1 - Number(offset);
    const head = path.getPointAtLength(path.getTotalLength() * fraction);
    return {
      distance: Math.hypot(matrix.e - head.x, matrix.f - head.y),
      fractionDifference: Math.abs(Number(pen.dataset["fraction"]) - fraction),
    };
  });
  expect(alignment.distance).toBeLessThan(0.05);
  expect(alignment.fractionDifference).toBeLessThan(0.00001);
}

export async function expectFirstWorkbenchPoint(
  page: Page,
  workbench: Locator,
) {
  const marks = workbench.locator("[data-pencil-point]");
  const first = workbench.locator('[data-pencil-point="point-rightFoot"]');
  await expect(workbenchScene(workbench)).toHaveAttribute(
    "data-drawing-stage",
    "point",
  );
  await expect(marks).toHaveCount(0);
  await movePencilToDrawing(page, workbench);
  await expect(first).toBeVisible();
  await expect(marks).toHaveCount(1);
  await expectPencilAtStroke(workbench);
}
