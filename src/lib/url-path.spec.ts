import { describe, expect, it } from "vitest";

import {
  decodeCanonicalRootRelativePathname,
  normalizeRootRelativePathname,
  parseUrlReference,
  URL_PATH_NORMALIZATION_BASE,
} from "./url-path";

describe("normalizeRootRelativePathname", () => {
  it("uses the shared WHATWG normalization base", () => {
    const url = parseUrlReference("/assets/cover.png");

    expect(url.origin).toBe(URL_PATH_NORMALIZATION_BASE);
    expect(normalizeRootRelativePathname("/assets/cover.png")).toBe(
      "/assets/cover.png",
    );
  });

  it.each([
    "assets/cover.png",
    "//example.com/cover.png",
    "/assets/cover.png?download=1",
    "/assets/cover.png#preview",
  ])("rejects a non-pathname reference: %s", (value) => {
    expect(normalizeRootRelativePathname(value)).toBeNull();
  });
});

describe("decodeCanonicalRootRelativePathname", () => {
  it("decodes a canonical pathname before filesystem mapping", () => {
    expect(decodeCanonicalRootRelativePathname("/assets/a%20cover.png")).toBe(
      "/assets/a cover.png",
    );
  });

  it.each([
    "/assets/../cover.png",
    "/assets/%2e%2e/cover.png",
    "/assets/%2E%2E/cover.png",
    "/assets/.%2E/cover.png",
    "/assets/cover%2Fcopy.png",
    "/assets/cover%5Ccopy.png",
    "/assets/invalid%cover.png",
  ])("rejects non-canonical or unsafe pathnames: %s", (value) => {
    expect(decodeCanonicalRootRelativePathname(value)).toBeNull();
  });

  it("rejects an encoded dot segment that remains after one URL decode", () => {
    expect(
      decodeCanonicalRootRelativePathname("/assets/%252e%252e/cover.png"),
    ).toBeNull();
  });
});
