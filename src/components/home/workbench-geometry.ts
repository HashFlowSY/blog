import { schedulePencilStrokes, strokeGeometry } from "./pencil-path";
import { hatchPath } from "./pencil-plan";

export const vertices = {
  footLeft: [542, 822],
  footRight: [1248, 944],
  footBackRight: [1365, 864],
  footBackLeft: [656, 755],
  topLeft: [512, 548],
  topRight: [1248, 618],
  topBackRight: [1365, 550],
  topBackLeft: [645, 485],
  apronLeft: [512, 575],
  apronRight: [1248, 646],
  apronBackRight: [1365, 576],
  apronBackLeft: [645, 512],
  rackTopLeft: [660, 246],
  rackTopRight: [1355, 231],
  rackBottomRight: [1355, 590],
  rackBottomLeft: [660, 536],
  shelfFrontLeft: [619, 240],
  shelfFrontRight: [1382, 235],
  shelfBackRight: [1355, 216],
  shelfBackLeft: [647, 221],
  cabinetTopLeft: [1055, 628],
  cabinetTopRight: [1225, 645],
  cabinetBottomRight: [1225, 904],
  cabinetBottomLeft: [1055, 868],
  cabinetBackTop: [1340, 580],
  cabinetBackBottom: [1340, 838],
  drawerTopLeft: [1055, 723],
  drawerTopRight: [1225, 748],
  monitorTopLeft: [1006, 386],
  monitorTopRight: [1194, 392],
  monitorBottomRight: [1185, 515],
  monitorBottomLeft: [1006, 510],
  monitorStandTop: [1098, 513],
  monitorStandBottom: [1098, 553],
  monitorBaseLeft: [1047, 561],
  monitorBaseRight: [1163, 568],
  laptopTopLeft: [675, 402],
  laptopTopRight: [849, 400],
  laptopBottomRight: [865, 512],
  laptopBottomLeft: [685, 515],
  laptopBaseLeft: [648, 531],
  laptopBaseRight: [917, 547],
} as const satisfies Record<string, readonly [number, number]>;

type VertexId = keyof typeof vertices;

const edges = [
  ["topLeft", "topRight"],
  ["topRight", "topBackRight"],
  ["topBackRight", "topBackLeft"],
  ["topBackLeft", "topLeft"],
  ["topLeft", "apronLeft"],
  ["topRight", "apronRight"],
  ["topBackRight", "apronBackRight"],
  ["apronLeft", "apronRight"],
  ["apronRight", "apronBackRight"],
  ["apronBackLeft", "apronLeft"],
  ["apronLeft", "footLeft"],
  ["apronRight", "footRight"],
  ["apronBackRight", "footBackRight"],
  ["apronBackLeft", "footBackLeft"],
  ["rackTopLeft", "rackTopRight"],
  ["rackTopRight", "rackBottomRight"],
  ["rackBottomRight", "rackBottomLeft"],
  ["rackBottomLeft", "rackTopLeft"],
  ["shelfFrontLeft", "shelfFrontRight"],
  ["shelfFrontRight", "shelfBackRight"],
  ["shelfBackRight", "shelfBackLeft"],
  ["shelfBackLeft", "shelfFrontLeft"],
  ["cabinetTopLeft", "cabinetTopRight"],
  ["cabinetTopRight", "cabinetBottomRight"],
  ["cabinetBottomRight", "cabinetBottomLeft"],
  ["cabinetBottomLeft", "cabinetTopLeft"],
  ["cabinetTopRight", "cabinetBackTop"],
  ["cabinetBackTop", "cabinetBackBottom"],
  ["cabinetBackBottom", "cabinetBottomRight"],
  ["drawerTopLeft", "drawerTopRight"],
  ["monitorTopLeft", "monitorTopRight"],
  ["monitorTopRight", "monitorBottomRight"],
  ["monitorBottomRight", "monitorBottomLeft"],
  ["monitorBottomLeft", "monitorTopLeft"],
  ["monitorStandTop", "monitorStandBottom"],
  ["monitorBaseLeft", "monitorStandBottom"],
  ["monitorStandBottom", "monitorBaseRight"],
  ["laptopTopLeft", "laptopTopRight"],
  ["laptopTopRight", "laptopBottomRight"],
  ["laptopBottomRight", "laptopBottomLeft"],
  ["laptopBottomLeft", "laptopTopLeft"],
  ["laptopBottomLeft", "laptopBaseLeft"],
  ["laptopBaseLeft", "laptopBaseRight"],
  ["laptopBaseRight", "laptopBottomRight"],
] as const satisfies readonly (readonly [VertexId, VertexId])[];

const planes = [
  {
    id: "rack",
    corners: [
      "rackTopLeft",
      "rackTopRight",
      "rackBottomRight",
      "rackBottomLeft",
    ],
    color: "#e3dac8",
  },
  {
    id: "cabinetSide",
    corners: [
      "cabinetTopRight",
      "cabinetBackTop",
      "cabinetBackBottom",
      "cabinetBottomRight",
    ],
    color: "#c4baa7",
  },
  {
    id: "cabinetFront",
    corners: [
      "cabinetTopLeft",
      "cabinetTopRight",
      "cabinetBottomRight",
      "cabinetBottomLeft",
    ],
    color: "#e8deca",
  },
  {
    id: "drawer",
    corners: [
      "drawerTopLeft",
      "drawerTopRight",
      "cabinetBottomRight",
      "cabinetBottomLeft",
    ],
    color: "#d9c355",
  },
  {
    id: "tableApron",
    corners: ["topLeft", "topRight", "apronRight", "apronLeft"],
    color: "#b9ae9c",
  },
  {
    id: "tableTop",
    corners: ["topLeft", "topRight", "topBackRight", "topBackLeft"],
    color: "#e8dcc5",
  },
  {
    id: "shelf",
    corners: [
      "shelfFrontLeft",
      "shelfFrontRight",
      "shelfBackRight",
      "shelfBackLeft",
    ],
    color: "#c9bea8",
  },
  {
    id: "monitor",
    corners: [
      "monitorTopLeft",
      "monitorTopRight",
      "monitorBottomRight",
      "monitorBottomLeft",
    ],
    color: "#e5dece",
  },
  {
    id: "laptopScreen",
    corners: [
      "laptopTopLeft",
      "laptopTopRight",
      "laptopBottomRight",
      "laptopBottomLeft",
    ],
    color: "#ece4d4",
  },
  {
    id: "laptopBase",
    corners: [
      "laptopBottomLeft",
      "laptopBottomRight",
      "laptopBaseRight",
      "laptopBaseLeft",
    ],
    color: "#c8bfad",
  },
] as const satisfies readonly {
  id: string;
  corners: readonly VertexId[];
  color: string;
}[];

// Fixed seeds keep pencil pressure and retracing stable while scrubbing/replaying.
function pencilVariation(seed: number): number {
  let value = Math.imul(seed + 1, 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff - 0.5;
}

function pencilTrace(
  from: readonly [number, number],
  to: readonly [number, number],
  seed: number,
  retrace: number,
): string {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy);
  const nx = -dy / length;
  const ny = dx / length;
  const amplitude = 2.1 + retrace * 1.6;

  function mark(t: number, index: number): string {
    const drift = pencilVariation(seed + index * 13) * amplitude;
    return `${(from[0] + dx * t + nx * drift).toFixed(2)} ${(from[1] + dy * t + ny * drift).toFixed(2)}`;
  }

  let path = `M ${mark(-0.003, 0)}`;
  for (let section = 1; section <= 4; section++) {
    const t = section / 4;
    path += ` Q ${mark(t - 0.125, section * 2)} ${mark(t + 0.003, section * 2 + 1)}`;
  }
  return path;
}

const pencilPasses = [
  { width: 1.05, opacity: 0.72 },
  { width: 0.55, opacity: 0.32 },
  { width: 0.35, opacity: 0.2 },
] as const;

const edgeDrafts = edges.map(([from, to], index) => ({
  id: `${from}-${to}`,
  strokes: pencilPasses.map((pass, retrace) => ({
    ...pass,
    d: pencilTrace(
      vertices[from],
      vertices[to],
      index * 71 + retrace * 23,
      retrace,
    ),
    pressure: 0.85 + pencilVariation(index * 17 + retrace) * 0.3,
  })),
}));

export const pencilEdges = schedulePencilStrokes(
  edgeDrafts.map((edge) => ({
    ...edge,
    path: edge.strokes[0]!.d,
    ...strokeGeometry(edge.strokes[0]!.d),
  })),
  18.6,
  57.7,
  3128,
);

const planeDrafts = planes.map((plane) => {
  const points = plane.corners.map((id) => vertices[id]);
  const x = Math.min(...points.map(([x]) => x));
  const y = Math.min(...points.map(([, y]) => y));
  const width = Math.max(...points.map(([x]) => x)) - x;
  const height = Math.max(...points.map(([, y]) => y)) - y;
  return {
    ...plane,
    hatch: hatchPath([x, y, width, height], -34, 10, points),
  };
});

export const shadedPlanes = schedulePencilStrokes(
  planeDrafts.map((plane) => ({
    ...plane,
    path: plane.hatch,
    ...strokeGeometry(plane.hatch),
  })),
  59.3,
  77.5,
  1501.5,
);

const outlinePoints = [
  "topLeft",
  "footLeft",
  "footRight",
  "topRight",
  "shelfFrontRight",
  "shelfFrontLeft",
] as const satisfies readonly VertexId[];

export const pointStrokes = schedulePencilStrokes(
  outlinePoints.map((id) => {
    const point = vertices[id];
    return {
      id: `point-${id}`,
      point,
      path: "",
      from: point,
      to: point,
      minY: point[1],
      length: 2,
    };
  }),
  1.4,
  17.2,
  1275,
);
