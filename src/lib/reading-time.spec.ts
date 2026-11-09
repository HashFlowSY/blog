import { describe, expect, it } from "vitest";

import { estimateReadingTime } from "./reading-time";

describe("estimateReadingTime", () => {
  it("estimates ~1 minute for ~200 words", () => {
    const text = "word ".repeat(200);
    expect(estimateReadingTime(text)).toBe(1);
  });

  it("estimates 0 for empty string", () => {
    expect(estimateReadingTime("")).toBe(0);
  });

  it("estimates ~2 minutes for ~400 words", () => {
    const text = "word ".repeat(400);
    expect(estimateReadingTime(text)).toBe(2);
  });

  it("rounds up partial minutes", () => {
    // 250 words → ceil(250/200) = 2 minutes
    const text = "word ".repeat(250);
    expect(estimateReadingTime(text)).toBe(2);
  });

  it("estimates CJK correctly for longer text", () => {
    // 500 CJK chars → 500/500 = 1 min
    const text = "你".repeat(500);
    expect(estimateReadingTime(text)).toBe(1);
  });

  it("estimates CJK correctly for 2 minutes", () => {
    // 1000 CJK chars → 1000/500 = 2 min
    const text = "你".repeat(1000);
    expect(estimateReadingTime(text)).toBe(2);
  });

  it("handles very short content as 1 minute minimum", () => {
    const text = "Hello world"; // 2 words
    expect(estimateReadingTime(text)).toBe(1);
  });

  it("returns 0 for whitespace-only input", () => {
    expect(estimateReadingTime("   ")).toBe(0);
  });

  it("counts Japanese hiragana and katakana as CJK", () => {
    // 600 Japanese chars → 600/500 = 1.2 → ceil → 2 min
    const text = "あ".repeat(600);
    expect(estimateReadingTime(text)).toBe(2);
  });

  it("counts Korean hangul as CJK", () => {
    // 600 Korean chars → 600/500 = 1.2 → ceil → 2 min
    const text = "한".repeat(600);
    expect(estimateReadingTime(text)).toBe(2);
  });
});
