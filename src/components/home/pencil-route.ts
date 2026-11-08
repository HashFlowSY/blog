import { strokeGeometry } from "./pencil-path";
import {
  constructionFraction,
  pencilEase,
  pencilPasses,
  strokeFraction,
} from "./pencil-plan";
import { pencilEdges, pointStrokes, shadedPlanes } from "./workbench-geometry";

import type { PencilPoint, PencilStroke } from "./pencil-plan";

// The renderer and cursor read these same stroke windows. Only one stroke is
// active at a time; the gaps are real pen lifts rather than trailing motion.
const wearBudget = {
  points: 0.06,
  lines: 0.28,
  planes: 0.28,
  details: 0.32,
  tip: 0.06,
} as const;
type WearStage = keyof typeof wearBudget;
const strokes: readonly (PencilStroke & { stage: WearStage })[] = [
  ...pointStrokes.map((stroke) => ({ ...stroke, stage: "points" as const })),
  ...pencilEdges.map((edge) => ({
    id: edge.id,
    path: edge.strokes[0]!.d,
    start: edge.start,
    end: edge.end,
    stage: "lines" as const,
  })),
  ...shadedPlanes.map((plane) => ({
    id: `plane-${plane.id}`,
    path: plane.hatch,
    start: plane.start,
    end: plane.end,
    stage: "planes" as const,
  })),
  ...pencilPasses
    .flatMap((pass) => pass.strokes)
    .map((stroke, index, all) => ({
      ...stroke,
      // Keep a little graphite for the final stroke, then use it up on paper.
      stage: index === all.length - 1 ? ("tip" as const) : ("details" as const),
    })),
];

const measuredStrokes = strokes.map((stroke) => {
  const geometry = stroke.point
    ? { from: stroke.point, to: stroke.point, minY: stroke.point[1], length: 2 }
    : strokeGeometry(stroke.path);
  return { ...stroke, ...geometry };
});

const stageCosts = { points: 0, lines: 0, planes: 0, details: 0, tip: 0 };
for (const stroke of measuredStrokes)
  stageCosts[stroke.stage] += Math.sqrt(stroke.length);
let usedMaterial = 0;
export const pencilRoute = measuredStrokes.map((stroke) => {
  const wear =
    (wearBudget[stroke.stage] * Math.sqrt(stroke.length)) /
    stageCosts[stroke.stage];
  const wearBefore = usedMaterial;
  usedMaterial += wear;
  return { ...stroke, wear, wearBefore };
});

export const fullPencilLength = 224;
export const wornPencilLength = 0;

// Each visible stage consumes material. Normalize within stages so dense hatch
// masks cannot postpone almost all visible wear until the final illustration.
// Only contact consumes material; lifts and pauses retain the current length.
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
  return -42 + pencilEase((210 - minY) / 160) * 58;
}

export interface PencilPose {
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
