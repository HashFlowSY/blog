import type { PencilPoint } from "./pencil-plan";

export interface StrokeGeometry {
  from: PencilPoint;
  to: PencilPoint;
  length: number;
  minY: number;
}

// The authored drawing uses absolute M/L/Q/C/Z commands. Keep disconnected
// subpaths separate so an SVG move never becomes a teleporting pencil tip.
export function splitPencilPath(path: string): string[] {
  return path.match(/M[^M]*/g)?.map((part) => part.trim()) ?? [];
}

export function strokeGeometry(path: string): StrokeGeometry {
  let current: PencilPoint = [0, 0];
  let from: PencilPoint = current;
  let length = 0;
  let minY = Infinity;

  function line(to: PencilPoint) {
    length += Math.hypot(to[0] - current[0], to[1] - current[1]);
    current = to;
    minY = Math.min(minY, to[1]);
  }

  for (const part of path.match(/[MLQCZ][^MLQCZ]*/g) ?? []) {
    const values =
      part
        .slice(1)
        .match(/-?\d*\.?\d+/g)
        ?.map(Number) ?? [];
    function point(index: number): PencilPoint {
      return [values[index]!, values[index + 1]!];
    }
    switch (part[0]) {
      case "M":
        current = point(0);
        from = current;
        minY = Math.min(minY, current[1]);
        break;
      case "L":
        line(point(0));
        break;
      case "Z":
        line(from);
        break;
      case "Q":
      case "C": {
        const start = current;
        const first = point(0);
        const second = point(2);
        const end = part[0] === "C" ? point(4) : second;
        for (let step = 1; step <= 20; step++) {
          const t = step / 20;
          const u = 1 - t;
          line(
            part[0] === "Q"
              ? [
                  u * u * start[0] + 2 * u * t * first[0] + t * t * end[0],
                  u * u * start[1] + 2 * u * t * first[1] + t * t * end[1],
                ]
              : [
                  u ** 3 * start[0] +
                    3 * u * u * t * first[0] +
                    3 * u * t * t * second[0] +
                    t ** 3 * end[0],
                  u ** 3 * start[1] +
                    3 * u * u * t * first[1] +
                    3 * u * t * t * second[1] +
                    t ** 3 * end[1],
                ],
          );
        }
        break;
      }
    }
  }
  return { from, to: current, length, minY };
}

export interface StrokeDraft extends StrokeGeometry {
  id: string;
  path: string;
  weight?: number;
}

// Give travel its own budget. A distant object must not inherit the tiny
// leftover percentage of the preceding object, however small that object is.
export function schedulePencilStrokes<T extends StrokeDraft>(
  strokes: readonly T[],
  start: number,
  end: number,
  duration: number,
): (T & { start: number; end: number })[] {
  const flights = strokes.map((stroke, index) => {
    const previous = strokes[index - 1];
    return previous
      ? Math.min(
          240,
          38 +
            Math.hypot(
              stroke.from[0] - previous.to[0],
              stroke.from[1] - previous.to[1],
            ) *
              0.22,
        )
      : 0;
  });
  const flightTotal = flights.reduce((sum, flight) => sum + flight, 0);
  const flightScale = flightTotal
    ? Math.min(1, (duration * 0.45) / flightTotal)
    : 1;
  const ink = strokes.map(
    (stroke) => (42 + Math.sqrt(stroke.length) * 2.2) * (stroke.weight ?? 1),
  );
  const inkTotal = ink.reduce((sum, value) => sum + value, 0);
  const inkScale = (duration - flightTotal * flightScale) / inkTotal;
  let cursor = 0;
  return strokes.map((stroke, index) => {
    cursor += flights[index]! * flightScale;
    const began = cursor;
    cursor += ink[index]! * inkScale;
    return {
      ...stroke,
      start: start + (began / duration) * (end - start),
      end:
        index === strokes.length - 1
          ? end
          : start + (cursor / duration) * (end - start),
    };
  });
}
