import { describe, expect, it } from "vitest";

import {
  artworkSettledAt,
  backgroundDrawing,
  drawingDuration,
  drawingObjectAt,
  drawingObjects,
  drawingProgress,
  drawingTime,
} from "./pencil-plan";

describe("pencil playback timing", () => {
  it.each([0, 9, 41, 84.7, 99.9, 100])(
    "maps %s percent to its time and back",
    (progress) => {
      expect(drawingProgress(drawingTime(progress))).toBeCloseTo(progress, 8);
    },
  );

  it("finishes within the automatic playback window", () => {
    expect(drawingTime(100)).toBe(drawingDuration);
    expect(drawingProgress(-100)).toBe(0);
    expect(drawingProgress(drawingTime(100) + 1000)).toBe(100);
    expect(
      drawingObjects.slice(9, 13).map(({ start, end }) => end - start),
    ).toEqual([960, 810, 710, 600]);
    const tools = drawingObjects.at(-1)!;
    expect(tools.start).toBe(backgroundDrawing.end + 18_380);
    expect(tools.end - tools.start).toBe(2_600);
    expect(drawingDuration - artworkSettledAt).toBe(220);
  });

  it("finishes the background before drawing the fifteen objects in order", () => {
    expect(drawingObjectAt(0)).toBe(backgroundDrawing.id);
    expect(drawingObjectAt(backgroundDrawing.end - 1)).toBe(
      backgroundDrawing.id,
    );
    expect(drawingObjects.map(({ id }) => id)).toEqual([
      "table",
      "toolbox",
      "drawers",
      "pegboard",
      "upper-shelf",
      "chair",
      "laptop",
      "display",
      "vise",
      "plant",
      "shelf-boxes",
      "books",
      "small-drawers",
      "lamp",
      "tools",
    ]);
    for (const [index, object] of drawingObjects.entries()) {
      expect(object.start).toBe(
        drawingObjects[index - 1]?.end ?? backgroundDrawing.end,
      );
      expect(drawingObjectAt(object.start)).toBe(object.id);
      expect(drawingObjectAt(object.end - 1)).toBe(object.id);
    }
    expect(drawingObjectAt(drawingObjects.at(-1)!.end)).toBe("lift");
  });
});
