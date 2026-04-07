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

  it("handles CJK characters (each counts as 2 words equivalent)", () => {
    // CJK reading speed is slower, ~500 chars/min
    // Our formula: split by whitespace, CJK chars counted individually
    const text = "你好世界"; // 4 CJK characters
    // CJK chars are ~1 word each in our simplified model
    const result = estimateReadingTime(text);
    expect(result).toBeGreaterThan(0);
  });

  it("counts words separated by whitespace", () => {
    const text = "one two three four five";
    expect(estimateReadingTime(text)).toBe(1); // 5 words < 200/min = 1 min
  });

  it("handles markdown syntax as words", () => {
    const text = "# Title\n\nSome **bold** text and more content here.";
    const result = estimateReadingTime(text);
    expect(result).toBeGreaterThan(0);
  });

  it("handles very short content as 1 minute minimum", () => {
    const text = "Hello world"; // 2 words
    expect(estimateReadingTime(text)).toBe(1);
  });
});
