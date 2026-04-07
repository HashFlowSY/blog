import { describe, expect, it } from "vitest";

import { stripHtml } from "./strip-html";

describe("stripHtml", () => {
  it("returns plain text unchanged", () => {
    expect(stripHtml("Hello world")).toBe("Hello world");
  });

  it("strips basic HTML tags", () => {
    expect(stripHtml("<p>Hello</p>")).toBe("Hello");
  });

  it("strips nested tags", () => {
    expect(stripHtml("<div><p>Hello <strong>world</strong></p></div>")).toBe(
      "Hello world",
    );
  });

  it("preserves HTML entities as text", () => {
    expect(stripHtml("a &amp; b &lt; c")).toBe("a & b < c");
  });

  it("collapses multiple whitespace into single space", () => {
    expect(stripHtml("<p>Hello</p>\n\n  <p>world</p>")).toBe("Hello world");
  });

  it("preserves CJK characters", () => {
    expect(stripHtml("<p>你好世界</p>")).toBe("你好世界");
  });

  it("truncates to maxLen characters", () => {
    const longText = "a".repeat(100);
    const wrapped = `<p>${longText}</p>`;
    const result = stripHtml(wrapped, 50);
    expect(result.length).toBeLessThanOrEqual(51); // 50 chars + ellipsis
    expect(result).toContain("…");
  });

  it("returns empty string for empty input", () => {
    expect(stripHtml("")).toBe("");
  });
});
