import { describe, expect, it } from "vitest";

import { strokeGeometry } from "./pencil-path";

describe("pencil path geometry", () => {
  it("counts the final edge of a closed shape", () => {
    expect(strokeGeometry("M 0 0 L 3 0 L 3 4 Z")).toMatchObject({
      length: 12,
      minY: 0,
    });
  });

  it.each(["M 0 0 Q 50 -60 100 0", "M 0 0 C 25 -60 75 -60 100 0"])(
    "measures the authored curve %s",
    (path) => {
      const geometry = strokeGeometry(path);
      expect(geometry.length).toBeGreaterThan(100);
      expect(geometry.length).toBeLessThan(200);
      expect(geometry.minY).toBeLessThan(-20);
    },
  );
});
