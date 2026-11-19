import { expect } from "@playwright/test";

import {
  backgroundDrawing,
  drawingDuration,
  drawingTime,
} from "../../src/components/home/pencil-plan";

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
  const current = async () =>
    drawingTime(Number(await scene.getAttribute("data-progress")));
  const remaining = time - (await current());
  if (remaining > 0) {
    await page.clock.fastForward(Math.ceil(remaining));
    if ((await current()) < time) await page.clock.runFor(16);
  }
  await expect.poll(current).toBeGreaterThanOrEqual(time);
}

export async function waitForFinishedWorkbench(workbench: Locator) {
  const scene = workbench.locator('[data-drawing-state="complete"]');
  const artwork = scene.locator('[data-workbench-art="rest"]');
  await expect(artwork).toBeVisible({ timeout: drawingDuration + 5000 });
  return scene;
}

type ArtworkArea = readonly [
  left: number,
  top: number,
  right: number,
  bottom: number,
];

const hidePencil =
  '[data-construction-layer="pencil"] { display: none !important; }';

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

export async function expectUnchangedArtwork(
  page: Page,
  actual: Buffer,
  previous: Buffer,
  channelTolerance = 1,
) {
  if (actual.equals(previous)) return;
  const difference = await page.evaluate(
    async ([first, second, tolerance]) => {
      async function pixels(png: string) {
        const image = new Image();
        image.src = `data:image/png;base64,${png}`;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, canvas.width, canvas.height);
      }
      const [a, b] = await Promise.all([pixels(first), pixels(second)]);
      if (a.width !== b.width || a.height !== b.height)
        return { changed: 1, visible: 1 };
      let changed = 0;
      let visible = 0;
      for (let index = 0; index < a.data.length; index += 4) {
        let pixel = 0;
        for (let channel = index; channel < index + 4; channel++)
          pixel = Math.max(
            pixel,
            Math.abs(a.data[channel]! - b.data[channel]!),
          );
        if (pixel > tolerance) changed++;
        if (pixel > 8) visible++;
      }
      const area = a.width * a.height;
      return { changed: changed / area, visible: visible / area };
    },
    [
      actual.toString("base64"),
      previous.toString("base64"),
      channelTolerance,
    ] as const,
  );
  // Repainting soft SVG mask edges can round a color channel differently.
  expect(difference.changed).toBeLessThan(0.001);
  expect(difference.visible).toBeLessThan(0.0005);
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
  // Compare the same frame without the pencil so artwork colors cannot be
  // mistaken for the barrel or tip.
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
          if (difference > 12) {
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
    const body = pen.querySelector<SVGSVGElement>("[data-pencil-body]")!;
    const tip = new DOMPoint(
      body.viewBox.baseVal.x,
      -body.y.baseVal.value,
    ).matrixTransform(body.getScreenCTM()!);
    const anchor = new DOMPoint(0, 0).matrixTransform(pen.getScreenCTM()!);
    const visibleTipDistance = Math.hypot(tip.x - anchor.x, tip.y - anchor.y);
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
        visibleTipDistance,
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
      visibleTipDistance,
    };
  });
  expect(alignment.distance).toBeLessThan(0.05);
  expect(alignment.fractionDifference).toBeLessThan(0.00001);
  expect(alignment.visibleTipDistance).toBeLessThan(0.05);
}

export async function expectFirstBackgroundStroke(
  page: Page,
  workbench: Locator,
) {
  await expect(workbenchScene(workbench)).toHaveAttribute(
    "data-drawing-object",
    backgroundDrawing.id,
  );
  await expect(workbench.locator("[data-drawing-mark]")).toHaveCount(0);
  await movePencilToDrawing(page, workbench);
  await expectPencilAtStroke(workbench);
}

export async function expectFirstWorkbenchPoint(
  page: Page,
  workbench: Locator,
) {
  const marks = workbench.locator("[data-pencil-point]");
  const first = workbench.locator('[data-pencil-point="point-rightFoot"]');
  await drawToTime(page, workbench, backgroundDrawing.end);
  await expect(workbenchScene(workbench)).toHaveAttribute(
    "data-drawing-object",
    "table",
  );
  await expect(marks).toHaveCount(0);
  await movePencilToDrawing(page, workbench);
  await expect(first).toBeAttached();
  await expect(marks).toHaveCount(1);
  await expectPencilAtStroke(workbench);
}
