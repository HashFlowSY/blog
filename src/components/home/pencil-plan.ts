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

export function hatchPath(
  polygon: readonly PencilPoint[],
  angle: number,
  spacing: number,
): string {
  const radians = (angle * Math.PI) / 180;
  const ux = Math.cos(radians);
  const uy = Math.sin(radians);
  const vx = -uy;
  const vy = ux;
  const projected = polygon.map(
    ([cx = 0, cy = 0]) => [cx * ux + cy * uy, cx * vx + cy * vy] as const,
  );
  const vs = projected.map(([, v]) => v);
  const minV = Math.min(...vs);
  const maxV = Math.max(...vs);
  const path: string[] = [];
  for (let v = minV + spacing / 2, index = 0; v < maxV; v += spacing, index++) {
    const intersections: number[] = [];
    for (let edge = 0; edge < projected.length; edge++) {
      const from = projected[edge]!;
      const to = projected[(edge + 1) % projected.length]!;
      if (v >= Math.min(from[1], to[1]) && v < Math.max(from[1], to[1])) {
        intersections.push(
          from[0] + ((v - from[1]) / (to[1] - from[1])) * (to[0] - from[0]),
        );
      }
    }
    intersections.sort((a, b) => a - b);
    if (index % 2) intersections.reverse();
    for (const u of intersections) {
      path.push(
        `${path.length ? "L" : "M"} ${(u * ux + v * vx).toFixed(1)} ${(u * uy + v * vy).toFixed(1)}`,
      );
    }
  }
  return path.join(" ");
}

export const positioningEnd = 18;

const playbackStops = [
  [0, 0],
  [positioningEnd, 693],
  [100, 4800],
] as const;

export const drawingDuration = playbackStops.at(-1)![1];

export function drawingTime(progress: number): number {
  const value = Math.max(0, Math.min(100, progress));
  for (let index = 1; index < playbackStops.length; index++) {
    const previous = playbackStops[index - 1];
    const next = playbackStops[index];
    if (previous && next && value <= next[0]) {
      return (
        previous[1] +
        ((value - previous[0]) / (next[0] - previous[0])) *
          (next[1] - previous[1])
      );
    }
  }
  return drawingDuration;
}

export function drawingProgress(time: number): number {
  const value = Math.max(0, Math.min(drawingDuration, time));
  for (let index = 1; index < playbackStops.length; index++) {
    const previous = playbackStops[index - 1];
    const next = playbackStops[index];
    if (previous && next && value <= next[1]) {
      return (
        previous[0] +
        ((value - previous[1]) / (next[1] - previous[1])) *
          (next[0] - previous[0])
      );
    }
  }
  return 100;
}
