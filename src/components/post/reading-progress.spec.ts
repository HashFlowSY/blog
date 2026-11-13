import { describe, expect, it } from "vitest";

import { readingProgress } from "./reading-progress";

describe("readingProgress", () => {
  it("starts when the body reaches the toolbar and finishes when the last line is visible", () => {
    const top = 56;
    const bottom = 656;

    expect(readingProgress({ top: 160, bottom: 1160 }, top, bottom)).toBe(0);
    expect(readingProgress({ top: 56, bottom: 1056 }, top, bottom)).toBe(0);
    expect(readingProgress({ top: -144, bottom: 856 }, top, bottom)).toBe(0.5);
    expect(readingProgress({ top: -344, bottom: 656 }, top, bottom)).toBe(1);
    expect(readingProgress({ top: -800, bottom: 200 }, top, bottom)).toBe(1);
  });

  it("finishes when a short body comes into view before reaching the toolbar", () => {
    expect(readingProgress({ top: 350, bottom: 700 }, 56, 656)).toBe(0);
    expect(readingProgress({ top: 300, bottom: 650 }, 56, 656)).toBe(1);
  });
});
