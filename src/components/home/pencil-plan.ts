export type WorkbenchPart = "tools" | "foundation" | "surface";
export type DrawingBounds = readonly [number, number, number, number];
export type PencilPoint = readonly [number, number];

export interface PencilStroke {
  id: string;
  start: number;
  end: number;
  path: string;
  point?: PencilPoint;
}

export function strokeFraction(
  progress: number,
  stroke: Pick<PencilStroke, "start" | "end">,
): number {
  return pencilEase((progress - stroke.start) / (stroke.end - stroke.start));
}

interface PencilRegion {
  id: string;
  part: WorkbenchPart;
  bounds: DrawingBounds;
  weight: number;
  contour?: string;
  shape?: string;
  exclude?: readonly DrawingBounds[];
  angle?: number;
}

// These are brush masks over the original artwork, in its 1536 x 1024 coordinates.
// Ordering the masks gives one pencil a coherent route through the small objects.
const toolbox: DrawingBounds = [578, 620, 212, 122];
const stool: DrawingBounds = [703, 667, 241, 295];
const hangingTools: readonly DrawingBounds[] = [
  [713, 319, 48, 140],
  [762, 319, 47, 140],
  [810, 328, 30, 117],
  [840, 326, 29, 124],
  [871, 331, 30, 146],
  [901, 333, 25, 130],
  [926, 335, 23, 115],
  [949, 334, 23, 116],
  [972, 333, 24, 115],
  [1000, 339, 47, 121],
  [1052, 330, 35, 116],
  [1124, 326, 105, 117],
  [1234, 331, 72, 183],
  [1306, 404, 33, 145],
];

const regions: readonly PencilRegion[] = [
  {
    id: "left-leg",
    part: "foundation",
    bounds: [501, 518, 77, 315],
    weight: 0.5,
    angle: -76,
    contour: "M 525 543 L 524 805 L 551 812 L 555 550",
  },
  {
    id: "back-leg",
    part: "foundation",
    bounds: [637, 484, 69, 294],
    weight: 0.35,
    exclude: [toolbox],
    angle: -76,
  },
  {
    id: "front-leg",
    part: "foundation",
    bounds: [1205, 575, 78, 380],
    weight: 0.55,
    angle: -76,
    contour: "M 1221 611 L 1221 926 L 1256 935 L 1259 604",
  },
  {
    id: "back-right-leg",
    part: "foundation",
    bounds: [1308, 526, 70, 356],
    weight: 0.4,
    angle: -76,
  },
  {
    id: "front-beam",
    part: "foundation",
    bounds: [526, 487, 510, 151],
    weight: 0.5,
    shape:
      "M 524 542 L 1029 580 L 1029 640 L 524 590 Z M 531 531 L 652 487 L 699 503 L 555 571 Z",
    contour: "M 539 554 L 1005 600 L 1003 624 L 538 579 Z",
  },
  {
    id: "cabinet-left-leg",
    part: "foundation",
    bounds: [981, 575, 51, 289],
    weight: 0.45,
    angle: -76,
  },
  {
    id: "right-upper-beam",
    part: "foundation",
    bounds: [1234, 518, 107, 91],
    weight: 0.25,
  },
  {
    id: "cabinet-front",
    part: "foundation",
    bounds: [1006, 595, 237, 303],
    weight: 0.8,
    contour:
      "M 1017 612 L 1221 646 L 1221 881 L 1015 845 Z M 1022 650 L 1212 683 M 1020 716 L 1213 748",
  },
  {
    id: "cabinet-side",
    part: "foundation",
    bounds: [1240, 562, 117, 325],
    weight: 0.55,
    angle: -52,
  },
  {
    id: "lower-shelf",
    part: "foundation",
    bounds: [536, 695, 292, 84],
    weight: 0.35,
    exclude: [toolbox, stool],
  },
  {
    id: "toolbox",
    part: "foundation",
    bounds: toolbox,
    weight: 0.7,
    contour: "M 590 647 Q 641 618 763 647 L 775 713 L 605 730 Z",
  },
  {
    id: "stool",
    part: "foundation",
    bounds: stool,
    weight: 1.05,
    contour:
      "M 760 699 C 762 666 898 667 901 700 C 905 743 758 747 760 699 M 831 736 L 833 943 M 831 850 L 724 901 M 833 850 L 925 897",
  },
  {
    id: "tabletop",
    part: "surface",
    bounds: [486, 484, 895, 156],
    weight: 1,
    contour:
      "M 499 541 L 646 486 L 1368 535 L 1270 596 Z M 500 558 L 1269 614 L 1368 549",
  },
  {
    id: "laptop",
    part: "surface",
    bounds: [651, 382, 280, 177],
    weight: 1,
    contour:
      "M 669 402 L 847 397 L 868 517 L 685 524 Z M 686 524 L 923 533 L 869 549 L 686 533 Z",
  },
  {
    id: "monitor",
    part: "surface",
    bounds: [964, 362, 241, 182],
    weight: 0.85,
    contour:
      "M 980 382 L 1187 384 L 1180 502 L 979 493 Z M 1085 501 L 1085 526 L 1041 532 L 1140 537",
  },
  {
    id: "keyboard-and-pen",
    part: "surface",
    bounds: [891, 527, 278, 44],
    weight: 0.45,
  },
  {
    id: "vise",
    part: "surface",
    bounds: [1194, 469, 112, 127],
    weight: 0.65,
    angle: -60,
  },
  {
    id: "pegboard",
    part: "tools",
    bounds: [644, 236, 737, 374],
    weight: 1.4,
    exclude: [...hangingTools, [806, 246, 284, 42]],
    contour: "M 686 254 L 1341 244 L 1345 592 L 685 580 Z",
  },
  {
    id: "shelf",
    part: "tools",
    bounds: [608, 208, 786, 54],
    weight: 0.55,
    exclude: [
      [635, 42, 185, 186],
      [763, 162, 216, 68],
      [1090, 91, 114, 136],
      [1198, 106, 171, 120],
    ],
    contour: "M 621 233 L 1319 215 L 1381 225 L 1380 241 L 620 249 Z",
  },
  { id: "lamp", part: "tools", bounds: [806, 246, 284, 42], weight: 0.35 },
  ...hangingTools.map((bounds, index) => ({
    id: `hanging-tool-${index + 1}`,
    part: "tools" as const,
    bounds,
    weight: index === 11 ? 0.48 : 0.27,
    angle: -70,
  })),
  {
    id: "shelf-boxes",
    part: "tools",
    bounds: [763, 162, 216, 72],
    weight: 0.65,
  },
  {
    id: "books",
    part: "tools",
    bounds: [1090, 91, 114, 140],
    weight: 1.2,
    angle: -76,
  },
  {
    id: "small-drawers",
    part: "tools",
    bounds: [1198, 106, 171, 123],
    weight: 1.2,
  },
  {
    id: "plant",
    part: "tools",
    bounds: [635, 42, 185, 193],
    weight: 2.2,
    contour:
      "M 688 167 L 696 224 L 754 226 L 764 166 Z M 726 167 Q 710 105 684 63 M 730 166 Q 747 105 783 88",
  },
];

export function constructionFraction(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function pencilEase(value: number): number {
  const fraction = constructionFraction(value);
  return fraction * fraction * (3 - 2 * fraction);
}

export function hatchPath(
  bounds: DrawingBounds,
  angle = -32,
  spacing = 5,
  polygon?: readonly PencilPoint[],
): string {
  const [x, y, width, height] = bounds;
  const radians = (angle * Math.PI) / 180;
  const ux = Math.cos(radians);
  const uy = Math.sin(radians);
  const vx = -uy;
  const vy = ux;
  const corners = polygon ?? [
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
  ];
  const projected = corners.map(
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

function rectanglePath([x, y, width, height]: DrawingBounds): string {
  return `M ${x} ${y} h ${width} v ${height} h ${-width} Z`;
}

function intersectBounds(
  bounds: DrawingBounds,
  outer: DrawingBounds,
): DrawingBounds[] {
  const x = Math.max(bounds[0], outer[0]);
  const y = Math.max(bounds[1], outer[1]);
  const width = Math.min(bounds[0] + bounds[2], outer[0] + outer[2]) - x;
  const height = Math.min(bounds[1] + bounds[3], outer[1] + outer[3]) - y;
  return width > 0 && height > 0 ? [[x, y, width, height]] : [];
}

const regionDrafts = regions.map((region) => {
  const hatch = hatchPath(region.bounds, region.angle);
  const strokes = [
    ...splitPencilPath(region.contour ?? "").map((path, index) => ({
      id: `${region.id}-contour${index ? `-${index + 1}` : ""}`,
      path,
      kind: "contour" as const,
    })),
    { id: `${region.id}-hatch`, path: hatch, kind: "hatch" as const },
  ].map((stroke) => ({
    ...stroke,
    region: region.id,
    ...strokeGeometry(stroke.path),
    weight: Math.sqrt(region.weight),
  }));
  return { ...region, hatch, strokes };
});

const detailStrokes = schedulePencilStrokes(
  regionDrafts.flatMap((region) => region.strokes),
  82,
  100,
  11450,
);

export const pencilPasses = regionDrafts.map((region) => {
  const strokes = detailStrokes.filter((stroke) => stroke.region === region.id);
  return {
    ...region,
    start: strokes[0]!.start,
    end: strokes.at(-1)!.end,
    strokes,
    clip: [
      region.shape ?? rectanglePath(region.bounds),
      ...(region.exclude ?? [])
        .flatMap((bounds) => intersectBounds(bounds, region.bounds))
        .map(rectanglePath),
    ].join(" "),
  };
});

// More than half of playback is reserved for drawing the final small details.
const playbackStops = [
  [0, 0],
  [18, 2800],
  [58, 6000],
  [78, 7650],
  [82, 7950],
  [99.6, 18950],
  [100, 19400],
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
import {
  schedulePencilStrokes,
  splitPencilPath,
  strokeGeometry,
} from "./pencil-path";
