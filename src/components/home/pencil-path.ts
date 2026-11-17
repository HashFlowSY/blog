import type { PencilPoint } from "./pencil-plan";

interface StrokeGeometry {
  length: number;
  minY: number;
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
  return { length, minY };
}
