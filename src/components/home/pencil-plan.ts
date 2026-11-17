export type PencilPoint = readonly [number, number];

export interface PencilStroke {
  id: string;
  start: number;
  end: number;
  path: string;
  point?: PencilPoint;
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

export const drawingStages = {
  point: { start: 0, end: 160 },
  line: { start: 160, end: 1250 },
  plane: { start: 1250, end: 1850 },
  rough: { start: 1850, end: 2650 },
  ink: { start: 2650, end: 3850 },
  shadow: { start: 3850, end: 5350 },
  finish: { start: 5350, end: 6600 },
} as const;

export type DrawingStage = keyof typeof drawingStages;

export const drawingDuration = drawingStages.finish.end;
export const artworkSettledAt = 6450;

const stages = Object.keys(drawingStages) as DrawingStage[];

export function drawingStageAt(time: number): DrawingStage {
  return stages.find((stage) => time < drawingStages[stage].end) ?? "finish";
}

export function drawingTime(progress: number): number {
  return constructionFraction(progress / 100) * drawingDuration;
}

export function drawingProgress(time: number): number {
  return constructionFraction(time / drawingDuration) * 100;
}
