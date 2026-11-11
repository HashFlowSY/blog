import { expect } from "@playwright/test";

import { drawingTime } from "../../src/components/home/pencil-plan";

import type { Locator, Page } from "@playwright/test";

export async function installDrawingClock(page: Page) {
  const start = new Date("2026-11-08T00:00:00Z");
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.valueOf() + 1000));
}

export async function drawTo(page: Page, workbench: Locator, progress: number) {
  const scene = workbench.locator("[data-progress]");
  await expect(
    workbench.getByRole("button", { name: "暂停构建" }),
  ).toBeVisible();
  const current = Number(await scene.getAttribute("data-progress"));
  await page.clock.fastForward(
    Math.max(0, drawingTime(progress) - drawingTime(current)) + 16,
  );
  await expect
    .poll(async () => Number(await scene.getAttribute("data-progress")))
    .toBeGreaterThanOrEqual(progress);
  // Let the finished illustration paint before the renderer's deferred setup.
  if (progress === 100) await page.clock.runFor(48);
}

export async function waitForWorkbenchModel(workbench: Locator) {
  const view = workbench.getByRole("group", { name: "可旋转的立体工作台" });
  await expect(view).toHaveAttribute("data-model-status", "ready", {
    timeout: 15000,
  });
  const canvas = view.locator("canvas");
  await expect(canvas).toHaveAttribute("data-renderer", "webgl2");
  expect(Number(await canvas.getAttribute("data-triangles"))).toBeGreaterThan(
    20000,
  );
  return view;
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
  const hide = await page.addStyleTag({
    content:
      '[data-construction-layer="pencil"] { visibility: hidden !important; }',
  });
  let background: string;
  try {
    background = (await page.screenshot({ scale: "css" })).toString("base64");
  } finally {
    await hide.evaluate((element) => element.parentNode?.removeChild(element));
  }
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
  for (
    let step = 0;
    step < 8 && (await pen.getAttribute("data-phase")) !== "drawing";
    step++
  ) {
    await page.clock.runFor(40);
  }
  await expect(pen).toHaveAttribute("data-phase", "drawing");
}

export async function expectPencilAtStroke(workbench: Locator) {
  const pen = workbench.locator('[data-construction-layer="pencil"]');
  await expect(pen).toBeVisible();
  await expect(pen).toHaveAttribute("data-phase", "drawing");
  const alignment = await workbench.evaluate((element) => {
    const pen = element.querySelector<SVGGElement>(
      '[data-construction-layer="pencil"]',
    )!;
    const path = element.querySelector<SVGPathElement>(
      `[data-pencil-path="${pen.dataset["stroke"]}"]`,
    )!;
    const matrix = pen.transform.baseVal.consolidate()!.matrix;
    const offset =
      path.getAttribute("stroke-dashoffset") ??
      element
        .querySelector(`use[href="#${path.id}"]`)
        ?.getAttribute("stroke-dashoffset");
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
