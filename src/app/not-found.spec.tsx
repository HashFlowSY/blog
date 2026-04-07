import { describe, it, expect } from "vitest";

import { metadata } from "./not-found";

describe("Root not-found metadata", () => {
  it("exports metadata with robots index false and follow true", () => {
    expect(metadata).toBeDefined();
    expect(metadata.robots).toEqual({
      index: false,
      follow: true,
    });
  });
});
