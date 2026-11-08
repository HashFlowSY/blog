import { describe, expect, it } from "vitest";

import {
  schedulePencilStrokes,
  splitPencilPath,
  strokeGeometry,
} from "./pencil-path";

describe("pencil path geometry", () => {
  it("keeps disconnected contour lengths separate from air travel", () => {
    const parts = splitPencilPath("M 0 0 L 3 0 M 1000 0 L 1002 0").map(
      strokeGeometry,
    );
    expect(parts.map((part) => part.length)).toEqual([3, 2]);
    expect(parts[1]?.from).toEqual([1000, 0]);
    expect(strokeGeometry("M 0 0 L 3 0 L 3 4 Z")).toMatchObject({
      length: 12,
      from: [0, 0],
      to: [0, 0],
    });
  });

  it.each(["M 0 0 Q 50 -60 100 0", "M 0 0 C 25 -60 75 -60 100 0"])(
    "measures the authored curve %s",
    (path) => {
      const geometry = strokeGeometry(path);
      expect(geometry.to).toEqual([100, 0]);
      expect(geometry.length).toBeGreaterThan(100);
      expect(geometry.length).toBeLessThan(200);
      expect(geometry.minY).toBeLessThan(-20);
    },
  );

  it("gives a distant component more travel time, separate from its drawing time", () => {
    const strokes = ["M 0 0 L 10 0", "M 12 0 L 22 0", "M 500 0 L 510 0"].map(
      (path, index) => ({ id: String(index), path, ...strokeGeometry(path) }),
    );
    const scheduled = schedulePencilStrokes(strokes, 82, 99.6, 11000);
    const close = scheduled[1]!.start - scheduled[0]!.end;
    const distant = scheduled[2]!.start - scheduled[1]!.end;
    expect(distant).toBeGreaterThan(close * 3);
    expect(scheduled[2]!.end - scheduled[2]!.start).toBeCloseTo(
      scheduled[1]!.end - scheduled[1]!.start,
    );
    expect(scheduled[0]!.start).toBe(82);
    expect(scheduled.at(-1)!.end).toBeCloseTo(99.6);
  });
});
