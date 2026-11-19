import { describe, expect, it } from "vitest";

import { pencilPosition, pencilRoute, pencilWear } from "./pencil-route";
import { drawingMarks } from "./workbench-geometry";

import type { DrawingStage, PencilPoint, PencilStroke } from "./pencil-plan";

const sample = (_stroke: PencilStroke, fraction: number): PencilPoint => [
  500 + fraction * 100,
  400 + fraction * 200,
];

function firstStrokeIn(object: DrawingStage) {
  const mark = drawingMarks.find(
    (mark) => mark.object === object && mark.kind === "stroke",
  )!;
  return pencilRoute.find((stroke) => stroke.id === mark.id)!;
}

describe("pencil route", () => {
  it("assigns each visible mark to a pencil contact", () => {
    expect(pencilRoute.map(({ id }) => id)).toEqual(
      drawingMarks.map(({ id }) => id),
    );
  });

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
    "background",
    "table",
    "pegboard",
    "chair",
    "laptop",
    "tools",
  ] as const)("places the tip on the active %s path", (object) => {
    const stroke = firstStrokeIn(object);
    const pose = pencilPosition(
      stroke.start + (stroke.end - stroke.start) * 0.6,
      sample,
    )!;
    expect(pose.phase).toBe("drawing");
    expect(pose.stroke).toBe(stroke.id);
    expect(pose.fraction).toBeCloseTo(0.648);
    expect(pose.x).toBeCloseTo(564.8);
    expect(pose.y).toBeCloseTo(529.6);
    expect(pose.lift).toBe(0);
  });

  it("lands on each positioning point", () => {
    const points = pencilRoute.filter(({ point }) => point !== undefined);
    expect(points.length).toBeGreaterThan(0);
    for (const stroke of points) {
      const pose = pencilPosition((stroke.start + stroke.end) / 2, sample)!;
      expect([pose.x, pose.y]).toEqual(stroke.point);
    }
  });

  it("travels above the paper and joins both stroke endpoints continuously", () => {
    const next = firstStrokeIn("chair");
    const previous = pencilRoute[pencilRoute.indexOf(next) - 1]!;
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

  it("lifts and removes the cursor after the last stroke", () => {
    const last = pencilRoute.at(-1)!;
    expect(last.end).toBeLessThan(100);
    const finalStroke = pencilPosition((last.start + last.end) / 2, sample)!;
    expect(finalStroke.phase).toBe("drawing");
    expect(finalStroke.lift).toBe(0);
    expect(finalStroke.opacity).toBe(1);
    const lifting = pencilPosition((last.end + 100) / 2, sample)!;
    expect(lifting.phase).toBe("lifting");
    expect(lifting.stroke).toBe(last.id);
    expect(lifting.y).toBeLessThan(sample(last, 1)[1]);
    expect(lifting.opacity).toBeLessThan(1);
    expect(pencilPosition(0, sample)).toBeUndefined();
    expect(pencilPosition(100, sample)).toBeUndefined();
  });

  it("changes to the yellow pencil during the lift before the first color stroke", () => {
    const firstColor = pencilRoute.find(
      (stroke) => stroke.medium === "yellow",
    )!;
    const previous = pencilRoute[pencilRoute.indexOf(firstColor) - 1]!;
    const gap = firstColor.start - previous.end;
    const before = pencilPosition(previous.end + gap * 0.25, sample)!;
    const after = pencilPosition(previous.end + gap * 0.75, sample)!;
    expect(before).toMatchObject({ phase: "lifting", medium: "graphite" });
    expect(after).toMatchObject({ phase: "lifting", medium: "yellow" });
    expect(pencilPosition(firstColor.start, sample)).toMatchObject({
      phase: "drawing",
      medium: "yellow",
    });
  });

  it("never jumps across an authored move command inside one stroke", () => {
    for (const stroke of pencilRoute.filter((stroke) => stroke.path)) {
      expect(stroke.path.match(/M/g)).toHaveLength(1);
      expect(stroke.length).toBeGreaterThan(0);
    }
  });

  it("lifts before travelling and lands after slowing down", () => {
    const next = firstStrokeIn("chair");
    const previous = pencilRoute[pencilRoute.indexOf(next) - 1]!;
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

  it("finishes each shelf box, book, and pegboard tool from left to right", () => {
    for (const [object, parts] of [
      ["shelf-boxes", ["shelf-box-left", "shelf-box-right"]],
      [
        "books",
        [
          "book-left",
          "book-inner-left",
          "book-center",
          "book-inner-right",
          "book-right",
        ],
      ],
      [
        "tools",
        [
          "left-pliers",
          "right-pliers",
          "thin-driver",
          "long-driver",
          "first-spanner",
          "second-spanner",
          "third-spanner",
          "fourth-spanner",
          "fifth-spanner",
          "t-handle",
          "middle-driver",
          "tool-cup",
          "hammer",
          "right-tall-driver",
          "right-short-driver",
        ],
      ],
    ] as const) {
      const marks = drawingMarks.filter((mark) => mark.object === object);
      const partOrder = marks.flatMap(({ part }, index) =>
        marks[index - 1]?.part === part ? [] : [part],
      );
      expect(partOrder).toEqual(parts);
    }
  });
});

describe("pencil material", () => {
  it("uses pencil material during each stroke", () => {
    for (const { start, end } of pencilRoute) {
      expect(pencilWear(end)).toBeGreaterThan(pencilWear(start));
    }
  });

  it("reaches its final length by the last stroke and keeps it during the lift", () => {
    expect(pencilWear(0)).toBe(0);
    const last = pencilRoute.at(-1)!;
    const finalWear = pencilWear(100);
    expect(finalWear).toBe(1);
    expect(pencilWear(last.end)).toBe(finalWear);
    let previous = 0;
    for (let progress = 0; progress <= 100; progress += 0.1) {
      const wear = pencilWear(progress);
      expect(wear).toBeGreaterThanOrEqual(previous);
      expect(wear).toBeLessThanOrEqual(finalWear);
      previous = wear;
    }
  });

  it("does not consume material during any pen lift", () => {
    for (let index = 1; index < pencilRoute.length; index++) {
      const previous = pencilRoute[index - 1]!;
      const next = pencilRoute[index]!;
      const gap = next.start - previous.end;
      expect(pencilWear(previous.end + gap * 0.2)).toBeCloseTo(
        pencilWear(previous.end + gap * 0.8),
        10,
      );
    }
  });
});
