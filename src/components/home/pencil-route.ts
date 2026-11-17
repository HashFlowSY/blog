import { strokeGeometry } from "./pencil-path";
import {
  constructionFraction,
  drawingProgress,
  pencilEase,
  strokeFraction,
} from "./pencil-plan";
import { drawingMarks } from "./workbench-geometry";

import type { PencilPoint, PencilStroke } from "./pencil-plan";

// The renderer and cursor read these same stroke windows. Only one stroke is
// active at a time; the gaps are real pen lifts rather than trailing motion.
const strokes = drawingMarks
  .flatMap<
    PencilStroke & {
      length: number;
      minY: number;
    }
  >((mark) => {
    if (mark.kind === "tone" || mark.pen === false) return [];
    const window = {
      id: mark.id,
      start: drawingProgress(mark.fromMs),
      end: drawingProgress(mark.toMs),
    };
    return [
      mark.kind === "point"
        ? {
            ...window,
            path: "",
            point: mark.point,
            length: 2,
            minY: mark.point[1],
          }
        : { ...window, path: mark.path, ...strokeGeometry(mark.path) },
    ];
  })
  .sort((a, b) => a.start - b.start);

const lastStroke = strokes.at(-1)!;
const liftWear = 0.06;
const strokeCost = strokes.reduce(
  (total, stroke) => total + Math.sqrt(stroke.length),
  0,
);

let usedMaterial = 0;
export const pencilRoute = strokes.map((stroke) => {
  const wearBefore = usedMaterial;
  const wear = ((1 - liftWear) * Math.sqrt(stroke.length)) / strokeCost;
  usedMaterial += wear;
  return { ...stroke, wear, wearBefore };
});

const fullPencilLength = 224;

function finalLift(progress: number) {
  return pencilEase((progress - lastStroke.end) / (100 - lastStroke.end));
}

// Contact consumes material. Only the finishing lift takes the remaining tip.
export function pencilLength(progress: number): number {
  const next = pencilRoute.find((stroke) => progress < stroke.end);
  const used = next
    ? next.wearBefore + next.wear * strokeFraction(progress, next)
    : 1 - liftWear * (1 - finalLift(progress));
  return fullPencilLength * (1 - constructionFraction(used));
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
  if (!next) {
    const [x, y] = lastStroke.point ?? sample(lastStroke, 1);
    const lift = finalLift(progress);
    return {
      x: x + 6 * lift,
      y: y - 18 * lift,
      angle: barrelAngle(lastStroke.minY) + lift * 3,
      lift,
      opacity: 1 - lift,
      stroke: lastStroke.id,
      phase: "lifting",
      fraction: 1,
    };
  }
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
