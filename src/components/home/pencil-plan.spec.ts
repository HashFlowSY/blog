import { describe, expect, it } from "vitest";

import {
  drawingDuration,
  drawingProgress,
  drawingStageAt,
  drawingStages,
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
  });

  it("resolves the drawing stage at each boundary", () => {
    for (const [stage, window] of Object.entries(drawingStages)) {
      expect(drawingStageAt(window.start)).toBe(stage);
      expect(drawingStageAt(window.end - 1)).toBe(stage);
    }
    expect(drawingStageAt(drawingStages.finish.end)).toBe("finish");
  });
});
