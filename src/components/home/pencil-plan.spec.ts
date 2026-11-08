import { describe, expect, it } from "vitest";

import { drawingProgress, drawingTime, hatchPath } from "./pencil-plan";

describe("pencil playback timing", () => {
  it.each([0, 9, 18, 41, 58, 78, 82, 84.7, 95, 99.9, 100])(
    "resumes at the same drawing position at %s percent",
    (progress) => {
      expect(drawingProgress(drawingTime(progress))).toBeCloseTo(progress, 8);
    },
  );

  it("reserves more time for the final details than the initial construction", () => {
    expect(drawingTime(100) - drawingTime(82)).toBeGreaterThan(drawingTime(82));
    expect(drawingProgress(-100)).toBe(0);
    expect(drawingProgress(drawingTime(100) + 1000)).toBe(100);
  });
});

describe("pencil shading", () => {
  it.each([-76, -52, -32, 0, 35, 90])(
    "keeps the %s-degree stroke on the region",
    (angle) => {
      const points = hatchPath([20, 30, 100, 70], angle)
        .match(/-?\d+(?:\.\d+)?/g)!
        .map(Number);
      for (let index = 0; index < points.length; index += 2) {
        expect(points[index]).toBeGreaterThanOrEqual(19.9);
        expect(points[index]).toBeLessThanOrEqual(120.1);
        expect(points[index + 1]).toBeGreaterThanOrEqual(29.9);
        expect(points[index + 1]).toBeLessThanOrEqual(100.1);
      }
    },
  );

  it("clips the actual shading path to the plane rather than moving the pencil through its bounding box", () => {
    const points = hatchPath([0, 0, 100, 100], -34, 10, [
      [0, 0],
      [100, 0],
      [0, 100],
    ])
      .match(/-?\d+(?:\.\d+)?/g)!
      .map(Number);
    for (let index = 0; index < points.length; index += 2) {
      expect(points[index]! + points[index + 1]!).toBeLessThanOrEqual(100.1);
      expect(points[index]).toBeGreaterThanOrEqual(-0.1);
      expect(points[index + 1]).toBeGreaterThanOrEqual(-0.1);
    }
  });
});
