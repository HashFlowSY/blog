import { describe, expect, it } from "vitest";

import { illustrationProjection } from "./workbench-materials";

import type { IllustrationQuad } from "./workbench-materials";

describe("original illustration projection", () => {
  it.each<IllustrationQuad>([
    [
      [680, 410],
      [845, 407],
      [859, 505],
      [693, 515],
    ],
    [
      [1015, 390],
      [1181, 393],
      [1171, 492],
      [1008, 485],
    ],
    [
      [10, 20],
      [110, 20],
      [110, 80],
      [10, 80],
    ],
  ])(
    "rectifies all four corners without stretching the original drawing",
    (...corners) => {
      const projection = illustrationProjection(corners);
      const unit = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ] as const;
      unit.forEach(([u, v], index) => {
        const { a, b, c, d, e, f, g, h } = projection;
        const x = (a * u + b * v + c) / (g * u + h * v + 1);
        const y = (d * u + e * v + f) / (g * u + h * v + 1);
        expect(x * 1536).toBeCloseTo(corners[index]![0], 6);
        expect((1 - y) * 1024).toBeCloseTo(corners[index]![1], 6);
      });
    },
  );
});
