import { schedulePencilStrokes, strokeGeometry } from "./pencil-path";
import {
  drawingDuration,
  drawingTime,
  hatchPath,
  positioningEnd,
} from "./pencil-plan";

import type { PencilPoint } from "./pencil-plan";

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
  positioningEnd - 0.5,
  2470,
);

// Follow the top of each screen and the clear space below the hanging tools.
// The shared borders keep the whole tool or screen in one drawing area.
const laptopBorder: readonly PencilPoint[] = [
  [594, 430],
  [744, 417],
  [744, 342],
  [878, 341],
  [890, 402],
  [945, 420],
];
const displayBorder: readonly PencilPoint[] = [
  [945, 420],
  [972, 421],
  [982, 329],
  [1123, 330],
  [1123, 386],
  [1206, 386],
  [1206, 432],
  [1308, 432],
];

const pegboardBorder = [...laptopBorder, ...displayBorder.slice(1)].reverse();

function rectangle(
  left: number,
  top: number,
  right: number,
  bottom: number,
): readonly PencilPoint[] {
  return [
    [left, top],
    [right, top],
    [right, bottom],
    [left, bottom],
  ];
}

function deskPolygon(border: readonly PencilPoint[]): readonly PencilPoint[] {
  return [...border, [border.at(-1)![0], 491], [border[0]![0], 491]];
}

const areas: readonly {
  id: string;
  polygon: readonly PencilPoint[];
  hatchAngle: number;
  outlines: Readonly<Record<string, string>>;
}[] = [
  {
    id: "shelf",
    polygon: rectangle(594, 82, 1308, 236),
    hatchAngle: -7,
    outlines: {
      "shelf-contour":
        "M 733 208 L 1180 195 L 1226 203 L 1227 214 L 1181 205 L 733 219 Z",
      "plant-pot": "M 784 167 L 825 165 L 819 202 L 791 203 Z",
    },
  },
  {
    id: "pegboard",
    polygon: [[594, 236], [1308, 236], ...pegboardBorder],
    hatchAngle: -90,
    outlines: {
      "pegboard-left": "M 771 236 L 772 341",
      "pegboard-right": "M 1222 236 L 1222 429",
    },
  },
  {
    id: "laptop",
    polygon: deskPolygon(laptopBorder),
    hatchAngle: -90,
    outlines: {
      "notebook-contour":
        "M 747 346 L 875 344 L 889 419 L 922 429 L 921 435 L 785 442 L 756 428 Z",
      "left-desk-edge": "M 945 459 L 638 436 L 638 446 L 945 471",
    },
  },
  {
    id: "display",
    polygon: deskPolygon(displayBorder),
    hatchAngle: -90,
    outlines: {
      "screen-contour": "M 987 331 L 1118 333 L 1109 414 L 977 408 Z",
      "right-desk-edge":
        "M 945 459 L 1169 476 L 1252 436 L 1252 447 L 1171 489 L 945 471",
    },
  },
  {
    id: "stool",
    polygon: rectangle(594, 491, 992, 737),
    hatchAngle: -12,
    outlines: {
      "left-leg-contour": "M 665 491 L 664 623 L 680 629 L 691 623 L 692 491",
      "lower-shelf":
        "M 694 555 L 821 566 L 856 548 L 855 562 L 821 582 L 695 567",
      "stool-contour":
        "M 839 544 C 839 525 931 519 934 542 C 941 565 835 574 839 544 Z",
    },
  },
  {
    id: "drawers",
    polygon: rectangle(992, 491, 1308, 737),
    hatchAngle: 8,
    outlines: {
      "cabinet-front": "M 995 491 L 995 641 L 1147 661 L 1147 491",
      "drawer-contour": "M 1009 561 L 1143 575 L 1143 648 L 1009 631 Z",
      "right-leg-contour":
        "M 1148 491 L 1150 693 L 1166 698 L 1179 689 L 1177 491",
    },
  },
];

const areaStrokes = areas.map(({ id, polygon, hatchAngle, outlines }) => {
  const paths = Object.entries(outlines).map(([id, path]) => ({
    id,
    path,
    width: 8,
  }));
  // Overlap the hatch lines so the art is fully exposed within the area.
  paths.push({
    id: `${id}-hatch`,
    path: hatchPath(polygon, hatchAngle, 19),
    width: 52,
  });
  return paths.map((stroke) => ({ ...stroke, ...strokeGeometry(stroke.path) }));
});

const scheduledStrokes = schedulePencilStrokes(
  areaStrokes.flat(),
  positioningEnd,
  100,
  drawingDuration - drawingTime(positioningEnd),
);

let nextStroke = 0;
export const drawingAreas = areas.map(({ id, polygon }, index) => {
  const strokes = scheduledStrokes.slice(
    nextStroke,
    nextStroke + areaStrokes[index]!.length,
  );
  nextStroke += strokes.length;
  const points = polygon.map((point) => point.join(",")).join(" ");
  return { id, points, strokes, end: strokes.at(-1)!.end };
});
