export type PencilPoint = readonly [number, number];

export interface PencilStroke {
  id: string;
  start: number;
  end: number;
  path: string;
  point?: PencilPoint;
  medium: "graphite" | "yellow";
}

export function constructionFraction(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function pencilEase(value: number): number {
  const fraction = constructionFraction(value);
  return fraction * fraction * (3 - 2 * fraction);
}

export function strokeFraction(
  progress: number,
  stroke: Pick<PencilStroke, "start" | "end">,
): number {
  return pencilEase((progress - stroke.start) / (stroke.end - stroke.start));
}

const objectDurations = [
  ["table", 3600],
  ["toolbox", 1050],
  ["drawers", 1600],
  ["pegboard", 1950],
  ["upper-shelf", 950],
  ["chair", 1350],
  ["laptop", 1450],
  ["display", 1550],
  ["vise", 950],
  ["plant", 960],
  ["shelf-boxes", 810],
  ["books", 710],
  ["small-drawers", 600],
  ["lamp", 850],
  ["tools", 2600],
] as const;

type DrawingObject = (typeof objectDurations)[number][0];

export const backgroundDrawing = {
  id: "background",
  start: 0,
  end: 3800,
} as const;

export type DrawingStage = DrawingObject | typeof backgroundDrawing.id;

let clock: number = backgroundDrawing.end;
export const drawingObjects = objectDurations.map(([id, duration]) => {
  const start = clock;
  clock += duration;
  return { id, start, end: clock };
});

export const artworkSettledAt = drawingObjects.at(-1)!.end;
export const drawingDuration = artworkSettledAt + 220;

export function drawingObjectAt(time: number): DrawingStage | "lift" {
  if (time < backgroundDrawing.end) return backgroundDrawing.id;
  return drawingObjects.find(({ end }) => time < end)?.id ?? "lift";
}

export function drawingTime(progress: number): number {
  return constructionFraction(progress / 100) * drawingDuration;
}

export function drawingProgress(time: number): number {
  return constructionFraction(time / drawingDuration) * 100;
}
