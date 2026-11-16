import {
  constructionFraction,
  pencilEase,
  strokeFraction,
} from "./pencil-plan";
import { drawingAreas, pointStrokes } from "./workbench-geometry";

import type { PencilPoint, PencilStroke } from "./pencil-plan";

// The renderer and cursor read these same stroke windows. Only one stroke is
// active at a time; the gaps are real pen lifts rather than trailing motion.
const areaStrokes = drawingAreas.flatMap((area) => area.strokes);
const pointWear = 0.06 / pointStrokes.length;
const lastStroke = areaStrokes.at(-1);
const strokeCost = areaStrokes
  .slice(0, -1)
  .reduce((total, stroke) => total + Math.sqrt(stroke.length), 0);
const strokes: readonly (PencilStroke & {
  minY: number;
  length: number;
  wear: number;
})[] = [
  ...pointStrokes.map((stroke) => ({ ...stroke, wear: pointWear })),
  ...areaStrokes.map((stroke) => ({
    ...stroke,
    // Reserve a visible graphite tip for the final stroke.
    wear:
      stroke === lastStroke
        ? 0.06
        : (0.88 * Math.sqrt(stroke.length)) / strokeCost,
  })),
];

let usedMaterial = 0;
export const pencilRoute = strokes.map((stroke) => {
  const wearBefore = usedMaterial;
  usedMaterial += stroke.wear;
  return { ...stroke, wearBefore };
});

export const fullPencilLength = 224;
export const wornPencilLength = 0;

// Contact consumes material. Lifts retain the current length.
export function pencilLength(progress: number): number {
  const next = pencilRoute.find((stroke) => progress < stroke.end);
  const used = next
    ? next.wearBefore + next.wear * strokeFraction(progress, next)
    : 1;
  return (
    fullPencilLength -
    (fullPencilLength - wornPencilLength) * constructionFraction(used)
  );
}

function barrelAngle(minY: number): number {
  return -42 + pencilEase((230 - minY) / 160) * 48;
}

interface PencilPose {
  x: number;
  y: number;
  angle: number;
  lift: number;
  opacity: number;
  stroke: string;
  phase: "drawing" | "lifting";
  fraction: number;
}

type PathSampler = (stroke: PencilStroke, fraction: number) => PencilPoint;

export function pencilPosition(
  progress: number,
  sample: PathSampler,
): PencilPose | undefined {
  if (progress <= 0 || progress >= 100) return;
  const nextIndex = pencilRoute.findIndex((stroke) => progress < stroke.end);
  const next = pencilRoute[nextIndex];
  if (!next) return;
  let point: PencilPoint;
  let lift = 0;
  let opacity = 1;
  let fraction = 0;
  const stroke = next;
  let angle = barrelAngle(stroke.minY);
  let phase: PencilPose["phase"] = "drawing";

  function at(stroke: PencilStroke, fraction: number): PencilPoint {
    return stroke.point ?? sample(stroke, fraction);
  }

  if (progress < next.start) {
    const previous = pencilRoute[nextIndex - 1];
    const end = at(next, 0);
    if (previous) {
      const start = at(previous, 1);
      const gap = constructionFraction(
        (progress - previous.end) / (next.start - previous.end),
      );
      const travel = pencilEase((gap - 0.14) / 0.72);
      lift = pencilEase(gap / 0.22) * pencilEase((1 - gap) / 0.22);
      const height = Math.min(
        46,
        10 + Math.hypot(end[0] - start[0], end[1] - start[1]) * 0.08,
      );
      point = [
        start[0] + (end[0] - start[0]) * travel,
        start[1] + (end[1] - start[1]) * travel - lift * height,
      ];
      angle =
        barrelAngle(previous.minY) +
        (barrelAngle(next.minY) - barrelAngle(previous.minY)) * travel;
    } else {
      lift = 1 - pencilEase(progress / next.start);
      point = [end[0], end[1] - lift * 20];
      opacity = 1 - lift;
    }
    phase = "lifting";
  } else {
    fraction = strokeFraction(progress, next);
    point = at(next, fraction);
  }

  return {
    x: point[0],
    y: point[1],
    angle: angle + lift * 3,
    lift,
    opacity,
    stroke: stroke.id,
    phase,
    fraction,
  };
}
