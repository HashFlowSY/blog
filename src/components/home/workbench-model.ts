import {
  BoxGeometry,
  type BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Euler,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  Shape,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

import { layoutWorkbenchAtlas } from "./workbench-atlas";
import { perforatedBoard, solidSurfaces } from "./workbench-surfaces";
import { artworkPoint } from "./workbench-view";

import type {
  ArtworkQuad,
  ArtworkRegion,
  SurfaceProjection,
  WorkbenchSurface,
} from "./workbench-atlas";
import type { WorkbenchFinish } from "./workbench-materials";
import type { ArtworkPoint } from "./workbench-view";
import type { Texture } from "three";

type Point = readonly [number, number, number];
type Finish = WorkbenchFinish;
type Quad<T> = readonly [T, T, T, T];
interface SolidArtwork {
  front?: ArtworkQuad;
  sides?: Partial<Record<number, ArtworkQuad>>;
}

const xAxis = new Vector3(1, 0, 0);
const up = new Vector3(0, 1, 0);
const down = new Vector3(0, -1, 0);

function rectangle(
  [a, b, c, d]: Quad<Vector3>,
  right: Vector3,
  bottom: Vector3,
) {
  const center = a.clone().add(b).add(c).add(d).multiplyScalar(0.25);
  const width = b.clone().sub(a).add(c).sub(d).dot(right) / 4;
  const height = d.clone().sub(a).add(c).sub(b).dot(bottom) / 4;
  return [
    center
      .clone()
      .addScaledVector(right, -width)
      .addScaledVector(bottom, -height),
    center
      .clone()
      .addScaledVector(right, width)
      .addScaledVector(bottom, -height),
    center
      .clone()
      .addScaledVector(right, width)
      .addScaledVector(bottom, height),
    center.addScaledVector(right, -width).addScaledVector(bottom, height),
  ] as const;
}

export interface WorkbenchModel {
  group: Group;
  dispose(): void;
}

// The asset generator and the interactive view consume the same rigid solids.
export function buildWorkbenchSurfaces() {
  const surfaces: WorkbenchSurface[] = [];
  let region: ArtworkRegion = "desk";

  function add(
    geometry: BufferGeometry,
    finish: Finish,
    position: Point,
    rotation: Point = [0, 0, 0],
    outline = true,
    projection?: SurfaceProjection,
  ) {
    const matrix = new Matrix4()
      .makeRotationFromEuler(new Euler(...rotation))
      .setPosition(...position);
    const solid = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    solid.applyMatrix4(matrix);
    solid.clearGroups();
    surfaces.push({
      geometry: solid,
      finish,
      region,
      outline,
      ...(projection && { projection }),
    });
    geometry.dispose();
  }
  function box(
    w: number,
    h: number,
    d: number,
    finish: Finish,
    at: Point,
    rotation: Point = [0, 0, 0],
  ) {
    const radius = Math.min(0.035, w / 6, h / 6, d / 6);
    add(
      Math.min(w, h, d) < 0.055
        ? new BoxGeometry(w, h, d)
        : new RoundedBoxGeometry(w, h, d, 2, radius),
      finish,
      at,
      rotation,
    );
  }
  function cylinder(
    top: number,
    bottom: number,
    height: number,
    finish: Finish,
    at: Point,
    rotation: Point = [0, 0, 0],
    open = false,
  ) {
    add(
      new CylinderGeometry(top, bottom, height, 20, 1, open),
      finish,
      at,
      rotation,
    );
  }
  function rod(from: Point, to: Point, radius: number, finish: Finish) {
    const a = new Vector3(...from),
      b = new Vector3(...to);
    const direction = b.clone().sub(a);
    const rotation = new Euler().setFromQuaternion(
      new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        direction.clone().normalize(),
      ),
    );
    add(
      new CylinderGeometry(radius, radius, direction.length(), 10),
      finish,
      a.add(b).multiplyScalar(0.5).toArray(),
      [rotation.x, rotation.y, rotation.z],
    );
  }
  function tube(points: Point[], radius: number, finish: Finish) {
    add(
      new TubeGeometry(
        new CatmullRomCurve3(points.map((p) => new Vector3(...p))),
        16,
        radius,
        6,
        false,
      ),
      finish,
      [0, 0, 0],
      undefined,
      false,
    );
  }
  function screw(at: Point, front = true) {
    cylinder(
      0.026,
      0.026,
      0.016,
      "metal",
      at,
      front ? [Math.PI / 2, 0, 0] : [0, 0, 0],
    );
    box(0.031, front ? 0.006 : 0.003, front ? 0.003 : 0.006, "dark", [
      at[0],
      at[1] + (front ? 0 : 0.009),
      at[2] + (front ? 0.009 : 0),
    ]);
  }
  function drawerPull(
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
  ) {
    for (const side of [-1, 1])
      box(height * 0.72, height * 1.24, height * 0.9, "metal", [
        x + side * (width / 2 - height * 0.32),
        y,
        z + height * 0.42,
      ]);
    box(width, height * 0.62, height * 0.4, "dark", [
      x,
      y - height * 0.13,
      z + height * 0.92,
    ]);
  }
  function pointsAt<const Points extends readonly ArtworkPoint[]>(
    points: Points,
    axis: "x" | "y" | "z",
    at: number,
  ) {
    return points.map((point) => artworkPoint(point, axis, at)) as {
      [Index in keyof Points]: Vector3;
    };
  }
  function solid(
    front: readonly Vector3[],
    back: readonly Vector3[],
    finish: Finish,
    artwork?: SolidArtwork,
  ) {
    const { front: cap, back: base, sides } = solidSurfaces(front, back);
    const plain = [base];
    function face(
      geometry: BufferGeometry,
      corners: readonly Vector3[],
      pixels: ArtworkQuad | undefined,
    ) {
      if (pixels)
        add(geometry, finish, [0, 0, 0], undefined, true, { corners, pixels });
      else plain.push(geometry);
    }
    face(cap, front, artwork?.front);
    sides.forEach((side, i) => {
      const next = (i + 1) % front.length;
      face(
        side,
        [front[i]!, front[next]!, back[next]!, back[i]!],
        artwork?.sides?.[i],
      );
    });
    add(mergeGeometries(plain)!, finish, [0, 0, 0]);
    plain.forEach((face) => face.dispose());
  }
  function slab(
    front: readonly Vector3[],
    offset: Vector3,
    finish: Finish,
    artwork?: SolidArtwork,
  ) {
    solid(
      front,
      front.map((point) => point.clone().add(offset)),
      finish,
      artwork,
    );
  }

  function panel(
    quad: Quad<ArtworkPoint>,
    frontZ: number,
    thickness: number,
    finish: Finish,
  ) {
    const front = rectangle(pointsAt(quad, "z", frontZ), xAxis, down);
    solid(
      front,
      front.map((point) => point.clone().setZ(frontZ - thickness)),
      finish,
    );
    return front;
  }

  // The rectangle is fitted to all four observed corners in the reference camera.
  const tabletopHeight = 3.13;
  const deskWidth = 7.744724;
  const deskDepth = 3.260258;
  const deskYaw = 0.024078;
  const across = new Vector3(Math.cos(deskYaw), 0, -Math.sin(deskYaw));
  const inward = up.clone().cross(across);
  const deskCenter = new Vector3(0.158813, tabletopHeight, 0.212426);
  const tabletop = (
    [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const
  ).map(([x, z]) =>
    deskCenter
      .clone()
      .addScaledVector(across, (x * deskWidth) / 2)
      .addScaledVector(inward, (z * deskDepth) / 2),
  );
  const apronHeight = 2.94;
  slab(tabletop, new Vector3(0, apronHeight - tabletopHeight, 0), "wood", {
    front: [
      [498, 540],
      [1271, 591],
      [1368, 530],
      [668, 499],
    ],
    sides: {
      0: [
        [498, 540],
        [1271, 591],
        [1271, 611],
        [498, 559],
      ],
      1: [
        [1271, 591],
        [1368, 530],
        [1368, 550],
        [1271, 611],
      ],
    },
  });

  // One floor plane and the slab footprint constrain every post and foot.
  region = "frame";
  const floorHeight = 0.095;
  const postFaces: readonly ArtworkQuad[] = [
    [
      [520, 560],
      [550, 563],
      [550, 803],
      [521, 800],
    ],
    [
      [1212, 622],
      [1257, 627],
      [1256, 928],
      [1216, 923],
    ],
    [
      [1316, 578],
      [1346, 554],
      [1345, 828],
      [1317, 826],
    ],
    [
      [646, 516],
      [686, 512],
      [686, 756],
      [646, 752],
    ],
  ];
  const feet = pointsAt(
    [
      [536, 809],
      [1238, 936],
      [1330, 833],
      [668, 758],
    ],
    "y",
    floorHeight - 0.034,
  );
  const legs = feet.map((foot, index) => {
    const local = foot.clone().sub(deskCenter);
    const halfWidth = index === 0 || index === 3 ? 0.13 : 0.16;
    const limitX = deskWidth / 2 - halfWidth - 0.045;
    const limitZ = deskDepth / 2 - 0.12;
    const center = deskCenter
      .clone()
      .addScaledVector(
        across,
        Math.min(limitX, Math.max(-limitX, local.dot(across))),
      )
      .addScaledVector(
        inward,
        Math.min(limitZ, Math.max(-limitZ, local.dot(inward))),
      );
    const { x, z } = center;
    const front = [
      new Vector3(x - halfWidth, apronHeight, z + 0.11),
      new Vector3(x + halfWidth, apronHeight, z + 0.11),
      new Vector3(x + halfWidth, floorHeight, z + 0.11),
      new Vector3(x - halfWidth, floorHeight, z + 0.11),
    ];
    slab(front, new Vector3(0, 0, -0.22), "wood", { front: postFaces[index]! });
    box(0.44, 0.078, 0.3, "metal", [x, floorHeight - 0.034, z]);
    for (const dx of [-0.14, 0.14])
      screw([x + dx, floorHeight + 0.008, z + 0.083], false);
    return center;
  });
  const leftApron = legs[0]!
    .clone()
    .addScaledVector(across, -0.12)
    .addScaledVector(inward, -0.12);
  const rightApron = legs[1]!
    .clone()
    .addScaledVector(across, 0.12)
    .addScaledVector(inward, -0.12);
  const apron = [
    leftApron.clone().setY(apronHeight),
    rightApron.clone().setY(apronHeight),
    rightApron.setY(2.69),
    leftApron.setY(2.69),
  ];
  region = "desk";
  slab(apron, inward.clone().multiplyScalar(0.21), "wood", {
    front: [
      [524, 559],
      [1270, 610],
      [1268, 634],
      [524, 583],
    ],
  });
  region = "frame";
  function legJoint(index: number, y: number) {
    return legs[index]!.clone().setY(y);
  }

  function beam(from: Vector3, to: Vector3, width: number, depth: number) {
    const span = to.clone().sub(from);
    const angle = new Euler().setFromQuaternion(
      new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        span.clone().normalize(),
      ),
    );
    box(
      width,
      span.length() + 0.1,
      depth,
      "wood",
      from.clone().lerp(to, 0.5).toArray(),
      [angle.x, angle.y, angle.z],
    );
  }
  for (const [a, b] of [
    [0, 3],
    [1, 2],
    [3, 2],
  ] as const) {
    const from = legJoint(a, 2.76);
    const to = legJoint(b, 2.76);
    beam(from, to, 0.16, 0.19);
    for (const point of [from, to]) {
      box(0.28, 0.045, 0.24, "metal", [point.x, point.y - 0.105, point.z]);
      for (const dx of [-0.08, 0.08])
        screw([point.x + dx, point.y - 0.14, point.z], false);
    }
  }
  for (const z of [-0.82, 0.29, 1.28]) {
    box(6.6, 0.024, 0.022, "dark", [0.17, 2.933, z]);
    for (const x of [-3.06, 3.28]) screw([x, 2.911, z], false);
  }
  rod(
    legJoint(0, 2.39).toArray(),
    legJoint(0, 2.76)
      .add(new Vector3(0.7, 0, 0))
      .toArray(),
    0.023,
    "metal",
  );
  const lowShelfArt = pointsAt(
    [
      [538, 710],
      [743, 741],
      [825, 710],
      [621, 683],
    ],
    "y",
    1.21,
  );
  const lowShelf = rectangle(lowShelfArt, across, inward);
  const shelfInset = Math.max(
    0,
    Math.max(legs[0]!.dot(across), legs[3]!.dot(across)) -
      lowShelf[0].dot(across) -
      0.08,
  );
  lowShelf[0].addScaledVector(across, shelfInset);
  lowShelf[3].addScaledVector(across, shelfInset);
  solid(
    lowShelf,
    lowShelf.map((point) => point.clone().setY(1.09)),
    "wood",
  );
  beam(
    lowShelf[0].clone().setY(1.065),
    lowShelf[3].clone().setY(1.065),
    0.13,
    0.08,
  );
  beam(
    lowShelf[1].clone().setY(1.065),
    lowShelf[2].clone().setY(1.065),
    0.13,
    0.08,
  );
  beam(legJoint(0, 1.06), legJoint(3, 1.06), 0.14, 0.13);
  for (const [i, point] of lowShelf.entries()) {
    if (i === 2) continue;
    screw([point.x, 1.035, point.z], false);
  }

  region = "cabinet";
  // Recessed drawer fronts and a closed cabinet with a framed rear panel.
  const cabinetArt = pointsAt(
    [
      [998, 598],
      [1218, 620],
      [1218, 882],
      [998, 846],
    ],
    "z",
    1.118,
  );
  const cabinetFront = rectangle(cabinetArt, xAxis, down);
  const cabinetRearZ = -1.44;
  const cabinetBack = cabinetFront.map((point) =>
    point.clone().setZ(cabinetRearZ),
  );
  solid(cabinetFront, cabinetBack, "wood");
  panel(
    [
      [995, 601],
      [1018, 605],
      [1018, 846],
      [995, 842],
    ],
    1.15,
    0.11,
    "wood",
  );
  panel(
    [
      [1018, 827],
      [1218, 859],
      [1218, 881],
      [1018, 848],
    ],
    1.147,
    0.09,
    "wood",
  );
  const drawerFaces = [
    [
      [1018, 620],
      [1213, 642],
      [1213, 689],
      [1018, 660],
    ],
    [
      [1018, 664],
      [1213, 691],
      [1213, 740],
      [1018, 714],
    ],
    [
      [1018, 716],
      [1213, 742],
      [1213, 859],
      [1018, 825],
    ],
  ] as const;
  const drawerZ = 1.17;
  const drawerPanels = drawerFaces.map((face) => pointsAt(face, "z", drawerZ));
  const drawerLeft = 1.549263;
  const drawerRight = 3.392495;
  drawerPanels.forEach((source, i) => {
    const front = rectangle(source, xAxis, down);
    front.forEach((point, corner) => {
      point.x = corner === 0 || corner === 3 ? drawerLeft : drawerRight;
      if (i === 2) point.y = corner < 2 ? 1.688427 : 0.659576;
    });
    const finish = i === 2 ? "yellow" : "paper";
    slab(front, new Vector3(0, 0, -0.085), finish, { front: drawerFaces[i]! });
    const centerX = (drawerLeft + drawerRight) / 2;
    const centerY = (front[0].y + front[3].y) / 2;
    const width = drawerRight - drawerLeft;
    const height = front[0].y - front[3].y;
    const rim = 0.031;
    for (const y of [front[0].y - rim / 2, front[3].y + rim / 2])
      box(width, rim, 0.016, finish, [centerX, y, drawerZ + 0.005]);
    for (const x of [drawerLeft + rim / 2, drawerRight - rim / 2])
      box(rim, height - 2 * rim, 0.016, finish, [x, centerY, drawerZ + 0.005]);
    drawerPull(centerX, front[0].y - 0.143, drawerZ, 0.58, 0.067);
  });
  const [cabinetTopLeft, cabinetTopRight, cabinetBottomRight] = cabinetFront;
  const cabinetWidth = cabinetTopRight.x - cabinetTopLeft.x;
  const cabinetHeight = cabinetTopRight.y - cabinetBottomRight.y;
  const cabinetX = (cabinetTopLeft.x + cabinetTopRight.x) / 2;
  const cabinetY = (cabinetTopRight.y + cabinetBottomRight.y) / 2;
  const cabinetDepth = cabinetTopRight.z - cabinetRearZ;
  const sideX = cabinetTopRight.x + 0.019;
  const sideZ = (cabinetTopRight.z + cabinetRearZ) / 2;
  for (const z of [cabinetRearZ + 0.092, cabinetTopRight.z - 0.092])
    box(0.049, cabinetHeight - 0.11, 0.08, "wood", [sideX, cabinetY, z]);
  for (const y of [cabinetBottomRight.y + 0.095, cabinetTopRight.y - 0.095])
    box(0.049, 0.08, cabinetDepth - 0.26, "wood", [sideX, y, sideZ]);
  const frameZ = cabinetRearZ - 0.032;
  for (const x of [cabinetTopLeft.x + 0.12, cabinetTopRight.x - 0.12])
    box(0.08, cabinetHeight - 0.2, 0.075, "wood", [x, cabinetY, frameZ]);
  for (const y of [cabinetBottomRight.y + 0.13, cabinetTopRight.y - 0.13]) {
    box(cabinetWidth - 0.22, 0.08, 0.08, "wood", [cabinetX, y, frameZ]);
    for (const x of [cabinetTopLeft.x + 0.24, cabinetTopRight.x - 0.24])
      screw([x, y, frameZ - 0.047]);
  }
  for (const y of [cabinetBottomRight.y + 0.37, cabinetTopRight.y - 0.37]) {
    const x = cabinetTopRight.x - 0.24;
    box(0.21, 0.17, 0.032, "metal", [x, y, frameZ - 0.047]);
    cylinder(0.022, 0.022, 0.21, "dark", [x + 0.11, y, frameZ - 0.07]);
    for (const dx of [-0.05, 0.05]) screw([x + dx, y, frameZ - 0.067]);
  }

  const shelfTop = 6.139;
  const shelfBottom = 5.97;
  region = "board";
  // The holes are registered to the rows in the drawing and run through the board.
  const boardZ = -1.2;
  const boardFace = rectangle(
    pointsAt(
      [
        [701, 251],
        [1334, 239],
        [1334, 531],
        [697, 499],
      ],
      "z",
      boardZ,
    ),
    xAxis,
    down,
  );
  const [boardTopLeft, boardTopRight, boardBottomRight] = boardFace;
  boardTopLeft.y = boardTopRight.y = shelfBottom - 0.025;
  const columns = [
    717, 737, 758, 780, 802, 824, 846, 868, 890, 912, 935, 957, 981, 1006, 1030,
    1054, 1078, 1101, 1124, 1147, 1170, 1193, 1216, 1239, 1262, 1286, 1310,
    1334,
  ];
  const rows = [256, 281, 303, 325, 349, 373, 397, 421, 445, 469, 493, 516];
  const holes = rows.map((y, row) =>
    columns.map((x, col) => {
      const spread = col / (columns.length - 1);
      const inkY = y + (row - 5) * 1.1 * spread;
      const point = artworkPoint(
        [x + (row - 5) * 0.25 * spread, inkY],
        "z",
        boardZ,
      );
      return { x: point.x, y: point.y, radius: 0.015 + (col % 3) * 0.0015 };
    }),
  );
  const boardDepth = 0.11;
  const board = perforatedBoard(
    {
      left: boardTopLeft.x,
      right: boardTopRight.x,
      top: boardTopRight.y,
      bottom: boardBottomRight.y,
    },
    holes,
    boardDepth,
  );
  const boardOrigin = [0, 0, boardZ - boardDepth] as const;
  add(board.panel, "pegboard", boardOrigin, undefined, false);
  add(board.bores, "dark", boardOrigin, undefined, false);
  for (const [x, bottom, original] of [
    [
      boardTopLeft.x - 0.118,
      boardBottomRight.y,
      [
        [676, 246],
        [705, 249],
        [705, 585],
        [681, 588],
      ],
    ],
    [
      boardTopRight.x + 0.118,
      boardBottomRight.y - 0.34,
      [
        [1338, 239],
        [1360, 244],
        [1359, 600],
        [1338, 594],
      ],
    ],
  ] as const) {
    slab(
      [
        new Vector3(x - 0.12, shelfBottom, -1.095),
        new Vector3(x + 0.12, shelfBottom, -1.095),
        new Vector3(x + 0.12, bottom, -1.095),
        new Vector3(x - 0.12, bottom, -1.095),
      ],
      new Vector3(0, 0, -0.24),
      "wood",
      { front: original },
    );
  }
  box(boardTopRight.x - boardTopLeft.x, 0.06, 0.24, "wood", [
    (boardTopRight.x + boardTopLeft.x) / 2,
    shelfBottom - 0.03,
    -1.22,
  ]);
  const boardWidth = boardTopRight.x - boardTopLeft.x;
  const boardHeight = boardTopRight.y - boardBottomRight.y;
  const boardX = (boardTopLeft.x + boardTopRight.x) / 2;
  const boardY = (boardTopRight.y + boardBottomRight.y) / 2;
  const rails = [boardBottomRight.y + 0.09, boardTopRight.y - 0.09];
  for (const y of rails)
    box(boardWidth, 0.09, 0.09, "wood", [boardX, y, -1.345]);
  for (let i = -2; i <= 2; i++) {
    const x = boardX + (i * (boardWidth - 0.22)) / 4;
    if (Math.abs(i) < 2)
      box(0.085, boardHeight - 0.14, 0.065, "wood", [x, boardY, -1.347]);
    for (const y of rails) screw([x, y, -1.405]);
    box(0.145, 0.21, 0.032, "metal", [x, boardTopRight.y - 0.06, -1.397]);
  }
  region = "shelf";
  // A level shelf with separate front and rear overhangs on the board frame.
  const shelfLeft = new Vector3(-3.88, shelfTop, -0.49);
  const shelfRight = shelfLeft.clone().addScaledVector(across, 7.78);
  const shelf = [
    shelfLeft,
    shelfRight,
    shelfRight.clone().setY(shelfBottom),
    shelfLeft.clone().setY(shelfBottom),
  ];
  slab(shelf, inward.clone().multiplyScalar(1.47), "wood", {
    front: [
      [619, 233],
      [1318, 215],
      [1318, 232],
      [619, 250],
    ],
    sides: {
      1: [
        [1318, 215],
        [1318, 232],
        [1380, 241],
        [1380, 225],
      ],
    },
  });
  for (const point of [shelfLeft, shelfRight]) {
    const offset = point === shelfLeft ? 0.13 : -0.13;
    screw(
      point
        .clone()
        .addScaledVector(across, offset)
        .setY((shelfTop + shelfBottom) / 2)
        .toArray(),
    );
  }
  for (const x of [-3.35, 3.46]) {
    rod(
      [x, shelfBottom - 0.51, -1.12],
      [x, shelfBottom, -0.68],
      0.032,
      "metal",
    );
    box(0.075, 0.48, 0.07, "metal", [x, shelfBottom - 0.27, -1.21]);
    for (const z of [-1.19, -0.75]) screw([x, shelfBottom - 0.008, z], false);
  }
  region = "boardHardware";
  const lamp = rectangle(
    pointsAt(
      [
        [815, 258],
        [1079, 251],
        [1082, 273],
        [815, 282],
      ],
      "z",
      -0.76,
    ),
    xAxis,
    down,
  );
  const lampWidth = lamp[1].x - lamp[0].x;
  const lampX = (lamp[0].x + lamp[1].x) / 2;
  const lampHeight = lamp[0].y - lamp[3].y;
  const housingHeight = lampHeight * 0.58;
  const diffuserHeight = lampHeight * 0.51;
  box(lampWidth, housingHeight, 0.16, "metal", [
    lampX,
    lamp[0].y - housingHeight / 2,
    -0.84,
  ]);
  box(lampWidth - 0.16, diffuserHeight, 0.112, "paper", [
    lampX,
    lamp[3].y + diffuserHeight / 2,
    -0.805,
  ]);
  for (const x of [lamp[0].x + 0.24, lamp[1].x - 0.24])
    box(0.14, shelfBottom - lamp[0].y + 0.012, 0.11, "metal", [
      x,
      (lamp[0].y + shelfBottom) / 2,
      -0.83,
    ]);

  // Trace the drawn wrench heads and handles before giving them thickness.
  const wrenchProfile = [
    [-0.48, 0.012],
    [-0.23, 0],
    [-0.23, 0.077],
    [0.23, 0.077],
    [0.23, 0],
    [0.48, 0.012],
    [0.56, 0.084],
    [0.43, 0.146],
    [0.19, 0.175],
    [0.2, 0.81],
    [0.43, 0.852],
    [0.55, 0.921],
    [0.45, 0.98],
    [0.23, 1],
    [0.23, 0.93],
    [-0.23, 0.93],
    [-0.23, 1],
    [-0.45, 0.98],
    [-0.55, 0.921],
    [-0.43, 0.852],
    [-0.2, 0.81],
    [-0.19, 0.175],
    [-0.43, 0.146],
    [-0.56, 0.084],
  ] as const;
  function hookPoint(x: number, y: number, depth = -0.99): Point {
    return artworkPoint([x, y], "z", depth).toArray();
  }
  for (const [x, top, bottom, width] of [
    [888, 338, 470, 17],
    [910, 338, 455, 14],
    [931, 337, 440, 14],
    [954, 337, 433, 15],
    [978, 338, 430, 16],
  ] as const) {
    const outline = new Shape();
    for (const [i, [u, v]] of wrenchProfile.entries()) {
      const [px, py] = hookPoint(x + u * width, top + v * (bottom - top));
      if (i === 0) outline.moveTo(px, py);
      else outline.lineTo(px, py);
    }
    outline.closePath();
    add(
      new ExtrudeGeometry(outline, {
        depth: 0.05,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.006,
        bevelSegments: 1,
      }),
      "metal",
      [0, 0, -1.04],
    );
  }
  // Pliers, drivers and the hammer have working depth and separate metal jaws.
  for (const x of [738, 782]) {
    for (const side of [-1, 1]) {
      tube(
        [
          hookPoint(x + side * 12, 405),
          hookPoint(x + side * 9, 383),
          hookPoint(x + side * 3, 365),
        ],
        0.033,
        "dark",
      );
      tube(
        [
          hookPoint(x + side * 4, 367),
          hookPoint(x + side * 5, 350),
          hookPoint(x + side * 2, 327),
        ],
        0.027,
        "metal",
      );
    }
    cylinder(0.052, 0.052, 0.065, "metal", hookPoint(x, 363, -0.95), [
      Math.PI / 2,
      0,
      0,
    ]);
  }
  for (const [x, y, height] of [
    [823, 356, 38],
    [849, 351, 36],
    [1293, 428, 57],
    [1317, 440, 53],
  ] as const) {
    const from = new Vector3(...hookPoint(x, y + height / 2));
    const to = new Vector3(...hookPoint(x, y - height / 2));
    const axis = to.clone().sub(from).normalize();
    rod(from.toArray(), to.toArray(), 0.043, "dark");
    const shaftLength = from.distanceTo(
      new Vector3(...hookPoint(x, y + height / 2 + 38)),
    );
    rod(
      from.toArray(),
      from.clone().addScaledVector(axis, -shaftLength).toArray(),
      0.014,
      "metal",
    );
    for (const dy of [-10, -3, 5, 12]) {
      const distance = new Vector3(...hookPoint(x, y + dy)).sub(from).dot(axis);
      rod(
        from
          .clone()
          .addScaledVector(axis, distance - 0.005)
          .toArray(),
        from
          .clone()
          .addScaledVector(axis, distance + 0.005)
          .toArray(),
        0.045,
        "metal",
      );
    }
  }
  for (const [x, y, width, length] of [
    [1018, 343, 32, 70],
    [1065, 342, 16, 52],
    [1273, 350, 66, 132],
  ] as const) {
    rod(hookPoint(x, y + 4), hookPoint(x, y + length), 0.022, "metal");
    rod(
      hookPoint(x - width / 2, y),
      hookPoint(x + width / 2, y),
      0.045,
      "metal",
    );
    for (const dx of [-width / 2, width / 2])
      cylinder(0.055, 0.055, 0.045, "metal", hookPoint(x + dx, y), [
        0,
        0,
        Math.PI / 2,
      ]);
  }
  panel(
    [
      [1135, 376],
      [1226, 383],
      [1218, 431],
      [1137, 425],
    ],
    -0.82,
    0.27,
    "metal",
  );
  for (const [x, y] of [
    [1141, 360],
    [1152, 342],
    [1166, 338],
    [1180, 339],
    [1214, 337],
  ] as const)
    rod(
      hookPoint(x, 405, -0.95),
      hookPoint(x + (x - 1171) * 0.06, y, -0.93),
      0.019,
      "wood",
    );

  // Keep the spine ink on the books and build each storage pull once in depth.
  region = "shelfObjects";
  function onShelf(source: Quad<Vector3>) {
    const front = rectangle(source, xAxis, down);
    const lift = shelfTop - front[3].y;
    front.forEach((point) => (point.y += lift));
    return front;
  }
  const spines = [
    [
      [1105, 131],
      [1119, 130],
      [1117, 220],
      [1100, 221],
    ],
    [
      [1128, 117],
      [1142, 116],
      [1142, 220],
      [1125, 221],
    ],
    [
      [1142, 102],
      [1163, 102],
      [1163, 220],
      [1143, 220],
    ],
    [
      [1172, 109],
      [1190, 111],
      [1190, 219],
      [1171, 219],
    ],
  ] as const;
  spines.forEach((spine, i) => {
    const source = pointsAt(spine, "z", -0.77 - i * 0.018);
    slab(onShelf(source), new Vector3(0, 0, -0.5 - i * 0.035), "paper");
  });
  const organizerZ = -0.74;
  const organizer = onShelf(
    pointsAt(
      [
        [1204, 138],
        [1307, 132],
        [1307, 216],
        [1204, 218],
      ],
      "z",
      organizerZ,
    ),
  );
  solid(
    organizer,
    organizer.map((point) => point.clone().setZ(organizerZ - 0.53)),
    "wood",
  );
  const organizerX = (organizer[0].x + organizer[1].x) / 2;
  const organizerWidth = organizer[1].x - organizer[0].x;
  const organizerPitch = (organizer[0].y - shelfTop - 0.09) / 4;
  for (let row = 0; row < 4; row++) {
    const y = shelfTop + 0.045 + (row + 0.5) * organizerPitch;
    box(organizerWidth - 0.11, organizerPitch - 0.016, 0.035, "paper", [
      organizerX,
      y,
      organizerZ + 0.015,
    ]);
    drawerPull(organizerX, y, organizerZ + 0.033, 0.26, 0.045);
  }
  for (const [x, width] of [
    [762, 72],
    [842, 85],
  ] as const) {
    const frontZ = -0.76;
    const depth = 0.54;
    const front = onShelf(
      pointsAt(
        [
          [x, 166],
          [x + width, 163],
          [x + width, 225],
          [x, 227],
        ],
        "z",
        frontZ,
      ),
    );
    const centerX = (front[0].x + front[1].x) / 2;
    const centerZ = frontZ - depth / 2;
    const boxWidth = front[1].x - front[0].x;
    const height = front[0].y - shelfTop;
    const lidHeight = 0.095;
    box(boxWidth, height - lidHeight, depth, "wood", [
      centerX,
      shelfTop + (height - lidHeight) / 2,
      centerZ,
    ]);
    box(boxWidth + 0.028, lidHeight, depth + 0.028, "wood", [
      centerX,
      front[0].y - lidHeight / 2,
      centerZ,
    ]);
    drawerPull(centerX, shelfTop + height * 0.68, frontZ, 0.28, 0.052);
  }

  // The pot and both sides of the leaves use the same graphite grain as they turn.
  const pot = artworkPoint([724, 198], "z", -0.91).setY(shelfTop + 0.275);
  add(new CylinderGeometry(0.365, 0.315, 0.55, 24), "wood", pot.toArray());
  add(
    new TorusGeometry(0.36, 0.013, 8, 32),
    "wood",
    [pot.x, pot.y + 0.277, pot.z],
    [Math.PI / 2, 0, 0],
    false,
  );
  cylinder(0.349, 0.349, 0.012, "soil", [pot.x, pot.y + 0.277, pot.z]);
  const foliage = [
    [710, 70, 675, 55, 7],
    [716, 78, 736, 51, 7],
    [748, 94, 742, 61, 6],
    [753, 92, 797, 89, 7],
    [706, 81, 659, 84, 7],
    [714, 102, 682, 101, 7],
    [726, 119, 716, 88, 10],
    [746, 122, 772, 111, 7],
    [769, 129, 812, 130, 7],
    [743, 139, 790, 153, 7],
    [706, 124, 661, 120, 8],
    [687, 141, 647, 157, 7],
    [712, 149, 682, 160, 7],
    [736, 144, 756, 162, 6],
    [725, 133, 705, 128, 6],
  ] as const;
  foliage.forEach(([x, y, tipX, tipY, width], i) => {
    const depth = -0.97 + (i % 4) * 0.045;
    const dx = tipX - x;
    const dy = tipY - y;
    const length = Math.hypot(dx, dy);
    const offsetX = (-dy / length) * width;
    const offsetY = (dx / length) * width;
    const rim = [
      [0, 0],
      [0.31, 0.78],
      [0.64, 0.9],
      [1, 0],
      [0.63, -0.83],
      [0.29, -0.65],
    ];
    const face = rim.map(([t, s]) =>
      artworkPoint(
        [x + dx * t! + offsetX * s!, y + dy * t! + offsetY * s!],
        "z",
        depth + 0.035 * Math.sin(t! * Math.PI),
      ),
    );
    solid(
      face,
      face.map((point) => point.clone().setZ(point.z - 0.017)),
      "leaf",
    );
    const stem = face[0]!;
    tube(
      [
        [pot.x, pot.y + 0.27, pot.z],
        [
          (pot.x + stem.x) / 2,
          (pot.y + 0.27 + stem.y) / 2,
          (pot.z + stem.z) / 2 - 0.02,
        ],
        stem.toArray(),
      ],
      0.007,
      "dark",
    );
  });

  function keyboardKeys(
    backLeft: Vector3,
    right: Vector3,
    width: number,
    depth: number,
  ) {
    const rows = [
      Array<number>(14).fill(1),
      [1.5, ...Array<number>(11).fill(1), 1.5],
      [1.75, ...Array<number>(10).fill(1), 2.25],
      [2.25, ...Array<number>(9).fill(1), 2.75],
      [1.25, 1.25, 1.25, 5.25, 1.25, 1.25, 1.25, 1.25],
    ];
    const column = width / 14;
    const pitch = depth / rows.length;
    const forward = right.clone().cross(up);
    const rotation: Point = [0, Math.atan2(-right.z, right.x), 0];
    function at(x: number, y: number, z: number): Point {
      return backLeft
        .clone()
        .addScaledVector(right, x)
        .addScaledVector(forward, z)
        .addScaledVector(up, y)
        .toArray();
    }
    box(
      width + column * 0.14,
      0.012,
      depth + pitch * 0.12,
      "dark",
      at(width / 2, 0.004, depth / 2),
      rotation,
    );
    for (const [row, keys] of rows.entries()) {
      let start = 0;
      for (const units of keys) {
        box(
          (units - 0.16) * column,
          0.018,
          pitch * 0.76,
          "dark",
          at((start + units / 2) * column, 0.017, (row + 0.5) * pitch),
          rotation,
        );
        start += units;
      }
    }
  }

  region = "laptop";
  // Both laptop shells use the same hinge, with constant width and thickness.
  const laptopTop = 3.21;
  const [frontRight, frontLeft] = pointsAt(
    [
      [920, 530],
      [724, 545],
    ],
    "y",
    laptopTop,
  );
  const [hingeLeft, hingeRight] = pointsAt(
    [
      [681, 523],
      [867, 516],
    ],
    "y",
    laptopTop,
  );
  const laptopWidth = hingeLeft.distanceTo(hingeRight);
  const laptopRight = hingeRight.clone().sub(hingeLeft).normalize();
  const laptopForward = laptopRight.clone().cross(up);
  const laptopDepth =
    frontLeft
      .clone()
      .sub(hingeLeft)
      .add(frontRight)
      .sub(hingeRight)
      .dot(laptopForward) / 2;
  const laptopBase = [
    hingeLeft,
    hingeRight,
    hingeRight.clone().addScaledVector(laptopForward, laptopDepth),
    hingeLeft.clone().addScaledVector(laptopForward, laptopDepth),
  ];
  solid(
    laptopBase,
    laptopBase.map((point) => point.clone().setY(laptopTop - 0.08)),
    "metal",
  );
  keyboardKeys(
    hingeLeft
      .clone()
      .addScaledVector(laptopRight, laptopWidth * 0.085)
      .addScaledVector(laptopForward, laptopDepth * 0.085),
    laptopRight,
    laptopWidth * 0.83,
    laptopDepth * 0.48,
  );
  box(
    laptopWidth * 0.27,
    0.009,
    laptopDepth * 0.22,
    "paper",
    hingeLeft
      .clone()
      .addScaledVector(laptopRight, laptopWidth / 2)
      .addScaledVector(laptopForward, laptopDepth * 0.76)
      .setY(laptopTop + 0.003)
      .toArray(),
    [0, Math.atan2(-laptopRight.z, laptopRight.x), 0],
  );
  const lidArt = [
    artworkPoint([670, 398], "z", -0.36),
    artworkPoint([852, 396], "z", -0.36),
    hingeRight,
    hingeLeft,
  ] as const;
  const lidUp = up.clone().addScaledVector(laptopForward, -0.18).normalize();
  const lidNormal = laptopRight.clone().cross(lidUp);
  const lidHeight =
    lidArt[0].clone().sub(hingeLeft).add(lidArt[1]).sub(hingeRight).dot(lidUp) /
    2;
  const lid = [
    hingeLeft.clone().addScaledVector(lidUp, lidHeight),
    hingeRight.clone().addScaledVector(lidUp, lidHeight),
    hingeRight,
    hingeLeft,
  ];
  slab(lid, lidNormal.clone().multiplyScalar(-0.075), "metal", {
    front: [
      [670, 398],
      [852, 396],
      [867, 516],
      [681, 523],
    ],
  });
  rod(hingeLeft.toArray(), hingeRight.toArray(), 0.043, "metal");
  const lidOrientation = new Euler().setFromRotationMatrix(
    new Matrix4().makeBasis(laptopRight, lidUp, lidNormal),
  );
  const lidRotation: Point = [
    lidOrientation.x,
    lidOrientation.y,
    lidOrientation.z,
  ];
  function lidRear(x: number, y: number, depth: number): Point {
    return hingeLeft
      .clone()
      .addScaledVector(laptopRight, x)
      .addScaledVector(lidUp, y)
      .addScaledVector(lidNormal, -depth)
      .toArray();
  }
  for (let i = 0; i < 12; i++)
    box(
      0.06,
      0.012,
      0.015,
      "dark",
      lidRear((laptopWidth * (i + 2)) / 15, 0.14, 0.077),
      lidRotation,
    );
  box(
    0.36,
    0.16,
    0.012,
    "paper",
    lidRear(laptopWidth / 2, lidHeight * 0.54, 0.077),
    lidRotation,
  );

  region = "display";
  // Fit all four screen corners with a single rigid plane.
  const displayDepth = 0.12;
  const displayWidth = 2.048658;
  const displayHeight = 1.171991;
  const displayCenter = new Vector3(1.426579, 4.053988, -0.64);
  const displayRotation = new Euler(-0.291923, 0.040854, 0.033233);
  function displayPoint(x: number, y: number, z: number) {
    return new Vector3(x, y, z).applyEuler(displayRotation).add(displayCenter);
  }
  const display = (
    [
      [-1, 1],
      [1, 1],
      [1, -1],
      [-1, -1],
    ] as const
  ).map(([x, y]) =>
    displayPoint((x * displayWidth) / 2, (y * displayHeight) / 2, 0),
  );
  slab(
    display,
    new Vector3(0, 0, -displayDepth).applyEuler(displayRotation),
    "metal",
    {
      front: [
        [988, 379],
        [1188, 381],
        [1178, 501],
        [978, 495],
      ],
    },
  );

  const baseHeight = 0.045;
  const baseTop = tabletopHeight + baseHeight;
  const baseCenter = new Vector3(1.472954, baseTop, -0.828561);
  const plateRight = new Vector3(Math.cos(0.009477), 0, -Math.sin(0.009477));
  const plateInward = up.clone().cross(plateRight);
  const plate = (
    [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const
  ).map(([x, z]) =>
    baseCenter
      .clone()
      .addScaledVector(plateRight, (x * 0.776462) / 2)
      .addScaledVector(plateInward, (z * 0.762429) / 2),
  );
  slab(plate, new Vector3(0, -baseHeight, 0), "dark", {
    front: [
      [1040.5, 528],
      [1115.5, 534],
      [1141.5, 523],
      [1066, 517],
    ],
  });

  const stemBottom = baseCenter.clone().addScaledVector(plateInward, 0.038);
  const mount = displayPoint(0, -displayHeight * 0.38, -displayDepth);
  const stemTop = mount.y;
  box(0.268, stemTop - baseTop, 0.15, "dark", [
    stemBottom.x,
    (stemTop + baseTop) / 2,
    stemBottom.z,
  ]);
  const armDepth = Math.abs(mount.z - stemBottom.z) + 0.09;
  box(0.32, 0.14, armDepth, "dark", [
    mount.x,
    stemTop - 0.055,
    (mount.z + stemBottom.z) / 2,
  ]);
  const displayAngles: Point = [
    displayRotation.x,
    displayRotation.y,
    displayRotation.z,
  ];
  for (let i = 0; i < 8; i++)
    box(
      0.025,
      0.19,
      0.012,
      "dark",
      displayPoint((i - 3.5) * 0.1, 0.23, -displayDepth).toArray(),
      displayAngles,
    );
  box(
    0.39,
    0.24,
    0.014,
    "paper",
    displayPoint(0, -0.15, -displayDepth).toArray(),
    displayAngles,
  );
  for (const x of [-0.84, 0.84])
    for (const y of [-0.38, 0.38])
      screw(displayPoint(x, y, -displayDepth - 0.005).toArray());
  for (const x of [-0.41, -0.25, 0.25, 0.41])
    box(
      0.12,
      0.035,
      0.025,
      "dark",
      displayPoint(x, -0.44, -displayDepth).toArray(),
      displayAngles,
    );
  tube(
    [
      displayPoint(0.41, -0.44, -displayDepth - 0.03).toArray(),
      [stemBottom.x + 0.44, baseTop + 0.15, stemBottom.z - 0.14],
      [stemBottom.x + 0.47, baseTop + 0.02, stemBottom.z - 0.24],
      [stemBottom.x + 0.68, tabletopHeight + 0.021, stemBottom.z - 0.29],
    ],
    0.012,
    "dark",
  );

  region = "deskTools";
  const keyboard = pointsAt(
    [
      [1007, 540],
      [1100, 543],
      [1077, 560],
      [980, 553],
    ],
    "y",
    3.168,
  );
  const keyboardRight = keyboard[1]
    .clone()
    .sub(keyboard[0])
    .add(keyboard[2])
    .sub(keyboard[3])
    .normalize();
  const keyboardForward = keyboardRight.clone().cross(up);
  const keyboardFootprint = rectangle(keyboard, keyboardRight, keyboardForward);
  const keyboardWidth = keyboardFootprint[0].distanceTo(keyboardFootprint[1]);
  const keyboardDepth = keyboardWidth * 0.4;
  const keyboardCenter = keyboardFootprint[0]
    .clone()
    .lerp(keyboardFootprint[2], 0.5);
  box(
    keyboardWidth,
    0.038,
    keyboardDepth,
    "paper",
    [keyboardCenter.x, keyboardCenter.y - 0.019, keyboardCenter.z],
    [0, Math.atan2(-keyboardRight.z, keyboardRight.x), 0],
  );
  keyboardKeys(
    keyboardCenter
      .clone()
      .addScaledVector(keyboardRight, -keyboardWidth * 0.45)
      .addScaledVector(keyboardForward, -keyboardDepth * 0.42),
    keyboardRight,
    keyboardWidth * 0.9,
    keyboardDepth * 0.84,
  );
  const mouse = artworkPoint([1132, 556], "y", 3.17);
  add(
    new SphereGeometry(1, 18, 12).scale(0.16, 0.069, 0.21),
    "metal",
    mouse.toArray(),
    [0, 0.2, 0],
    false,
  );
  const pencilFrom = artworkPoint([902, 550], "y", 3.16);
  const pencilTo = artworkPoint([977, 531], "y", 3.16);
  rod(pencilFrom.toArray(), pencilTo.toArray(), 0.024, "wood");
  const lead = pencilFrom.clone().lerp(pencilTo, 0.09);
  rod(pencilFrom.toArray(), lead.toArray(), 0.013, "dark");

  region = "vise";
  // The vise's castings, jaws and screw share the same axis above the tabletop.
  const viseX = artworkPoint([1246, 530], "z", 0.69).x;
  function viseAt(x: number, height: number, depth: number): Point {
    return [viseX + x, tabletopHeight + height, depth];
  }
  function viseCasting(
    profile: readonly (readonly [number, number])[],
    width: number,
  ) {
    add(
      new ExtrudeGeometry(
        new Shape(profile.map(([z, y]) => new Vector2(z, y))),
        {
          depth: width,
          bevelThickness: 0.009,
          bevelSize: 0.009,
          bevelSegments: 1,
        },
      ),
      "metal",
      viseAt(width / 2, 0, 0),
      [0, -Math.PI / 2, 0],
    );
  }
  box(0.64, 0.08, 0.7, "metal", viseAt(0, 0.04, 0.6));
  cylinder(0.255, 0.272, 0.074, "dark", viseAt(0, 0.114, 0.56));
  cylinder(0.222, 0.24, 0.052, "metal", viseAt(0, 0.176, 0.56));
  for (const x of [-0.248, 0.248])
    for (const z of [0.32, 0.88]) screw(viseAt(x, 0.086, z), false);
  viseCasting(
    [
      [0.25, 0.198],
      [0.78, 0.198],
      [0.78, 0.416],
      [0.466, 0.504],
      [0.373, 0.714],
      [0.229, 0.714],
      [0.237, 0.49],
    ],
    0.42,
  );
  viseCasting(
    [
      [0.482, 0.352],
      [0.824, 0.352],
      [0.824, 0.495],
      [0.714, 0.586],
      [0.71, 0.714],
      [0.577, 0.714],
      [0.563, 0.553],
      [0.482, 0.493],
    ],
    0.4,
  );
  box(0.31, 0.142, 0.478, "dark", viseAt(0, 0.381, 0.588));
  for (const [z, facing] of [
    [0.305, 1],
    [0.645, -1],
  ] as const) {
    box(0.575, 0.09, 0.18, "metal", viseAt(0, 0.725, z));
    box(0.544, 0.072, 0.022, "dark", viseAt(0, 0.724, z + facing * 0.093));
    for (const y of [0.705, 0.724, 0.743])
      box(0.503, 0.004, 0.004, "metal", viseAt(0, y, z + facing * 0.105));
  }

  const screwHeight = 0.371;
  const screwDirection: Point = [Math.PI / 2, 0, 0];
  rod(
    viseAt(0, screwHeight, 0.746),
    viseAt(0, screwHeight, 1.077),
    0.043,
    "metal",
  );
  for (let i = 0; i < 5; i++)
    add(
      new TorusGeometry(0.046, 0.006, 5, 16),
      "metal",
      viseAt(0, screwHeight, 0.842 + i * 0.022),
      undefined,
      false,
    );
  cylinder(
    0.083,
    0.086,
    0.12,
    "metal",
    viseAt(0, screwHeight, 1.008),
    screwDirection,
  );
  cylinder(
    0.064,
    0.072,
    0.025,
    "dark",
    viseAt(0, screwHeight, 1.074),
    screwDirection,
  );
  const handleDepth = 1.04;
  const handleEnds = [0.058, 0.485] as const;
  rod(
    viseAt(0, handleEnds[0], handleDepth),
    viseAt(0, handleEnds[1], handleDepth),
    0.022,
    "metal",
  );
  for (const height of handleEnds)
    add(
      new SphereGeometry(0.032, 10, 7),
      "dark",
      viseAt(0, height, handleDepth),
      undefined,
      false,
    );

  region = "case";
  // Keep the dimensions from the drawing and shade each part in model space.
  const toolboxArt = pointsAt(
    [
      [588, 651],
      [712, 667],
      [711, 723],
      [591, 705],
    ],
    "z",
    0.89,
  );
  const toolboxSide = pointsAt(
    [
      [772, 641],
      [771, 698],
    ],
    "x",
    toolboxArt[1].x,
  );
  const toolboxFront = rectangle(toolboxArt, xAxis, down);
  const toolboxWidth = toolboxFront[1].x - toolboxFront[0].x;
  const toolboxFrontZ = toolboxFront[0].z;
  const toolboxRearZ = (toolboxSide[0].z + toolboxSide[1].z) / 2;
  const toolboxDepth = toolboxFrontZ - toolboxRearZ;
  const toolboxX = (toolboxFront[0].x + toolboxFront[1].x) / 2;
  const toolboxZ = (toolboxFrontZ + toolboxRearZ) / 2;
  const toolboxBottom = lowShelf[0].y;
  const toolboxTop = toolboxBottom + toolboxFront[0].y - toolboxFront[3].y;
  const toolboxLidHeight = 0.17;
  const lidBottom = toolboxTop - toolboxLidHeight;
  const seamHeight = 0.023;
  const bodyTop = lidBottom - seamHeight;
  box(toolboxWidth, bodyTop - toolboxBottom, toolboxDepth, "metal", [
    toolboxX,
    (bodyTop + toolboxBottom) / 2,
    toolboxZ,
  ]);
  box(toolboxWidth - 0.02, seamHeight, toolboxDepth - 0.02, "dark", [
    toolboxX,
    lidBottom - seamHeight / 2,
    toolboxZ,
  ]);
  box(toolboxWidth + 0.02, toolboxLidHeight, toolboxDepth + 0.02, "metal", [
    toolboxX,
    lidBottom + toolboxLidHeight / 2,
    toolboxZ,
  ]);
  for (const offset of [-0.5, 0.5]) {
    const x = toolboxX + offset;
    box(0.126, 0.238, 0.042, "dark", [
      x,
      lidBottom - 0.032,
      toolboxFrontZ + 0.02,
    ]);
    box(0.099, 0.282, 0.036, "metal", [
      x,
      toolboxTop - 0.135,
      toolboxFrontZ + 0.026,
    ]);
    screw([x, lidBottom - 0.079, toolboxFrontZ + 0.046]);
    box(0.105, 0.012, 0.17, "metal", [
      x,
      toolboxTop + 0.004,
      toolboxFrontZ - 0.067,
    ]);
  }
  const handleY = lidBottom - 0.084;
  const handleZ = toolboxFrontZ + 0.044;
  for (const offset of [-0.255, 0.255])
    box(0.114, 0.094, 0.047, "dark", [
      toolboxX + offset,
      handleY,
      toolboxFrontZ + 0.018,
    ]);
  tube(
    [
      [toolboxX - 0.255, handleY, handleZ],
      [toolboxX - 0.245, handleY - 0.112, handleZ + 0.07],
      [toolboxX - 0.172, handleY - 0.154, handleZ + 0.09],
      [toolboxX + 0.172, handleY - 0.154, handleZ + 0.09],
      [toolboxX + 0.245, handleY - 0.112, handleZ + 0.07],
      [toolboxX + 0.255, handleY, handleZ],
    ],
    0.028,
    "metal",
  );
  for (const x of [toolboxFront[0].x + 0.31, toolboxFront[1].x - 0.31])
    box(0.16, 0.11, 0.035, "metal", [x, lidBottom, toolboxRearZ - 0.014]);

  region = "stool";
  // A single beveled profile gives the seat the same finish around its rim.
  const [seatLeft, seatRight] = pointsAt(
    [
      [755.5, 696],
      [900.5, 698],
    ],
    "y",
    2.02,
  );
  const stoolCenter = seatLeft.clone().lerp(seatRight, 0.5);
  const seatRadius = seatLeft.distanceTo(seatRight) / 2;
  add(
    new LatheGeometry(
      [
        new Vector2(0, -0.14),
        new Vector2(seatRadius - 0.025, -0.14),
        new Vector2(seatRadius, -0.114),
        new Vector2(seatRadius, -0.026),
        new Vector2(seatRadius - 0.025, 0),
        new Vector2(0, 0),
      ],
      64,
    ),
    "seat",
    stoolCenter.toArray(),
  );
  const { x: stoolX, z: stoolZ } = stoolCenter;
  cylinder(0.056, 0.063, 1.61, "metal", [stoolX, 1.08, stoolZ]);
  cylinder(0.119, 0.132, 0.58, "metal", [stoolX, 0.77, stoolZ]);
  cylinder(0.133, 0.138, 0.047, "dark", [stoolX, 1.07, stoolZ]);
  cylinder(0.11, 0.13, 0.09, "dark", [stoolX, 1.84, stoolZ]);
  for (let i = 0; i < 11; i++)
    add(
      new TorusGeometry(0.065, 0.007, 5, 12),
      "metal",
      [stoolX, 1.12 + i * 0.047, stoolZ],
      [Math.PI / 2, 0, 0],
      false,
    );
  const ringRadius = 0.735;
  const ringHeight = 0.85;
  add(
    new TorusGeometry(ringRadius, 0.029, 9, 48),
    "metal",
    [stoolX, ringHeight, stoolZ],
    [Math.PI / 2, 0, 0],
  );
  const stoolFeet = pointsAt(
    [
      [724, 907],
      [927, 900],
      [839, 948],
      [830, 870],
    ],
    "y",
    floorHeight - 0.053,
  );
  for (const foot of stoolFeet) {
    const direction = foot.clone().sub(stoolCenter).setY(0).normalize();
    const spoke = stoolCenter
      .clone()
      .addScaledVector(direction, ringRadius)
      .setY(ringHeight);
    rod([stoolX, 0.31, stoolZ], [foot.x, 0.14, foot.z], 0.05, "metal");
    rod([stoolX, ringHeight, stoolZ], spoke.toArray(), 0.026, "metal");
    cylinder(0.055, 0.064, 0.15, "dark", [foot.x, 0.104, foot.z]);
    cylinder(0.084, 0.09, 0.04, "metal", [foot.x, floorHeight - 0.053, foot.z]);
  }

  return surfaces;
}

export function buildWorkbenchModel(atlas: Texture): WorkbenchModel {
  const surfaces = buildWorkbenchSurfaces();
  const group = new Group();
  group.name = "handcrafted-workbench";
  function dispose() {
    for (const child of group.children) {
      if (!(child instanceof Mesh) || Array.isArray(child.material)) continue;
      child.geometry.dispose();
      child.material.dispose();
    }
  }
  try {
    layoutWorkbenchAtlas(surfaces);
    const batches = new Map<WorkbenchFinish, BufferGeometry[]>();
    for (const { finish, geometry } of surfaces) {
      const batch = batches.get(finish) ?? [];
      batch.push(geometry);
      batches.set(finish, batch);
    }
    for (const [finish, geometries] of batches) {
      const geometry = mergeGeometries(geometries);
      if (!geometry) throw new Error("Incompatible workbench geometry");
      const material = new MeshBasicMaterial({ map: atlas, toneMapped: false });
      material.name = `graphite-${finish}`;
      group.add(new Mesh(geometry, material));
    }
  } catch (error) {
    dispose();
    throw error;
  } finally {
    surfaces.forEach(({ geometry }) => geometry.dispose());
  }
  return { group, dispose };
}
