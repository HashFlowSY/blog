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
  Path,
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
import { drawerActions, viseScrewPitch } from "./workbench-parts";
import {
  loftSurfaces,
  perforatedBoard,
  roundedProfile,
  solidSurfaces,
} from "./workbench-surfaces";
import { artworkPoint } from "./workbench-view";

import type {
  ArtworkQuad,
  ArtworkRegion,
  InkStroke,
  SurfaceProjection,
  WorkbenchSurface,
} from "./workbench-atlas";
import type { WorkbenchFinish } from "./workbench-materials";
import type {
  WorkbenchDevice,
  WorkbenchKeyContact,
  WorkbenchMouseContact,
  WorkbenchPart,
} from "./workbench-parts";
import type { ArtworkPoint } from "./workbench-view";
import type { Texture } from "three";

type Point = readonly [number, number, number];
type Finish = WorkbenchFinish;
type Quad<T> = readonly [T, T, T, T];
type SurfaceOptions = Partial<
  Omit<WorkbenchSurface, "geometry" | "finish" | "region">
> & { rotation?: Point };
interface SolidArtwork {
  front: ArtworkQuad;
}

const xAxis = new Vector3(1, 0, 0);
const up = new Vector3(0, 1, 0);
const down = new Vector3(0, -1, 0);
const origin = [0, 0, 0] as const;

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

interface PartSurface extends WorkbenchSurface {
  part?: WorkbenchPart;
  pivot?: Point;
  key?: WorkbenchKeyContact;
  mouse?: WorkbenchMouseContact;
}
export interface WorkbenchModel {
  group: Group;
  parts: ReadonlyMap<WorkbenchPart, Group>;
  keys: ReadonlyMap<WorkbenchPart, WorkbenchKeyContact>;
  mouse: ReadonlyMap<WorkbenchPart, WorkbenchMouseContact>;
  screens: ReadonlyMap<WorkbenchDevice, SurfaceProjection>;
  rightEdge: readonly [Vector3, Vector3];
  floorHeight: number;
  dispose(): void;
}

// The asset generator and the interactive view consume the same rigid solids.
export function buildWorkbenchSurfaces() {
  const surfaces: PartSurface[] = [];
  let part: WorkbenchPart | undefined;
  let pivot: Point | undefined;
  let mouseContact: WorkbenchMouseContact | undefined;
  function selectPart(
    next?: WorkbenchPart,
    center?: Point,
    contact?: WorkbenchMouseContact,
  ) {
    part = next;
    pivot = center;
    mouseContact = contact;
  }
  let region: ArtworkRegion = "desk";

  function add(
    geometry: BufferGeometry,
    finish: Finish,
    position: Point = origin,
    { rotation = origin, outline = true, ...details }: SurfaceOptions = {},
  ) {
    let key: WorkbenchKeyContact | undefined;
    if (part?.includes("-key-")) {
      geometry.computeBoundingBox();
      const size = geometry.boundingBox!.getSize(new Vector3());
      key = {
        center: [position[0], position[1] + size.y / 2, position[2]],
        width: size.x,
        depth: size.z,
        yaw: rotation[1],
      };
    }
    const matrix = new Matrix4()
      .makeRotationFromEuler(new Euler(...rotation))
      .setPosition(...position);
    const solid = geometry.index ? geometry.toNonIndexed() : geometry;
    solid.applyMatrix4(matrix);
    solid.clearGroups();
    surfaces.push({
      geometry: solid,
      finish,
      region,
      ...(part && { part }),
      ...(pivot && { pivot }),
      ...(key && { key }),
      ...(mouseContact && { mouse: mouseContact }),
      outline,
      ...details,
    });
    if (solid !== geometry) geometry.dispose();
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
      { rotation },
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
    add(new CylinderGeometry(top, bottom, height, 20, 1, open), finish, at, {
      rotation,
    });
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
      { rotation: [rotation.x, rotation.y, rotation.z] },
    );
  }
  function tube(
    points: Point[],
    radius: number,
    finish: Finish,
    sourceInk?: false,
  ) {
    const path = new CatmullRomCurve3(points.map((p) => new Vector3(...p)));
    const length = path.getLength();
    add(
      new TubeGeometry(
        path,
        Math.max(12, Math.min(48, Math.ceil(length * 13))),
        radius,
        radius < 0.013 ? 5 : 6,
        false,
      ),
      finish,
      origin,
      {
        outline: false,
        uvSize: [length, radius * 2 * Math.PI],
        ...(sourceInk === false && { sourceInk }),
      },
    );
  }
  function shapedSolid(
    rings: readonly (readonly Vector3[])[],
    finish: Finish,
    options: SurfaceOptions = {},
  ) {
    const { start, end, wall, uvSize } = loftSurfaces(rings);
    add(mergeGeometries([start, end])!, finish, origin, options);
    start.dispose();
    end.dispose();
    add(wall, finish, origin, { ...options, outline: false, uvSize });
  }
  function piercedPlate(
    outline: Vector2[],
    openings: readonly Vector2[][],
    depth: number,
  ) {
    const shape = new Shape(outline);
    shape.closePath();
    for (const opening of openings) {
      const hole = new Path(opening.slice().reverse());
      hole.closePath();
      shape.holes.push(hole);
    }
    return new ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  }
  function screw(at: Point, front = true) {
    add(new CylinderGeometry(0.026, 0.026, 0.016, 12), "metal", at, {
      rotation: front ? [Math.PI / 2, 0, 0] : origin,
    });
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
    const half = width / 2 - height * 0.26;
    const depth = height * 0.96;
    for (const side of [-1, 1])
      box(height * 0.74, height * 0.93, height * 0.33, "metal", [
        x + side * half,
        y,
        z + height * 0.16,
      ]);
    tube(
      [
        [x - half, y, z + height * 0.15],
        [x - half, y, z + depth * 0.7],
        [x - half + height * 0.37, y, z + depth],
        [x + half - height * 0.37, y, z + depth],
        [x + half, y, z + depth * 0.7],
        [x + half, y, z + height * 0.15],
      ],
      height * 0.234,
      "dark",
      false,
    );
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
    if (artwork)
      add(cap, finish, origin, {
        projection: { corners: front, pixels: artwork.front },
      });
    else plain.push(cap);
    plain.push(...sides);
    add(mergeGeometries(plain)!, finish);
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
  function deskPoint(x: number, y: number, z: number) {
    return deskCenter
      .clone()
      .addScaledVector(across, x)
      .addScaledVector(inward, z)
      .setY(y);
  }
  const tabletop = (
    [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const
  ).map(([x, z]) =>
    deskPoint((x * deskWidth) / 2, tabletopHeight, (z * deskDepth) / 2),
  );
  const apronHeight = 2.94;
  const deskStrokes: InkStroke[] = [];
  const undersideStrokes: InkStroke[] = [];
  const deskProfile = [
    [apronHeight, 0.018],
    [apronHeight + 0.006, 0.006],
    [apronHeight + 0.02, 0],
    [tabletopHeight - 0.02, 0],
    [tabletopHeight - 0.006, 0.006],
    [tabletopHeight, 0.018],
  ] as const;
  const desk = loftSurfaces(
    deskProfile.map(([y, inset]) =>
      roundedProfile(
        deskWidth - 2 * inset,
        deskDepth - 2 * inset,
        0.067 - inset,
      ).map((point) => deskPoint(point.x, y, point.y)),
    ),
  );
  add(desk.end, "wood", origin, {
    projection: {
      corners: tabletop,
      pixels: [
        [498, 540],
        [1271, 591],
        [1368, 530],
        [668, 499],
      ],
    },
    strokes: deskStrokes,
  });
  add(desk.start, "wood", origin, {
    strokes: undersideStrokes,
    sourceInk: false,
    outline: false,
  });
  add(desk.wall, "wood", origin, {
    uvSize: [14, desk.uvSize[1]],
    sourceInk: false,
    outline: false,
    strokes: tabletop.map((point, i) => ({
      from: point
        .clone()
        .lerp(tabletop[(i + 1) % 4]!, 0.012)
        .setY(tabletopHeight - 0.065)
        .toArray(),
      to: point
        .clone()
        .lerp(tabletop[(i + 1) % 4]!, 0.988)
        .setY(tabletopHeight - 0.065)
        .toArray(),
      width: 0.023,
      strength: 0.24,
    })),
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
  function angleBracket(at: Vector3, along: Vector3) {
    const across = along.clone().cross(up);
    const profile = [
      [0.004, -0.005],
      [0.195, -0.005],
      [0.195, -0.033],
      [0.056, -0.033],
      [0.031, -0.058],
      [0.031, -0.175],
      [0.004, -0.175],
    ] as const;
    shapedSolid(
      [-0.064, 0.064].map((offset) =>
        profile.map(([length, y]) =>
          at
            .clone()
            .addScaledVector(along, length)
            .addScaledVector(across, offset)
            .addScaledVector(up, y),
        ),
      ),
      "metal",
      { sourceInk: false },
    );
    screw(
      at
        .clone()
        .addScaledVector(along, 0.143)
        .addScaledVector(up, -0.045)
        .toArray(),
      false,
    );
    const fastener = at
      .clone()
      .addScaledVector(along, 0.033)
      .addScaledVector(up, -0.121);
    rod(
      fastener.toArray(),
      fastener.clone().addScaledVector(along, 0.012).toArray(),
      0.021,
      "dark",
    );
  }
  for (const [a, b] of [
    [0, 3],
    [1, 2],
    [3, 2],
  ] as const) {
    const railHeight = 0.184;
    const from = legJoint(a, apronHeight - railHeight / 2);
    const to = legJoint(b, from.y);
    const span = to.clone().sub(from);
    const along = span.clone().normalize();
    box(
      span.length(),
      railHeight,
      0.172,
      "wood",
      from.clone().lerp(to, 0.5).toArray(),
      [0, -Math.atan2(span.z, span.x), 0],
    );
    for (const [index, point, direction] of [
      [a, from, along],
      [b, to, along.clone().negate()],
    ] as const) {
      const halfPost = index === 0 || index === 3 ? 0.13 : 0.16;
      const edge = Math.min(
        halfPost / Math.abs(direction.x),
        0.11 / Math.abs(direction.z),
      );
      angleBracket(
        point
          .clone()
          .addScaledVector(direction, edge)
          .setY(apronHeight - railHeight),
        direction,
      );
    }
    undersideStrokes.push({
      from: from.clone().setY(apronHeight).toArray(),
      to: to.clone().setY(apronHeight).toArray(),
      width: 0.128,
      strength: 0.31,
    });
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
  const [cabinetTopLeft, cabinetTopRight, cabinetBottomRight] = cabinetFront;
  const cabinetRearZ = -1.44;
  const cabinetWidth = cabinetTopRight.x - cabinetTopLeft.x;
  const cabinetHeight = cabinetTopRight.y - cabinetBottomRight.y;
  const cabinetX = (cabinetTopLeft.x + cabinetTopRight.x) / 2;
  const cabinetY = (cabinetTopRight.y + cabinetBottomRight.y) / 2;
  const cabinetDepth = cabinetTopRight.z - cabinetRearZ;
  const sideZ = (cabinetTopRight.z + cabinetRearZ) / 2;
  const wall = 0.059;
  for (const x of [cabinetTopLeft.x + wall / 2, cabinetTopRight.x - wall / 2])
    add(
      new BoxGeometry(wall, cabinetHeight, cabinetDepth),
      "wood",
      [x, cabinetY, sideZ],
      { sourceInk: false },
    );
  for (const y of [
    cabinetBottomRight.y + wall / 2,
    cabinetTopRight.y - wall / 2,
  ])
    add(
      new BoxGeometry(cabinetWidth - wall * 2, wall, cabinetDepth),
      "wood",
      [cabinetX, y, sideZ],
      { sourceInk: false, outline: false },
    );
  add(
    new BoxGeometry(cabinetWidth - 2 * wall, cabinetHeight - wall * 2, 0.046),
    "wood",
    [cabinetX, cabinetY, cabinetRearZ + 0.037],
    { sourceInk: false },
  );
  // A recessed back keeps the drawer openings dark without blocking the trays.
  box(cabinetWidth - wall * 2, cabinetHeight - 0.12, 0.034, "dark", [
    cabinetX,
    cabinetY,
    cabinetRearZ + 0.36,
  ]);
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
    const centerX = (drawerLeft + drawerRight) / 2;
    const centerY = (front[0].y + front[3].y) / 2;
    const width = drawerRight - drawerLeft;
    const height = front[0].y - front[3].y;
    const pullY = front[0].y - 0.143;
    selectPart(drawerActions[i]!);
    const folds = loftSurfaces(
      (
        [
          [-0.091, 0.032],
          [-0.072, 0.009],
          [-0.023, 0],
          [0, 0.013],
        ] as const
      ).map(([depth, inset]) =>
        roundedProfile(
          width - 2 * inset,
          height - 2 * inset,
          0.047 - inset,
        ).map(
          ({ x, y }) => new Vector3(centerX + x, centerY + y, drawerZ + depth),
        ),
      ),
    );
    add(folds.end, finish, origin, {
      projection: { corners: front, pixels: drawerFaces[i]! },
      strokes: [
        {
          from: [drawerLeft + 0.065, front[3].y + 0.037, drawerZ],
          to: [drawerRight - 0.064, front[3].y + 0.037, drawerZ],
          width: 0.014,
          strength: 0.17,
        },
        {
          from: [centerX - 0.23, pullY - 0.046, drawerZ],
          to: [centerX + 0.23, pullY - 0.046, drawerZ],
          width: 0.047,
          strength: -0.085,
        },
      ],
    });
    add(folds.start, finish, origin, { sourceInk: false, outline: false });
    add(folds.wall, finish, origin, {
      sourceInk: false,
      uvSize: folds.uvSize,
      outline: false,
    });
    drawerPull(centerX, pullY, drawerZ, 0.58, 0.067);
    const trayWidth = width - 0.14;
    const trayDepth = 1.12;
    const trayHeight = height - 0.12;
    const trayY = front[3].y + 0.055;
    const trayZ = drawerZ - 0.078 - trayDepth / 2;
    box(trayWidth, 0.036, trayDepth, "wood", [centerX, trayY, trayZ]);
    box(trayWidth, trayHeight, 0.046, "wood", [
      centerX,
      trayY + trayHeight / 2,
      trayZ - trayDepth / 2 + 0.023,
    ]);
    for (const side of [-1, 1]) {
      box(0.046, trayHeight, trayDepth, "wood", [
        centerX + side * (trayWidth / 2 - 0.023),
        trayY + trayHeight / 2,
        trayZ,
      ]);
      box(0.025, 0.04, trayDepth, "metal", [
        centerX + side * (trayWidth / 2 + 0.005),
        trayY + 0.023,
        trayZ,
      ]);
    }
    selectPart();
    for (const side of [-1, 1]) {
      box(0.038, 0.04, 1.45, "dark", [
        centerX + side * (trayWidth / 2 + 0.037),
        trayY + 0.023,
        drawerZ - 0.89,
      ]);
    }
  });
  const sideX = cabinetTopRight.x + 0.019;
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
  for (const x of [cabinetTopLeft.x + 0.18, cabinetTopRight.x - 0.18]) {
    add(
      new BoxGeometry(0.13, 0.03, cabinetDepth - 0.22),
      "metal",
      [x, cabinetBottomRight.y - 0.015, sideZ],
      { sourceInk: false },
    );
    for (const z of [cabinetRearZ + 0.18, cabinetTopRight.z - 0.18]) {
      screw([x, cabinetBottomRight.y - 0.034, z], false);
      const top = Math.max(0.03, apronHeight - cabinetTopRight.y);
      box(0.19, top, 0.22, "metal", [x, apronHeight - top / 2, z]);
    }
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
  add(board.panel, "pegboard", boardOrigin, { outline: false });
  add(board.bores, "dark", boardOrigin, { outline: false });
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
  const shelfCenter = shelfLeft
    .clone()
    .lerp(shelfRight, 0.5)
    .addScaledVector(inward, 0.735);
  const shelf = loftSurfaces(
    (
      [
        [shelfBottom, 0.014],
        [shelfBottom + 0.016, 0],
        [shelfTop - 0.016, 0],
        [shelfTop, 0.014],
      ] as const
    ).map(([y, inset]) =>
      roundedProfile(7.78 - 2 * inset, 1.47 - 2 * inset, 0.047 - inset).map(
        ({ x, y: z }) =>
          shelfCenter
            .clone()
            .addScaledVector(across, x)
            .addScaledVector(inward, z)
            .setY(y),
      ),
    ),
  );
  add(shelf.end, "wood", origin, { outline: false });
  add(shelf.start, "wood", origin, { sourceInk: false, outline: false });
  add(shelf.wall, "wood", origin, {
    uvSize: [13, shelf.uvSize[1]],
    outline: false,
    sourceInk: false,
    strokes: [
      {
        from: shelfLeft
          .clone()
          .addScaledVector(across, 0.081)
          .setY(shelfTop - 0.061)
          .toArray(),
        to: shelfRight
          .clone()
          .addScaledVector(across, -0.081)
          .setY(shelfTop - 0.061)
          .toArray(),
        width: 0.013,
        strength: 0.19,
      },
    ],
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
    add(
      piercedPlate(
        [
          new Vector2(-1.24, -0.49),
          new Vector2(-0.676, -0.035),
          new Vector2(-0.652, 0),
          new Vector2(-1.24, 0),
        ],
        [
          [
            new Vector2(-1.194, -0.365),
            new Vector2(-0.826, -0.069),
            new Vector2(-1.194, -0.069),
          ],
        ],
        0.046,
      ),
      "metal",
      [x + 0.023, shelfBottom, 0],
      { rotation: [0, -Math.PI / 2, 0], sourceInk: false },
    );
    box(0.092, 0.473, 0.045, "metal", [x, shelfBottom - 0.253, -1.253]);
    box(0.102, 0.027, 0.597, "metal", [x, shelfBottom - 0.014, -0.948]);
    for (const z of [-1.19, -0.75]) screw([x, shelfBottom - 0.008, z], false);
  }
  region = "boardHardware";
  selectPart("lamp");
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
  selectPart("lamp-diffuser");
  box(lampWidth - 0.16, diffuserHeight, 0.112, "paper", [
    lampX,
    lamp[3].y + diffuserHeight / 2,
    -0.805,
  ]);
  selectPart("lamp");
  for (const x of [lamp[0].x + 0.24, lamp[1].x - 0.24])
    box(0.14, shelfBottom - lamp[0].y + 0.012, 0.11, "metal", [
      x,
      (lamp[0].y + shelfBottom) / 2,
      -0.83,
    ]);

  selectPart();
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
  const availableHoles = holes
    .flat()
    .filter(
      ({ x, y, radius }) =>
        x > boardTopLeft.x + radius &&
        x < boardTopRight.x - radius &&
        y > boardBottomRight.y + radius &&
        y < boardTopRight.y - radius,
    );
  function pegHook([x, y, z]: Point) {
    const hole = availableHoles.reduce((nearest, candidate) =>
      Math.hypot(x - candidate.x, y - candidate.y) <
      Math.hypot(x - nearest.x, y - nearest.y)
        ? candidate
        : nearest,
    );
    tube(
      [
        [hole.x, hole.y + 0.029, boardOrigin[2] - 0.063],
        [hole.x, hole.y, boardOrigin[2] - 0.029],
        [hole.x, hole.y, boardOrigin[2] - 0.012],
        [hole.x, hole.y, boardZ + 0.023],
        [hole.x, hole.y, boardZ + 0.046],
        [x, y - 0.022, z],
        [x, y + 0.009, z + 0.032],
      ],
      0.0096,
      "metal",
      false,
    );
  }
  for (const [x, top, bottom, width] of [
    [888, 338, 470, 17],
    [910, 338, 455, 14],
    [931, 337, 440, 14],
    [954, 337, 433, 15],
    [978, 338, 430, 16],
  ] as const) {
    selectPart();
    pegHook(hookPoint(x, top + 13, -1.04));
    selectPart(`wrench-${x}`, hookPoint(x, top + 13, -1.04));
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
    selectPart();
    pegHook(hookPoint(x, 362, -1.045));
    selectPart(`pliers-${x}`, hookPoint(x, 362, -1.045));
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
    selectPart();
    pegHook(hookPoint(x, y - 7, -1.048));
    selectPart(`driver-${x}`, hookPoint(x, y - 7, -1.048));
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
    selectPart();
    pegHook(hookPoint(x, y - 1, -1.045));
    selectPart(`hammer-${x}`, hookPoint(x, y - 1, -1.045));
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
  selectPart();
  const binFront = rectangle(
    pointsAt(
      [
        [1135, 376],
        [1226, 383],
        [1218, 431],
        [1137, 425],
      ],
      "z",
      -1.034,
    ),
    xAxis,
    down,
  );
  const binWidth = binFront[1].x - binFront[0].x;
  const binX = (binFront[0].x + binFront[1].x) / 2;
  const binBottom = binFront[3].y;
  const binTop = binFront[0].y;
  const binZ = -1.098;
  shapedSolid(
    (
      [
        [binBottom, binWidth - 0.12, 0.105],
        [binTop - 0.028, binWidth, 0.128],
        [binTop, binWidth + 0.014, 0.146],
        [binTop, binWidth - 0.06, 0.102],
        [binBottom + 0.029, binWidth - 0.17, 0.074],
      ] as const
    ).map(([y, width, depth]) =>
      roundedProfile(width, depth, 0.022, 2).map(
        ({ x, y: z }) => new Vector3(binX + x, y, binZ + z),
      ),
    ),
    "metal",
  );
  for (const x of [binX - binWidth * 0.31, binX + binWidth * 0.31])
    pegHook([x, binTop - 0.055, binZ - 0.055]);
  for (const [x, y] of [
    [1141, 360],
    [1152, 342],
    [1166, 338],
    [1180, 339],
    [1214, 337],
  ] as const)
    rod(
      hookPoint(x, 405, -1.082),
      hookPoint(x + (x - 1171) * 0.06, y, -1.002),
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
    const z = -0.77 - i * 0.023;
    const front = onShelf(pointsAt(spine, "z", z));
    const width = front[1].x - front[0].x;
    const height = front[0].y - shelfTop;
    const depth = 0.5 + i * 0.035;
    const x = (front[0].x + front[1].x) / 2;
    const y = shelfTop + height / 2;
    slab(front, new Vector3(0, 0, -0.047), "paper", { front: spine });
    for (const side of [-1, 1])
      add(
        new BoxGeometry(0.014, height, depth),
        "wood",
        [x + (side * (width - 0.014)) / 2, y, z - depth / 2],
        { sourceInk: false },
      );
    add(
      new BoxGeometry(width - 0.023, height - 0.035, depth - 0.041),
      "paper",
      [x, y, z - depth / 2 + 0.003],
      {
        sourceInk: false,
        outline: false,
        strokes: [-0.25, 0, 0.25].map((offset) => ({
          from: [
            x + width * offset,
            shelfTop + height - 0.0175,
            z - depth + 0.024,
          ],
          to: [x + width * offset, shelfTop + height - 0.0175, z - 0.049],
          width: 0.0038,
          strength: 0.21,
        })),
      },
    );
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
  add(
    new LatheGeometry(
      [
        [0, -0.275],
        [0.302, -0.275],
        [0.319, -0.253],
        [0.356, 0.222],
        [0.374, 0.237],
        [0.375, 0.272],
        [0.36, 0.287],
        [0.333, 0.285],
        [0.326, 0.259],
        [0.281, -0.212],
        [0, -0.212],
      ].map(([r, y]) => new Vector2(r, y)),
      28,
    ),
    "wood",
    pot.toArray(),
    { uvSize: [2.35, 1.15], outline: false },
  );
  cylinder(0.318, 0.317, 0.016, "soil", [pot.x, pot.y + 0.194, pot.z]);
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
    const depth = -1.083 + (i % 5) * 0.077;
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
        depth + 0.09 * Math.sin(t! * Math.PI) - 0.042 * Math.abs(s!),
      ),
    );
    selectPart(`leaf-${i}`, [pot.x, pot.y + 0.199, pot.z]);
    solid(
      face,
      face.map((point) => point.clone().setZ(point.z - 0.017)),
      "leaf",
    );
    const stem = face[0]!;
    tube(
      [
        [pot.x, pot.y + 0.199, pot.z],
        [
          (pot.x + stem.x) / 2,
          (pot.y + 0.199 + stem.y) / 2,
          (pot.z + stem.z) / 2 - 0.02,
        ],
        stem.toArray(),
      ],
      0.007,
      "dark",
    );
  });

  function keyboardKeys(
    device: WorkbenchDevice,
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
    let keyIndex = 0;
    for (const [row, keys] of rows.entries()) {
      let start = 0;
      for (const units of keys) {
        selectPart(
          row < 4 && keyIndex % 3 === 0 ? `${device}-key-${keyIndex}` : device,
        );
        keyIndex++;
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
  selectPart("laptop");
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
  const laptopCenter = hingeLeft
    .clone()
    .lerp(hingeRight, 0.5)
    .addScaledVector(laptopForward, laptopDepth / 2);
  function laptopDeck(x: number, y: number, z: number) {
    return laptopCenter
      .clone()
      .addScaledVector(laptopRight, x)
      .addScaledVector(laptopForward, z)
      .setY(y);
  }
  function deckRings(
    sections: readonly (readonly [height: number, inset: number])[],
  ) {
    return sections.map(([y, inset]) =>
      roundedProfile(
        laptopWidth - 2 * inset,
        laptopDepth - 2 * inset,
        0.071 - inset,
        2,
      ).map(({ x, y: z }) => laptopDeck(x, y, z)),
    );
  }
  shapedSolid(
    deckRings([
      [tabletopHeight, 0.042],
      [tabletopHeight + 0.014, 0.035],
      [laptopTop - 0.034, 0.035],
    ]),
    "dark",
    { sourceInk: false },
  );
  shapedSolid(
    deckRings([
      [laptopTop - 0.034, 0.017],
      [laptopTop - 0.019, 0],
      [laptopTop, 0.016],
    ]),
    "metal",
  );
  for (const side of [-1, 1]) {
    const sideRight = laptopForward.clone().multiplyScalar(-side);
    const normal = laptopRight.clone().multiplyScalar(side);
    const sideAngle = new Euler().setFromRotationMatrix(
      new Matrix4().makeBasis(sideRight, up, normal),
    );
    const slots = [-0.16, -0.012, 0.137].map((x, i) =>
      roundedProfile(i === 0 ? 0.106 : 0.072, 0.017, 0.005, 2).map((point) =>
        point.add(new Vector2(x, 0)),
      ),
    );
    add(
      piercedPlate(
        roundedProfile(laptopDepth * 0.59, 0.039, 0.011, 2),
        slots,
        0.021,
      ),
      "metal",
      laptopDeck(
        side * (laptopWidth / 2 - 0.036),
        tabletopHeight + 0.024,
        -0.043,
      ).toArray(),
      {
        rotation: [sideAngle.x, sideAngle.y, sideAngle.z],
        sourceInk: false,
      },
    );
  }
  keyboardKeys(
    "laptop",
    hingeLeft
      .clone()
      .addScaledVector(laptopRight, laptopWidth * 0.085)
      .addScaledVector(laptopForward, laptopDepth * 0.085),
    laptopRight,
    laptopWidth * 0.83,
    laptopDepth * 0.48,
  );
  add(
    new RoundedBoxGeometry(
      laptopWidth * 0.27,
      0.007,
      laptopDepth * 0.22,
      1,
      0.002,
    ),
    "metal",
    laptopDeck(0, laptopTop + 0.002, laptopDepth * 0.258).toArray(),
    {
      rotation: [0, Math.atan2(-laptopRight.z, laptopRight.x), 0],
      sourceInk: false,
      strokes: [
        {
          from: laptopDeck(
            -laptopWidth * 0.096,
            laptopTop + 0.0055,
            laptopDepth * 0.314,
          ).toArray(),
          to: laptopDeck(
            laptopWidth * 0.096,
            laptopTop + 0.0055,
            laptopDepth * 0.314,
          ).toArray(),
          width: 0.025,
          strength: -0.16,
        },
      ],
    },
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
  function lidPoint(x: number, y: number, depth: number) {
    return hingeLeft
      .clone()
      .addScaledVector(laptopRight, x)
      .addScaledVector(lidUp, y)
      .addScaledVector(lidNormal, -depth);
  }
  const lidProfile = loftSurfaces(
    (
      [
        [0.081, 0.041],
        [0.066, 0.016],
        [0.022, 0],
        [0, 0.014],
      ] as const
    ).map(([depth, inset]) =>
      roundedProfile(
        laptopWidth - 2 * inset,
        lidHeight - 2 * inset,
        0.063 - inset,
        3,
      ).map(({ x, y }) =>
        lidPoint(laptopWidth / 2 + x, lidHeight / 2 + y, depth),
      ),
    ),
  );
  selectPart("laptop-screen");
  add(lidProfile.end, "metal", origin, {
    projection: {
      corners: lid,
      pixels: [
        [670, 398],
        [852, 396],
        [867, 516],
        [681, 523],
      ],
    },
  });
  selectPart("laptop");
  add(lidProfile.start, "metal", origin, { sourceInk: false, outline: false });
  add(lidProfile.wall, "metal", origin, {
    sourceInk: false,
    uvSize: lidProfile.uvSize,
    outline: false,
  });
  rod(
    lidPoint(0.054, 0.014, 0.037).toArray(),
    lidPoint(laptopWidth - 0.054, 0.014, 0.037).toArray(),
    0.033,
    "dark",
  );
  for (const fraction of [0.13, 0.87]) {
    const x = laptopWidth * fraction;
    rod(
      lidPoint(x - 0.098, 0.014, 0.037).toArray(),
      lidPoint(x + 0.098, 0.014, 0.037).toArray(),
      0.043,
      "metal",
    );
    add(
      new RoundedBoxGeometry(0.176, 0.043, 0.126, 1, 0.01),
      "metal",
      laptopDeck(
        x - laptopWidth / 2,
        laptopTop - 0.021,
        -laptopDepth / 2 + 0.019,
      ).toArray(),
      {
        rotation: [0, Math.atan2(-laptopRight.z, laptopRight.x), 0],
        sourceInk: false,
      },
    );
  }

  region = "display";
  selectPart("display");
  // Fit all four screen corners with a single rigid plane.
  const displayWidth = 2.048658;
  const displayHeight = 1.171991;
  const displayCenter = new Vector3(1.426579, 4.053988, -0.64);
  const displayRotation = new Euler(-0.291923, 0.040854, 0.033233);
  function displayPoint(x: number, y: number, z: number) {
    return new Vector3(x, y, z).applyEuler(displayRotation).add(displayCenter);
  }
  const displayAngles: Point = [
    displayRotation.x,
    displayRotation.y,
    displayRotation.z,
  ];
  const screenCorners = [
    [-1, 1],
    [1, 1],
    [1, -1],
    [-1, -1],
  ] as const;
  const displayPixels: ArtworkQuad = [
    [988, 379],
    [1188, 381],
    [1178, 501],
    [978, 495],
  ];
  const displayCorners = (z: number) =>
    screenCorners.map(([x, y]) =>
      displayPoint((x * displayWidth) / 2, (y * displayHeight) / 2, z),
    );
  const screenWidth = displayWidth - 0.108;
  const screenHeight = displayHeight - 0.103;
  add(
    piercedPlate(
      roundedProfile(displayWidth, displayHeight, 0.028),
      [roundedProfile(screenWidth, screenHeight, 0.013)],
      0.023,
    ),
    "metal",
    displayPoint(0, 0, -0.023).toArray(),
    {
      rotation: displayAngles,
      projection: { corners: displayCorners(0), pixels: displayPixels },
    },
  );
  selectPart("display-screen");
  const screenDepth = -0.014;
  add(
    new BoxGeometry(screenWidth + 0.012, screenHeight + 0.012, 0.011),
    "paper",
    displayPoint(0, 0, screenDepth - 0.0055).toArray(),
    {
      rotation: displayAngles,
      outline: false,
      projection: {
        corners: displayCorners(screenDepth),
        pixels: displayPixels,
      },
    },
  );

  selectPart();
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
  const plateRings = loftSurfaces(
    [
      [tabletopHeight, 0.014],
      [tabletopHeight + 0.014, 0],
      [baseTop, 0.018],
    ].map(([y, inset]) =>
      roundedProfile(
        0.776462 - 2 * inset!,
        0.762429 - 2 * inset!,
        0.072 - inset!,
      ).map(({ x, y: z }) =>
        baseCenter
          .clone()
          .addScaledVector(plateRight, x)
          .addScaledVector(plateInward, z)
          .setY(y!),
      ),
    ),
  );
  add(plateRings.end, "dark", origin, {
    projection: {
      corners: plate,
      pixels: [
        [1040.5, 528],
        [1115.5, 534],
        [1141.5, 523],
        [1066, 517],
      ],
    },
  });
  add(plateRings.start, "dark", origin, { sourceInk: false, outline: false });
  add(plateRings.wall, "dark", origin, {
    uvSize: plateRings.uvSize,
    outline: false,
  });
  deskStrokes.push(
    ...plate.map((point, i) => ({
      from: point
        .clone()
        .lerp(plate[(i + 1) % 4]!, 0.08)
        .setY(tabletopHeight)
        .toArray(),
      to: point
        .clone()
        .lerp(plate[(i + 1) % 4]!, 0.92)
        .setY(tabletopHeight)
        .toArray(),
      width: 0.041,
      strength: 0.3,
    })),
  );

  selectPart("display");
  shapedSolid(
    (
      [
        [-0.12, displayWidth - 0.135, displayHeight - 0.14, 0.056],
        [-0.091, displayWidth - 0.028, displayHeight - 0.027, 0.045],
        [-0.025, displayWidth, displayHeight, 0.028],
      ] as const
    ).map(([z, width, height, radius]) =>
      roundedProfile(width, height, radius).map(({ x, y }) =>
        displayPoint(x, y, z),
      ),
    ),
    "metal",
    { sourceInk: false, outline: false },
  );

  function backProfile(
    width: number,
    height: number,
    radius: number,
    x: number,
    y: number,
  ) {
    return roundedProfile(width, height, radius, 2).map((point) =>
      point.add(new Vector2(x, y)),
    );
  }
  const vents = Array.from({ length: 7 }, (_, i) =>
    backProfile(0.067, 0.047, 0.013, (i - 3) * 0.106, 0.119),
  );
  const ports = backProfile(1.05, 0.144, 0.022, 0, -0.349);
  add(
    piercedPlate(
      backProfile(1.44, 0.655, 0.069, 0, -0.133),
      [...vents, ports],
      0.059,
    ),
    "metal",
    displayPoint(0, 0, -0.176).toArray(),
    { rotation: displayAngles, sourceInk: false },
  );
  const portSlots = [-0.34, -0.16, 0.16, 0.34];
  for (const x of portSlots) {
    add(
      new BoxGeometry(0.106, 0.047, 0.018),
      "dark",
      displayPoint(x, -0.35, -0.129).toArray(),
      { rotation: displayAngles, sourceInk: false },
    );
    add(
      new BoxGeometry(0.066, 0.01, 0.012),
      "metal",
      displayPoint(x, -0.356, -0.142).toArray(),
      { rotation: displayAngles, sourceInk: false },
    );
  }
  for (let i = -3; i <= 3; i++)
    add(
      new BoxGeometry(0.068, 0.045, 0.007),
      "dark",
      displayPoint(i * 0.106, 0.119, -0.121).toArray(),
      { rotation: displayAngles, sourceInk: false, outline: false },
    );

  selectPart();
  const stem = baseCenter.clone().addScaledVector(plateInward, 0.038);
  const mount = displayPoint(0, -0.188, -0.176);
  const stemTop = mount.y - 0.03;
  shapedSolid(
    (
      [
        [baseTop, 0.254, 0.159, 0],
        [baseTop + 0.042, 0.236, 0.142, 0],
        [stemTop - 0.067, 0.196, 0.133, 0.022],
        [stemTop, 0.18, 0.13, 0.042],
      ] as const
    ).map(([y, width, depth, back]) =>
      roundedProfile(width, depth, 0.027, 2).map(({ x, y: z }) =>
        stem
          .clone()
          .addScaledVector(plateRight, x)
          .addScaledVector(plateInward, z + back)
          .setY(y),
      ),
    ),
    "dark",
    { sourceInk: false },
  );
  const stemJoint = stem
    .clone()
    .addScaledVector(plateInward, 0.042)
    .setY(stemTop - 0.016);
  rod(stemJoint.toArray(), mount.toArray(), 0.072, "dark");
  const hinge = displayPoint(0, -0.188, -0.203);
  add(new CylinderGeometry(0.078, 0.078, 0.29, 18), "metal", hinge.toArray(), {
    rotation: [0, 0, Math.PI / 2],
    sourceInk: false,
  });
  for (const side of [-1, 1])
    rod(
      hinge
        .clone()
        .addScaledVector(xAxis, side * 0.141)
        .toArray(),
      hinge
        .clone()
        .addScaledVector(xAxis, side * 0.155)
        .toArray(),
      0.048,
      "dark",
    );

  const plug = displayPoint(0.34, -0.35, -0.169);
  add(new BoxGeometry(0.087, 0.041, 0.078), "dark", plug.toArray(), {
    rotation: displayAngles,
    sourceInk: false,
  });
  const rearEdge = deskPoint(1.79, tabletopHeight + 0.019, deskDepth / 2);
  const cableX = rearEdge.x;
  const rail = legJoint(3, apronHeight - 0.184).lerp(
    legJoint(2, apronHeight - 0.184),
    0.64,
  );
  const power = rail.clone().addScaledVector(up, -0.043);
  const powerInlet = power.clone().addScaledVector(xAxis, 0.316);
  add(
    new RoundedBoxGeometry(0.626, 0.09, 0.145, 1, 0.016),
    "dark",
    power.toArray(),
    { sourceInk: false },
  );
  for (const x of [-0.19, 0, 0.19])
    add(
      new BoxGeometry(0.088, 0.04, 0.009),
      "metal",
      [power.x + x, power.y, power.z - 0.074],
      { sourceInk: false },
    );
  for (const x of [-0.25, 0.25])
    screw([power.x + x, power.y - 0.053, power.z], false);
  const rearBend = rearEdge
    .clone()
    .addScaledVector(inward, 0.116)
    .setY(apronHeight + 0.047);
  tube(
    [
      displayPoint(0.34, -0.35, -0.21).toArray(),
      [plug.x + 0.048, plug.y - 0.073, -1.032],
      [cableX, tabletopHeight + 0.078, -1.08],
      [cableX, rearEdge.y, -1.164],
      [cableX, rearEdge.y, -1.22],
      [cableX, rearEdge.y, -1.34],
      rearEdge.toArray(),
      rearEdge
        .clone()
        .addScaledVector(inward, 0.086)
        .setY(tabletopHeight - 0.03)
        .toArray(),
      rearBend.toArray(),
      rearBend
        .clone()
        .setY(power.y - 0.025)
        .toArray(),
      powerInlet
        .clone()
        .addScaledVector(xAxis, 0.13)
        .setY(power.y - 0.035)
        .toArray(),
      powerInlet.toArray(),
    ],
    0.012,
    "dark",
    false,
  );
  const clip = rearEdge
    .clone()
    .addScaledVector(inward, 0.024)
    .setY(apronHeight + 0.047);
  add(new BoxGeometry(0.108, 0.068, 0.042), "metal", clip.toArray(), {
    sourceInk: false,
  });
  rod(
    clip.clone().addScaledVector(inward, 0.02).toArray(),
    rearBend.clone().addScaledVector(inward, -0.02).toArray(),
    0.019,
    "metal",
  );
  add(
    piercedPlate(
      roundedProfile(0.061, 0.058, 0.015, 2),
      [roundedProfile(0.033, 0.034, 0.013, 2)],
      0.022,
    ),
    "metal",
    rearBend.clone().addScaledVector(up, 0.011).toArray(),
    { rotation: [Math.PI / 2, 0, 0], sourceInk: false },
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
  selectPart("display");
  box(
    keyboardWidth,
    0.038,
    keyboardDepth,
    "paper",
    [keyboardCenter.x, keyboardCenter.y - 0.019, keyboardCenter.z],
    [0, Math.atan2(-keyboardRight.z, keyboardRight.x), 0],
  );
  keyboardKeys(
    "display",
    keyboardCenter
      .clone()
      .addScaledVector(keyboardRight, -keyboardWidth * 0.45)
      .addScaledVector(keyboardForward, -keyboardDepth * 0.42),
    keyboardRight,
    keyboardWidth * 0.9,
    keyboardDepth * 0.84,
  );
  selectPart();
  const mouse = artworkPoint([1132, 556], "y", 3.17).setY(tabletopHeight);
  const mouseYaw = 0.19;
  const mouseRight = new Vector3(Math.cos(mouseYaw), 0, -Math.sin(mouseYaw));
  function mousePoint(x: number, y: number, z: number) {
    return new Vector3(x, y, z).applyAxisAngle(up, mouseYaw).add(mouse);
  }
  function mouseShell(
    sections: readonly (readonly [
      height: number,
      width: number,
      depth: number,
      radius: number,
      offset: number,
    ])[],
    finish: Finish,
  ) {
    shapedSolid(
      sections.map(([height, width, depth, radius, offset]) =>
        roundedProfile(width, depth, radius, 5).map(({ x, y }) =>
          mousePoint(x, height, y + offset),
        ),
      ),
      finish,
      { sourceInk: false },
    );
  }
  mouseShell(
    [
      [0.006, 0.301, 0.407, 0.112, 0],
      [0.015, 0.326, 0.443, 0.128, 0],
      [0.038, 0.337, 0.45, 0.133, 0],
      [0.053, 0.316, 0.424, 0.119, 0],
    ],
    "dark",
  );
  mouseShell(
    [
      [0.048, 0.323, 0.209, 0.055, 0.113],
      [0.073, 0.328, 0.207, 0.057, 0.113],
      [0.107, 0.29, 0.188, 0.054, 0.104],
      [0.127, 0.227, 0.145, 0.052, 0.088],
      [0.133, 0.132, 0.089, 0.037, 0.078],
      [0.137, 0.064, 0.048, 0.02, 0.074],
      [0.138, 0.02, 0.017, 0.007, 0.073],
    ],
    "metal",
  );
  for (const z of [-0.149, 0.152])
    box(0.17, 0.009, 0.042, "dark", mousePoint(0, 0.0045, z).toArray(), [
      0,
      mouseYaw,
      0,
    ]);
  add(
    new CylinderGeometry(0.036, 0.036, 0.027, 24).rotateZ(Math.PI / 2),
    "dark",
    mousePoint(0, 0.091, -0.105).toArray(),
    { rotation: [0, mouseYaw, 0], sourceInk: false },
  );
  for (let i = 0; i < 16; i++) {
    const angle = (i * Math.PI) / 8;
    add(
      new BoxGeometry(0.027, 0.0035, 0.006).rotateX(angle),
      "metal",
      mousePoint(
        0,
        0.091 + Math.cos(angle) * 0.036,
        -0.105 + Math.sin(angle) * 0.036,
      ).toArray(),
      { rotation: [0, mouseYaw, 0], sourceInk: false, outline: false },
    );
  }
  const buttonProfile = [
    [0.016, 0.012],
    [0.102, 0.011],
    [0.14, -0.014],
    [0.157, -0.046],
    [0.154, -0.113],
    [0.143, -0.163],
    [0.122, -0.194],
    [0.091, -0.211],
    [0.056, -0.218],
    [0.017, -0.211],
  ] as const;
  for (const [side, id] of [
    [-1, "mouse-left"],
    [1, "mouse-right"],
  ] as const) {
    const profile = buttonProfile.map(([x, z]) => new Vector2(x * side, z));
    if (side === -1) profile.reverse();
    const center = new Vector2(0.076 * side, -0.092);
    const cap = profile.map((point) => point.clone().lerp(center, 0.065));
    const top = cap.map(({ x, y: z }) =>
      mousePoint(x, 0.079 + (z + 0.218) * 0.15, z),
    );
    selectPart(id, mousePoint(0, 0.085, 0.013).toArray(), {
      outline: top.map((point) =>
        point.clone().addScaledVector(up, 0.0017).toArray(),
      ),
      axis: mouseRight.toArray(),
    });
    shapedSolid(
      [
        profile.map(({ x, y: z }) =>
          mousePoint(x, 0.055 + (z + 0.218) * 0.12, z),
        ),
        profile.map(({ x, y: z }) =>
          mousePoint(x, 0.068 + (z + 0.218) * 0.15, z),
        ),
        top,
      ],
      "metal",
      { sourceInk: false },
    );
  }
  selectPart();
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
    const corners = profile.map(([z, y]) => new Vector2(z, y));
    const center = corners
      .reduce((sum, point) => sum.add(point), new Vector2())
      .divideScalar(corners.length);
    const outline = corners.flatMap((point, i) => {
      const before = point
        .clone()
        .lerp(corners[(i - 1 + corners.length) % corners.length]!, 0.18);
      const after = point
        .clone()
        .lerp(corners[(i + 1) % corners.length]!, 0.18);
      return [
        before,
        before
          .clone()
          .lerp(point, 0.5)
          .lerp(point.clone().lerp(after, 0.5), 0.5),
        after,
      ];
    });
    shapedSolid(
      (
        [
          [-0.5, 0.86],
          [-0.455, 0.955],
          [-0.34, 1],
          [0.34, 1],
          [0.455, 0.955],
          [0.5, 0.86],
        ] as const
      ).map(([x, scale]) =>
        outline.map((point) => {
          const { x: z, y } = point
            .clone()
            .sub(center)
            .multiplyScalar(scale)
            .add(center);
          return new Vector3(...viseAt(x * width, y, z));
        }),
      ),
      "metal",
    );
  }
  shapedSolid(
    (
      [
        [0, 0.59, 0.657],
        [0.013, 0.645, 0.71],
        [0.059, 0.645, 0.71],
        [0.08, 0.602, 0.667],
      ] as const
    ).map(([height, width, depth]) =>
      roundedProfile(width, depth, 0.078).map(
        ({ x, y: z }) => new Vector3(...viseAt(x, height, z + 0.6)),
      ),
    ),
    "metal",
  );
  cylinder(0.255, 0.272, 0.074, "dark", viseAt(0, 0.114, 0.56));
  cylinder(0.225, 0.246, 0.056, "metal", viseAt(0, 0.178, 0.56));
  for (const x of [-0.248, 0.248]) {
    for (const z of [0.36, 0.84]) {
      screw(viseAt(x, 0.075, z), false);
      add(
        new CylinderGeometry(0.029, 0.034, 0.025, 6),
        "metal",
        [viseX + x, apronHeight - 0.0125, z],
        { sourceInk: false },
      );
    }
    deskStrokes.push({
      from: viseAt(x * 1.3, 0, 0.36),
      to: viseAt(x * 1.3, 0, 0.84),
      width: 0.045,
      strength: 0.28,
    });
  }
  deskStrokes.push(
    {
      from: viseAt(-0.89, 0, 0.54),
      to: viseAt(-0.44, 0, 0.76),
      width: 0.009,
      strength: 0.22,
    },
    {
      from: viseAt(-0.72, 0, 0.57),
      to: viseAt(-0.45, 0, 0.68),
      width: 0.008,
      strength: 0.17,
    },
  );
  viseCasting(
    [
      [0.25, 0.198],
      [0.78, 0.198],
      [0.78, 0.416],
      [0.51, 0.469],
      [0.423, 0.545],
      [0.371, 0.71],
      [0.221, 0.71],
      [0.237, 0.49],
    ],
    0.42,
  );
  selectPart("vise-slide");
  viseCasting(
    [
      [0.482, 0.352],
      [0.824, 0.352],
      [0.824, 0.495],
      [0.751, 0.55],
      [0.714, 0.586],
      [0.71, 0.714],
      [0.577, 0.714],
      [0.563, 0.553],
      [0.482, 0.493],
    ],
    0.4,
  );
  box(0.292, 0.126, 0.514, "dark", viseAt(0, 0.379, 0.585));
  for (const x of [-0.146, 0.146])
    add(new BoxGeometry(0.014, 0.034, 0.373), "metal", viseAt(x, 0.405, 0.58), {
      sourceInk: false,
      outline: false,
    });
  for (const [z, facing] of [
    [0.305, 1],
    [0.645, -1],
  ] as const) {
    selectPart(facing === -1 ? "vise-slide" : undefined);
    box(0.552, 0.083, 0.172, "metal", viseAt(0, 0.716, z));
    add(
      new RoundedBoxGeometry(0.53, 0.067, 0.024, 1, 0.006),
      "dark",
      viseAt(0, 0.719, z + facing * 0.086),
      {
        sourceInk: false,
        strokes: [0.698, 0.715, 0.733].map((y) => ({
          from: viseAt(-0.246, y, z + facing * 0.098),
          to: viseAt(0.246, y, z + facing * 0.098),
          width: 0.0045,
          strength: -0.23,
        })),
      },
    );
  }

  selectPart("vise-stock");
  shapedSolid(
    (
      [
        [0.684, 0.208],
        [0.773, 0.224],
        [0.781, 0.215],
      ] as const
    ).map(([height, width]) =>
      roundedProfile(width, 0.144, 0.009, 2).map(
        ({ x, y: z }) => new Vector3(...viseAt(x + 0.245, height, z + 0.475)),
      ),
    ),
    "wood",
    {
      sourceInk: false,
      strokes: [
        {
          from: viseAt(0.259, 0.781, 0.417),
          to: viseAt(0.264, 0.781, 0.533),
          width: 0.007,
          strength: 0.32,
        },
      ],
    },
  );

  const screwHeight = 0.371;
  const screwDirection: Point = [Math.PI / 2, 0, 0];
  selectPart("vise-handle", viseAt(0, screwHeight, 1.04));
  cylinder(
    0.038,
    0.038,
    0.69,
    "metal",
    viseAt(0, screwHeight, 0.717),
    screwDirection,
  );
  const threadedLength = 0.638;
  const threadSteps = Math.ceil((threadedLength / viseScrewPitch) * 18);
  const viseThread = new CatmullRomCurve3(
    Array.from({ length: threadSteps + 1 }, (_, i) => {
      const depth = (i / threadSteps) * threadedLength;
      const angle = (depth / viseScrewPitch) * Math.PI * 2;
      return new Vector3(
        ...viseAt(
          0.039 * Math.cos(angle),
          screwHeight + 0.039 * Math.sin(angle),
          0.404 + depth,
        ),
      );
    }),
  );
  add(
    new TubeGeometry(viseThread, threadSteps, 0.0062, 6, false),
    "metal",
    origin,
    {
      outline: false,
      sourceInk: false,
      uvSize: [viseThread.getLength(), 0.0062 * Math.PI * 2],
    },
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
  selectPart("vise-grip");
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
      { outline: false },
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
  function caseRings(
    sections: readonly (readonly [height: number, inset: number])[],
  ) {
    return sections.map(([y, inset]) =>
      roundedProfile(
        toolboxWidth - 2 * inset,
        toolboxDepth - 2 * inset,
        0.097 - inset,
        3,
      ).map(({ x, y: z }) => new Vector3(toolboxX + x, y, toolboxZ + z)),
    );
  }
  selectPart("case-base");
  shapedSolid(
    caseRings([
      [toolboxBottom + 0.026, 0.062],
      [toolboxBottom + 0.052, 0.032],
      [bodyTop - 0.051, 0.022],
      [bodyTop - 0.025, 0],
      [bodyTop, 0.007],
      [bodyTop, 0.054],
      [toolboxBottom + 0.07, 0.078],
    ]),
    "dark",
    {
      sourceInk: false,
      strokes: [
        {
          from: [toolboxX - 0.65, bodyTop - 0.05, toolboxFrontZ - 0.014],
          to: [toolboxX - 0.51, bodyTop - 0.085, toolboxFrontZ - 0.014],
          width: 0.015,
          strength: -0.18,
        },
      ],
    },
  );
  box(0.046, 0.12, toolboxDepth - 0.18, "dark", [
    toolboxX + 0.28,
    toolboxBottom + 0.13,
    toolboxZ,
  ]);
  const lidHinge: Point = [toolboxX, lidBottom - 0.007, toolboxRearZ - 0.039];
  selectPart("case-lid", lidHinge);
  shapedSolid(
    caseRings([
      [bodyTop, 0.027],
      [lidBottom, 0.026],
    ]),
    "dark",
    { sourceInk: false, outline: false },
  );
  shapedSolid(
    caseRings([
      [lidBottom, 0.009],
      [lidBottom + 0.023, -0.009],
      [toolboxTop - 0.037, -0.006],
      [toolboxTop, 0.035],
    ]),
    "metal",
    { sourceInk: false },
  );
  for (const z of [-toolboxDepth * 0.28, toolboxDepth * 0.27]) {
    selectPart("case-lid", lidHinge);
    add(
      new RoundedBoxGeometry(toolboxWidth - 0.16, 0.023, 0.087, 1, 0.008),
      "metal",
      [toolboxX, toolboxTop + 0.005, toolboxZ + z],
      { sourceInk: false },
    );
    selectPart("case-base");
    for (const x of [-toolboxWidth * 0.32, toolboxWidth * 0.32])
      add(
        new RoundedBoxGeometry(0.15, 0.039, 0.142, 1, 0.012),
        "dark",
        [toolboxX + x, toolboxBottom + 0.0195, toolboxZ + z],
        { sourceInk: false },
      );
  }
  for (const offset of [-0.5, 0.5]) {
    const x = toolboxX + offset;
    selectPart("case-base");
    const pivot = lidBottom - 0.119;
    add(
      new BoxGeometry(0.124, 0.167, 0.043),
      "dark",
      [x, pivot + 0.01, toolboxFrontZ + 0.002],
      { sourceInk: false },
    );
    selectPart("case-lid", lidHinge);
    add(
      new BoxGeometry(0.122, 0.049, 0.053),
      "metal",
      [x, lidBottom + 0.062, toolboxFrontZ + 0.017],
      { sourceInk: false },
    );
    selectPart("case-base");
    add(
      new CylinderGeometry(0.023, 0.023, 0.143, 12),
      "metal",
      [x, pivot, toolboxFrontZ + 0.035],
      { rotation: [0, 0, Math.PI / 2], sourceInk: false },
    );
    selectPart("case-latches", [toolboxX, pivot, toolboxFrontZ + 0.035]);
    tube(
      [
        [x - 0.044, pivot, toolboxFrontZ + 0.037],
        [x - 0.044, lidBottom + 0.047, toolboxFrontZ + 0.068],
        [x - 0.032, lidBottom + 0.068, toolboxFrontZ + 0.044],
        [x + 0.032, lidBottom + 0.068, toolboxFrontZ + 0.044],
        [x + 0.044, lidBottom + 0.047, toolboxFrontZ + 0.068],
        [x + 0.044, pivot, toolboxFrontZ + 0.037],
      ],
      0.011,
      "metal",
      false,
    );
    add(
      new RoundedBoxGeometry(0.078, 0.118, 0.034, 1, 0.01),
      "metal",
      [x, pivot - 0.026, toolboxFrontZ + 0.055],
      { sourceInk: false },
    );
  }
  selectPart("case-base");
  const handleY = lidBottom - 0.084;
  const handleZ = toolboxFrontZ + 0.044;
  for (const offset of [-0.255, 0.255])
    add(
      new BoxGeometry(0.114, 0.094, 0.047),
      "metal",
      [toolboxX + offset, handleY, toolboxFrontZ + 0.018],
      { sourceInk: false },
    );
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
    false,
  );
  for (const x of [toolboxFront[0].x + 0.31, toolboxFront[1].x - 0.31]) {
    const z = toolboxRearZ - 0.017;
    for (const y of [lidBottom - 0.056, lidBottom + 0.057]) {
      selectPart(
        y > lidBottom ? "case-lid" : "case-base",
        y > lidBottom ? lidHinge : undefined,
      );
      add(new BoxGeometry(0.177, 0.08, 0.038), "metal", [x, y, z], {
        sourceInk: false,
      });
    }
    selectPart("case-base");
    for (const dx of [-0.061, 0, 0.061])
      add(
        new CylinderGeometry(0.026, 0.026, 0.05, 10),
        dx === 0 ? "dark" : "metal",
        [x + dx, lidBottom - 0.007, z - 0.022],
        { rotation: [0, 0, Math.PI / 2], sourceInk: false },
      );
    rod(
      [x - 0.09, lidBottom - 0.007, z - 0.022],
      [x + 0.09, lidBottom - 0.007, z - 0.022],
      0.012,
      "metal",
    );
  }

  region = "stool";
  selectPart("stool");
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
        new Vector2(seatRadius - 0.045, -0.14),
        new Vector2(seatRadius - 0.011, -0.122),
        new Vector2(seatRadius, -0.096),
        new Vector2(seatRadius, -0.024),
        new Vector2(seatRadius - 0.008, -0.009),
        new Vector2(seatRadius - 0.05, -0.003),
        new Vector2(seatRadius * 0.63, 0.009),
        new Vector2(0, 0.011),
      ],
      64,
    ),
    "seat",
    stoolCenter.toArray(),
    { uvSize: [4.7, 1.55] },
  );
  const { x: stoolX, z: stoolZ } = stoolCenter;
  cylinder(0.056, 0.063, 1.61, "metal", [stoolX, 1.08, stoolZ]);
  cylinder(0.119, 0.132, 0.58, "metal", [stoolX, 0.77, stoolZ]);
  cylinder(0.133, 0.138, 0.047, "dark", [stoolX, 1.07, stoolZ]);
  cylinder(0.123, 0.141, 0.082, "dark", [stoolX, 1.813, stoolZ]);
  cylinder(0.272, 0.231, 0.041, "metal", [stoolX, 1.863, stoolZ]);
  for (const [x, z] of [
    [0.175, 0],
    [-0.175, 0],
    [0, 0.175],
    [0, -0.175],
  ])
    add(
      new CylinderGeometry(0.021, 0.024, 0.026, 6),
      "dark",
      [stoolX + x!, 1.836, stoolZ + z!],
      { sourceInk: false },
    );
  const thread = new CatmullRomCurve3(
    Array.from({ length: 106 }, (_, i) => {
      const angle = (i / 10) * Math.PI * 2;
      return new Vector3(
        stoolX + Math.cos(angle) * 0.064,
        1.113 + i * 0.0046,
        stoolZ + Math.sin(angle) * 0.064,
      );
    }),
  );
  add(new TubeGeometry(thread, 126, 0.0065, 5, false), "metal", origin, {
    uvSize: [thread.getLength(), 0.043],
    outline: false,
    sourceInk: false,
  });
  const ringRadius = 0.735;
  const ringHeight = 0.85;
  add(
    new TorusGeometry(ringRadius, 0.029, 9, 48),
    "metal",
    [stoolX, ringHeight, stoolZ],
    { rotation: [Math.PI / 2, 0, 0] },
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
  cylinder(0.126, 0.137, 0.119, "metal", [stoolX, 0.291, stoolZ]);
  for (const foot of stoolFeet) {
    const radial = foot.clone().sub(stoolCenter).setY(0);
    const direction = radial.clone().normalize();
    const across = direction.clone().cross(up);
    const spoke = stoolCenter
      .clone()
      .addScaledVector(direction, ringRadius)
      .setY(ringHeight);
    shapedSolid(
      (
        [
          [0.08, 0.302, 0.141, 0.098],
          [0.34, 0.274, 0.137, 0.092],
          [0.78, 0.195, 0.105, 0.068],
          [1.008, 0.148, 0.091, 0.062],
        ] as const
      ).map(([distance, height, width, depth]) =>
        roundedProfile(width, depth, 0.017, 2).map(({ x, y }) =>
          stoolCenter
            .clone()
            .addScaledVector(radial, distance)
            .addScaledVector(across, x)
            .setY(height + y),
        ),
      ),
      "metal",
      { sourceInk: false },
    );
    rod([stoolX, ringHeight, stoolZ], spoke.toArray(), 0.026, "metal");
    cylinder(0.059, 0.066, 0.115, "metal", [foot.x, 0.117, foot.z]);
    cylinder(0.076, 0.089, 0.038, "dark", [
      foot.x,
      floorHeight - 0.054,
      foot.z,
    ]);
  }

  return surfaces;
}

export function buildWorkbenchModel(atlas: Texture): WorkbenchModel {
  const surfaces = buildWorkbenchSurfaces();
  const group = new Group();
  group.name = "handcrafted-workbench";
  const parts = new Map<WorkbenchPart, Group>();
  const keys = new Map<WorkbenchPart, WorkbenchKeyContact>();
  const mouse = new Map<WorkbenchPart, WorkbenchMouseContact>();
  const screens = new Map<WorkbenchDevice, SurfaceProjection>();
  const materials = new Set<MeshBasicMaterial>();

  function makeMaterial(name: string) {
    const material = new MeshBasicMaterial({ map: atlas, toneMapped: false });
    material.name = name;
    materials.add(material);
    return material;
  }

  function batch(geometries: BufferGeometry[], material: MeshBasicMaterial) {
    const geometry = mergeGeometries(geometries);
    if (!geometry) throw new Error("Incompatible workbench geometry");
    return new Mesh(geometry, material);
  }

  function dispose() {
    group.traverse((child) => {
      if (child instanceof Mesh) child.geometry.dispose();
    });
    materials.forEach((material) => material.dispose());
  }

  let floorHeight = Infinity;
  let rightEdge: readonly [Vector3, Vector3] | undefined;
  try {
    layoutWorkbenchAtlas(surfaces);
    const fixed = new Map<WorkbenchFinish, BufferGeometry[]>();
    const movable = new Map<WorkbenchPart, BufferGeometry[]>();
    for (const surface of surfaces) {
      const { finish, geometry, part, pivot, key, projection, region } =
        surface;
      if (region === "frame") {
        geometry.computeBoundingBox();
        floorHeight = Math.min(floorHeight, geometry.boundingBox!.min.y);
      }
      if (!rightEdge && region === "desk" && projection) {
        rightEdge = [projection.corners[1]!, projection.corners[2]!];
      }
      if (!part) {
        const geometries = fixed.get(finish) ?? [];
        geometries.push(geometry);
        fixed.set(finish, geometries);
        continue;
      }

      let body = parts.get(part);
      if (!body) {
        body = new Group();
        body.name = part;
        parts.set(part, body);
        group.add(body);
      }
      if (pivot && !body.pivot) body.pivot = new Vector3(...pivot);
      if (key) keys.set(part, key);
      if (surface.mouse) mouse.set(part, surface.mouse);
      if (part === "laptop-screen" && projection)
        screens.set("laptop", projection);
      if (part === "display-screen" && projection)
        screens.set("display", projection);
      const geometries = movable.get(part) ?? [];
      geometries.push(geometry);
      movable.set(part, geometries);
    }

    for (const [finish, geometries] of fixed) {
      group.add(batch(geometries, makeMaterial(`graphite-${finish}`)));
    }
    const graphite = makeMaterial("graphite-parts");
    for (const [part, geometries] of movable) {
      const mesh = batch(
        geometries,
        part === "lamp-diffuser" ? makeMaterial("graphite-diffuser") : graphite,
      );
      mesh.userData["part"] = part;
      parts.get(part)!.add(mesh);
    }
    if (!rightEdge || !Number.isFinite(floorHeight))
      throw new Error("Missing workbench reference planes");
  } catch (error) {
    dispose();
    throw error;
  } finally {
    surfaces.forEach(({ geometry }) => geometry.dispose());
  }
  return {
    group,
    parts,
    keys,
    mouse,
    screens,
    rightEdge,
    floorHeight,
    dispose,
  };
}
