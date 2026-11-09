import { describe, expect, it } from "vitest";

import {
  fullPencilLength,
  pencilLength,
  pencilPosition,
  pencilRoute,
  wornPencilLength,
} from "./pencil-route";

import type { PencilPoint, PencilStroke } from "./pencil-plan";

const sample = (_stroke: PencilStroke, fraction: number): PencilPoint => [
  500 + fraction * 100,
  400 + fraction * 200,
];

describe("pencil route", () => {
  it("reserves a lift between strokes and never asks one pencil to draw twice at once", () => {
    for (let index = 1; index < pencilRoute.length; index++) {
      expect(pencilRoute[index]!.start).toBeGreaterThan(
        pencilRoute[index - 1]!.end,
      );
    }
    expect(new Set(pencilRoute.map((stroke) => stroke.id)).size).toBe(
      pencilRoute.length,
    );
  });

  it.each([
    "topLeft-topRight",
    "plane-rack",
    "left-leg-contour",
    "laptop-hatch",
    "plant-hatch",
  ])("places the tip on the actual leading stroke of %s", (id) => {
    const stroke = pencilRoute.find((stroke) => stroke.id === id)!;
    const pose = pencilPosition(
      stroke.start + (stroke.end - stroke.start) * 0.6,
      sample,
    )!;
    expect(pose.phase).toBe("drawing");
    expect(pose.stroke).toBe(id);
    expect(pose.fraction).toBeCloseTo(0.648);
    expect(pose.x).toBeCloseTo(564.8);
    expect(pose.y).toBeCloseTo(529.6);
    expect(pose.lift).toBe(0);
  });

  it("lands on each positioning point", () => {
    const stroke = pencilRoute[0]!;
    const pose = pencilPosition((stroke.start + stroke.end) / 2, sample)!;
    expect([pose.x, pose.y]).toEqual(stroke.point);
  });

  it("travels above the paper and joins both stroke endpoints continuously", () => {
    const index = pencilRoute.findIndex(
      (stroke) => stroke.id === "laptop-hatch",
    );
    const previous = pencilRoute[index - 1]!;
    const next = pencilRoute[index]!;
    const lifted = pencilPosition((previous.end + next.start) / 2, sample)!;
    expect(lifted.phase).toBe("lifting");
    expect(lifted.lift).toBeCloseTo(1);
    expect(lifted.x).toBeCloseTo(550);
    expect(lifted.y).toBeLessThan(500);
    for (const boundary of [previous.end, next.start]) {
      const before = pencilPosition(boundary - 1e-7, sample)!;
      const after = pencilPosition(boundary + 1e-7, sample)!;
      expect(Math.hypot(before.x - after.x, before.y - after.y)).toBeLessThan(
        0.01,
      );
    }
  });

  it("removes the cursor exactly when the last stroke finishes", () => {
    const last = pencilRoute.at(-1)!;
    expect(last.end).toBe(100);
    const finalStroke = pencilPosition((last.start + last.end) / 2, sample)!;
    expect(finalStroke.phase).toBe("drawing");
    expect(finalStroke.lift).toBe(0);
    expect(finalStroke.opacity).toBe(1);
    expect(pencilPosition(0, sample)).toBeUndefined();
    expect(pencilPosition(100, sample)).toBeUndefined();
  });

  it("never jumps across an authored move command inside one stroke", () => {
    for (const stroke of pencilRoute.filter((stroke) => stroke.path)) {
      expect(stroke.path.match(/M/g)).toHaveLength(1);
      expect(stroke.length).toBeGreaterThan(0);
    }
  });

  it("lifts before travelling and lands after slowing down", () => {
    const index = pencilRoute.findIndex(
      (stroke) => stroke.id === "laptop-hatch",
    );
    const previous = pencilRoute[index - 1]!;
    const next = pencilRoute[index]!;
    const duration = next.start - previous.end;
    const takeoff = pencilPosition(previous.end + duration * 0.1, sample)!;
    const landing = pencilPosition(previous.end + duration * 0.9, sample)!;
    expect(takeoff.x).toBeCloseTo(600);
    expect(takeoff.y).toBeLessThan(600);
    expect(landing.x).toBeCloseTo(500);
    expect(landing.y).toBeLessThan(400);
    for (const boundary of [previous.end, next.start]) {
      const before = pencilPosition(boundary - 1e-6, sample)!;
      const after = pencilPosition(boundary + 1e-6, sample)!;
      expect(Math.abs(before.angle - after.angle)).toBeLessThan(0.001);
    }
  });
});

describe("pencil material", () => {
  it("visibly wears during outlines and planes before the final details", () => {
    expect(pencilLength(58)).toBeLessThan(fullPencilLength * 0.7);
    expect(pencilLength(82)).toBeLessThan(fullPencilLength * 0.4);
  });

  it("uses material monotonically and exhausts it exactly when the last stroke ends", () => {
    expect(pencilLength(0)).toBe(fullPencilLength);
    expect(pencilLength(100)).toBe(wornPencilLength);
    expect(wornPencilLength).toBe(0);
    const last = pencilRoute.at(-1)!;
    expect(pencilLength(last.start)).toBeGreaterThan(10);
    expect(pencilLength(99.9)).toBeGreaterThan(0);
    expect(pencilLength(99.9)).toBeLessThan(pencilLength(last.start));
    let previous = fullPencilLength;
    for (let progress = 0; progress <= 100; progress += 0.1) {
      const length = pencilLength(progress);
      expect(length).toBeLessThanOrEqual(previous);
      expect(length).toBeGreaterThanOrEqual(wornPencilLength);
      previous = length;
    }
  });

  it("does not consume material during any pen lift", () => {
    for (let index = 1; index < pencilRoute.length; index++) {
      const previous = pencilRoute[index - 1]!;
      const next = pencilRoute[index]!;
      const gap = next.start - previous.end;
      expect(pencilLength(previous.end + gap * 0.2)).toBeCloseTo(
        pencilLength(previous.end + gap * 0.8),
        10,
      );
    }
  });
});
