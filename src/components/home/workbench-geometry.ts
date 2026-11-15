import { schedulePencilStrokes, strokeGeometry } from "./pencil-path";
import { hatchPath } from "./pencil-plan";

import type { DrawingBounds, PencilPoint } from "./pencil-plan";

const marks = {
  topLeft: [638, 436],
  topRight: [1169, 476],
  backRight: [1252, 436],
  shelfLeft: [733, 207],
  shelfRight: [1226, 204],
  leftFoot: [678, 628],
  rightFoot: [1163, 697],
  cabinet: [1009, 492],
  notebook: [747, 346],
  screen: [987, 331],
  stool: [840, 553],
} as const satisfies Record<string, PencilPoint>;

export const pointStrokes = schedulePencilStrokes(
  Object.entries(marks).map(([id, point]) => ({
    id: `point-${id}`,
    path: "",
    point,
    from: point,
    to: point,
    minY: point[1],
    length: 2,
  })),
  1.1,
  17.5,
  2470,
);

const outlines = {
  "topLeft-topRight": "M 638 436 L 1169 476 L 1252 436 L 1221 431",
  "bench-apron": "M 638 436 L 638 446 L 1171 489 L 1252 447 L 1252 436",
  "left-leg-contour": "M 665 451 L 664 623 L 680 629 L 691 623 L 692 454 Z",
  "left-support": "M 692 489 L 764 471 L 765 594",
  "right-leg-contour": "M 1148 487 L 1150 693 L 1166 698 L 1179 689 L 1177 488",
  "rear-right-foot": "M 1212 468 L 1215 633 L 1228 640 L 1237 633 L 1235 457",
  "shelf-contour":
    "M 733 208 L 1180 195 L 1226 203 L 1227 214 L 1181 205 L 733 219 Z",
  "rack-contour": "M 771 217 L 772 423 L 1222 437 L 1222 215",
  "cabinet-front": "M 995 480 L 995 641 L 1147 661 L 1147 488",
  "cabinet-side": "M 1180 483 L 1235 453 L 1234 599 L 1182 643",
  "lower-shelf": "M 694 555 L 821 566 L 856 548 L 855 562 L 821 582 L 695 567",
  "notebook-contour":
    "M 747 346 L 875 344 L 889 419 L 922 429 L 921 435 L 785 442 L 756 428 Z",
  "screen-contour": "M 987 331 L 1118 333 L 1109 414 L 977 408 Z",
  "stool-contour":
    "M 839 544 C 839 525 931 519 934 542 C 941 565 835 574 839 544 Z",
  "drawer-contour": "M 1009 561 L 1143 575 L 1143 648 L 1009 631 Z",
} as const;

export const pencilEdges = schedulePencilStrokes(
  Object.entries(outlines).map(([id, path]) => ({
    id,
    path,
    ...strokeGeometry(path),
  })),
  18,
  57.5,
  3200,
);

const planes: readonly (readonly [string, readonly PencilPoint[], number])[] = [
  [
    "rack",
    [
      [771, 218],
      [1222, 211],
      [1222, 434],
      [774, 419],
    ],
    -31,
  ],
  [
    "table",
    [
      [639, 436],
      [773, 415],
      [1250, 436],
      [1169, 473],
    ],
    12,
  ],
  [
    "cabinet",
    [
      [1000, 483],
      [1146, 490],
      [1146, 660],
      [998, 641],
    ],
    -28,
  ],
  [
    "drawer",
    [
      [1010, 560],
      [1142, 574],
      [1142, 649],
      [1010, 631],
    ],
    10,
  ],
  [
    "shelf",
    [
      [732, 204],
      [1178, 192],
      [1227, 204],
      [1180, 219],
      [733, 222],
    ],
    3,
  ],
];

export const shadedPlanes = schedulePencilStrokes(
  planes.map(([id, polygon, angle]) => {
    const path = hatchPath([0, 0, 0, 0], angle, 18, polygon);
    return { id: `plane-${id}`, polygon, path, ...strokeGeometry(path) };
  }),
  58,
  81.6,
  1950,
);

const detailRegions: readonly (readonly [string, DrawingBounds, number])[] = [
  ["plant", [747, 91, 121, 117], -32],
  ["shelf-boxes", [822, 167, 129, 40], 20],
  ["shelf-books", [1055, 127, 162, 78], -43],
  ["light", [839, 210, 183, 26], 3],
  ["left-tools", [792, 259, 97, 76], -37],
  ["wrenches", [896, 269, 96, 74], -47],
  ["right-tools", [1007, 266, 182, 116], -24],
  ["laptop", [744, 342, 180, 101], -30],
  ["display", [974, 328, 148, 111], -29],
  ["desk-tools", [924, 432, 167, 23], 11],
  ["vise", [1127, 397, 74, 72], -47],
  ["left-frame", [655, 445, 58, 191], -56],
  ["toolbox", [710, 496, 139, 67], 22],
  ["under-shelf", [688, 553, 170, 48], 14],
  ["stool", [802, 523, 166, 190], -34],
  ["upper-drawers", [998, 481, 148, 96], 11],
  ["yellow-drawer", [1003, 554, 143, 99], 29],
  ["right-frame", [1145, 460, 98, 244], -48],
  ["floor-contact", [608, 617, 663, 111], -19],
];

export const detailStrokes = schedulePencilStrokes(
  detailRegions.map(([id, bounds, angle]) => {
    const path = hatchPath(bounds, angle, 12);
    return { id: `${id}-hatch`, bounds, path, ...strokeGeometry(path) };
  }),
  82,
  100,
  11450,
);
