const rowSpacing = 3.5;
const hatchLength = 38;
const overlap = 1.5;
const hatchSettledAt = 0.98;

export function planHatching(path: string, width: number) {
  const coordinates = path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  const xs = coordinates.filter((_, index) => index % 2 === 0);
  const ys = coordinates.filter((_, index) => index % 2 === 1);
  const horizontal =
    Math.max(...xs) - Math.min(...xs) >= Math.max(...ys) - Math.min(...ys);
  const axis = horizontal ? xs : ys;
  const next = axis.find((value) => Math.abs(value - axis[0]!) > 8);
  const direction = (next ?? axis[0]!) >= axis[0]! ? 1 : -1;
  const angle = (horizontal ? -8 : 82) + (direction < 0 ? 180 : 0);
  const radians = (angle * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const along = xs.map((x, index) => x * cosine + ys[index]! * sine);
  const across = xs.map((x, index) => ys[index]! * cosine - x * sine);
  const padding = width / 2 + rowSpacing * 2;
  const left = Math.floor(Math.min(...along) - padding);
  const top = Math.floor(Math.min(...across) - padding);
  const columns =
    1 + Math.ceil((Math.max(...along) + padding - left) / hatchLength);
  const rows = Math.ceil((Math.max(...across) + padding - top) / rowSpacing);

  const strips = Array.from({ length: rows }, (_, row) => {
    const offset = (row % 4) * (hatchLength / 4);
    const segments = Array.from({ length: columns }, (_, column) => {
      const phase = ((row * 5 + column * 3 + Math.floor(row / 7)) % 11) / 10;
      const position = column / (columns - 1);
      const start =
        position * 0.92 + phase * Math.min(0.28, (1 - position) * 0.62);
      return {
        x: left - offset + column * hatchLength,
        start,
        duration: Math.min(0.14, hatchSettledAt - start),
      };
    });
    return { y: top + row * rowSpacing, segments };
  });

  return { angle, strips };
}

export function hatchingPath(
  plan: ReturnType<typeof planHatching>,
  fraction: number,
) {
  const d: string[] = [];
  const height = rowSpacing + overlap;
  for (const { y, segments } of plan.strips) {
    let coveredFrom: number | undefined;
    const draw = (x: number, length: number) => {
      d.push(`M${x} ${y}h${length}v${height}h-${length}Z`);
    };
    for (const { x, start, duration } of segments) {
      const growth = (fraction - start) / duration;
      if (growth >= 1) {
        coveredFrom ??= x;
        continue;
      }
      if (coveredFrom !== undefined) {
        draw(coveredFrom, x - coveredFrom + overlap);
        coveredFrom = undefined;
      }
      if (growth > 0)
        draw(x, Number(((hatchLength + overlap) * growth).toFixed(2)));
    }
    if (coveredFrom !== undefined) {
      draw(
        coveredFrom,
        segments.at(-1)!.x - coveredFrom + hatchLength + overlap,
      );
    }
  }
  return d.join("");
}
