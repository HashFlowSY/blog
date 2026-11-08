import {
  BackSide,
  BoxGeometry,
  type BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  EdgesGeometry,
  Euler,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  LineBasicMaterial,
  LineSegments,
  Matrix3,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Path,
  PlaneGeometry,
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

import {
  createGraphiteMaterial,
  createIllustrationMaterial,
  illustrationProjection,
  mapIllustration,
} from "./workbench-materials";

import type { IllustrationQuad, WorkbenchFinish } from "./workbench-materials";
import type { Material, Texture } from "three";

type Point = readonly [number, number, number];
type Finish = WorkbenchFinish;

export interface WorkbenchModel {
  group: Group;
  partCount: number;
  dispose(): void;
}

// The workbench is built from closed solids in world space, including its rear
// and underside. Static geometry is batched by material to keep orbiting light.
export function buildWorkbenchModel(
  graphite: Texture,
  screens: Texture,
): WorkbenchModel {
  const group = new Group();
  group.name = "handcrafted-workbench";
  group.scale.x = 1.2;
  const finishes: Finish[] = [
    "wood",
    "paper",
    "metal",
    "dark",
    "yellow",
    "leaf",
    "soil",
  ];
  const materials = new Map(
    finishes.map((finish) => [
      finish,
      createGraphiteMaterial(finish, graphite),
    ]),
  );
  const batches = new Map<Material, BufferGeometry[]>();
  const illustrationMaterial = createIllustrationMaterial(screens);
  const outlines: BufferGeometry[] = [];
  let partCount = 0;

  function add(
    geometry: BufferGeometry,
    finish: Finish | Material,
    position: Point,
    rotation: Point = [0, 0, 0],
    scale: Point = [1, 1, 1],
    outline = true,
  ) {
    const material =
      typeof finish === "string" ? materials.get(finish)! : finish;
    const matrix = new Matrix4().compose(
      new Vector3(...position),
      new Quaternion().setFromEuler(new Euler(...rotation)),
      new Vector3(...scale),
    );
    if (outline)
      outlines.push(new EdgesGeometry(geometry, 28).applyMatrix4(matrix));
    const solid = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    solid.applyMatrix4(matrix);
    solid.clearGroups();
    const batch = batches.get(material) ?? [];
    batch.push(solid);
    batches.set(material, batch);
    geometry.dispose();
    partCount++;
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
      [0, 0, 0],
      [1, 1, 1],
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
  function handle(x: number, y: number, z: number, width: number) {
    tube(
      [
        [x - width / 2, y, z],
        [x - width / 2, y - 0.06, z + 0.09],
        [x + width / 2, y - 0.06, z + 0.09],
        [x + width / 2, y, z],
      ],
      0.018,
      "metal",
    );
  }

  // Planked top, four legs, aprons, lower braces and bolted feet.
  for (let i = 0; i < 3; i++)
    box(6.6, 0.22, 0.92, "wood", [0, 3.02, -0.93 + i * 0.94]);
  for (const x of [-2.94, 2.94])
    for (const z of [-1.08, 1.08]) {
      box(0.19, 2.85, 0.19, "wood", [x, 1.47, z]);
      box(0.37, 0.06, 0.36, "metal", [x, 0.07, z]);
      box(0.33, 0.065, 0.32, "metal", [x, 2.9, z]);
      for (const y of [0.25, 2.57, 2.78]) screw([x, y, z + 0.102]);
    }
  for (const z of [-1.12, 1.12]) box(6.03, 0.26, 0.14, "wood", [0, 2.76, z]);
  for (const x of [-2.94, 2.94]) box(0.14, 0.26, 2.2, "wood", [x, 2.76, 0]);
  box(5.9, 0.13, 0.13, "metal", [0, 0.47, -1.08]);
  box(0.13, 0.13, 2.15, "metal", [-2.94, 0.47, 0]);
  // A low shelf supports the tool case.
  box(2.55, 0.12, 1.8, "wood", [-1.53, 0.65, 0]);

  // Three drawers match the pencil original, including its yellow bottom drawer.
  box(1.64, 2.55, 2.12, "wood", [2.02, 1.55, 0.03]);
  const drawers = [
    { y: 2.48, h: 0.52 },
    { y: 1.9, h: 0.52 },
    { y: 0.94, h: 1.28 },
  ];
  drawers.forEach(({ y, h }, i) => {
    box(1.47, h, 0.085, i === 2 ? "yellow" : "paper", [2.02, y, 1.125]);
    for (const x of [1.34, 2.7]) screw([x, y, 1.174]);
  });
  for (const y of [0.45, 2.65])
    box(1.49, 0.08, 0.035, "metal", [2.02, y, -1.05]);
  for (const x of [1.34, 2.7])
    for (const y of [0.46, 2.65]) screw([x, y, -1.08]);
  // Recessed side and rear panels, joinery and hinges remain detailed at 180°.
  const drawerArt: IllustrationQuad[] = [
    [
      [1043, 620],
      [1223, 640],
      [1223, 682],
      [1043, 662],
    ],
    [
      [1044, 669],
      [1223, 690],
      [1223, 729],
      [1044, 707],
    ],
    [
      [1043, 716],
      [1223, 738],
      [1223, 860],
      [1043, 830],
    ],
  ];
  drawers.forEach(({ y, h }, i) => {
    const quad = drawerArt[i]!;
    illustration(1.45, h - 0.025, quad, [2.02, y, 1.17]);
    // Position the real bar over its drawn counterpart, leaving the original
    // pencil shadow underneath instead of adding a second, floating handle.
    const { a, b, c, d, e, f, g, h: projectH } = illustrationProjection(quad);
    const inverse = new Matrix3()
      .set(a, b, c, d, e, f, g, projectH, 1)
      .invert();
    const sourceY = [645, 685, 740][i]!;
    const uv = new Vector3(1130 / 1536, 1 - sourceY / 1024, 1).applyMatrix3(
      inverse,
    );
    uv.divideScalar(uv.z);
    const handleX = 2.02 + (uv.x - 0.5) * 1.45;
    const handleY = y + (0.5 - uv.y) * (h - 0.025);
    box(0.47, 0.035, 0.045, "metal", [handleX, handleY, 1.245]);
    for (const side of [-1, 1])
      box(0.025, 0.04, 0.07, "metal", [
        handleX + side * 0.225,
        handleY + 0.015,
        1.2,
      ]);
  });
  illustration(
    1.7,
    2.1,
    [
      [1276, 627],
      [1337, 596],
      [1336, 790],
      [1275, 866],
    ],
    [2.848, 1.54, 0.03],
    [0, Math.PI / 2, 0],
  );
  for (const x of [1.18, 2.86]) {
    for (const z of [-0.84, 0.9]) box(0.035, 2.18, 0.075, "wood", [x, 1.54, z]);
    for (const y of [0.44, 2.63]) box(0.035, 0.075, 1.81, "wood", [x, y, 0.03]);
  }
  for (const x of [1.33, 2.71])
    box(0.07, 2.16, 0.065, "wood", [x, 1.54, -1.065]);
  for (const y of [0.48, 2.59])
    box(1.4, 0.075, 0.065, "wood", [2.02, y, -1.065]);
  for (const x of [1.36, 2.68])
    for (const y of [0.72, 2.35]) {
      box(0.12, 0.17, 0.025, "metal", [x, y, -1.094]);
      cylinder(0.022, 0.022, 0.21, "metal", [x + 0.055, y, -1.114]);
    }

  // Perforated board: the holes go through the extruded board, not a decal.
  const board = new Shape();
  board.moveTo(-3.07, 3.18);
  board.lineTo(3.07, 3.18);
  board.lineTo(3.07, 5.92);
  board.lineTo(-3.07, 5.92);
  board.closePath();
  for (let row = 0; row < 9; row++)
    for (let col = 0; col < 20; col++) {
      const hole = new Path();
      hole.absarc(
        -2.88 + col * 0.303,
        3.34 + row * 0.303,
        0.024,
        0,
        Math.PI * 2,
        true,
      );
      board.holes.push(hole);
    }
  add(
    new ExtrudeGeometry(board, {
      depth: 0.11,
      bevelEnabled: false,
      curveSegments: 5,
    }),
    "paper",
    [0, 0, -1.31],
  );
  for (const x of [-3.04, 3.04]) {
    box(0.13, 3.13, 0.18, "wood", [x, 4.47, -1.36]);
    for (const y of [3.26, 4.53, 5.78]) screw([x, y, -1.185]);
  }
  // Rear framing, board seams and exposed fasteners; holes stay genuinely open.
  for (const y of [3.22, 5.86]) box(6.05, 0.1, 0.1, "wood", [0, y, -1.375]);
  box(0.08, 2.55, 0.1, "wood", [0, 4.53, -1.375]);
  for (const x of [-2.9, -1.52, 0, 1.52, 2.9])
    for (const y of [3.24, 5.84]) screw([x, y, -1.44]);
  box(6.55, 0.16, 0.8, "wood", [0, 6.02, -1.04]);
  for (const x of [-2.8, 2.8]) {
    rod([x, 5.48, -1.23], [x, 5.94, -0.7], 0.035, "metal");
    box(0.07, 0.5, 0.07, "metal", [x, 5.69, -1.26]);
  }
  for (const x of [-2.75, 2.75]) {
    box(0.13, 0.13, 0.48, "metal", [x, 5.92, -0.99]);
    for (const z of [-1.15, -0.81]) screw([x, 6.108, z], false);
  }
  // Shelf light has an actual housing and a translucent pale front.
  box(2.35, 0.12, 0.2, "metal", [0.05, 5.82, -1.01]);
  box(2.18, 0.045, 0.14, "paper", [0.05, 5.75, -0.99]);

  // Extruded open-ended wrenches.
  function wrench(x: number, y: number, size: number) {
    const outline = new Shape();
    const points = [
      [0.04, 0],
      [0.07, 0.12],
      [0.045, 0.56],
      [0.13, 0.67],
      [0.14, 0.82],
      [0.07, 0.85],
      [0.07, 0.72],
      [-0.07, 0.72],
      [-0.07, 0.85],
      [-0.14, 0.82],
      [-0.13, 0.67],
      [-0.045, 0.56],
      [-0.07, 0.12],
      [-0.04, 0],
    ];
    points.forEach(([px, py], i) => {
      if (i === 0) outline.moveTo(px! * size * 0.65, py! * size);
      else outline.lineTo(px! * size * 0.65, py! * size);
    });
    outline.closePath();
    const ring = new Path();
    ring.absarc(0, 0.1 * size, 0.024 * size, 0, Math.PI * 2, true);
    outline.holes.push(ring);
    add(
      new ExtrudeGeometry(outline, {
        depth: 0.045,
        bevelEnabled: true,
        bevelSize: 0.006,
        bevelThickness: 0.006,
        bevelSegments: 1,
      }),
      "metal",
      [x, y, -1.12],
    );
  }
  for (let i = 0; i < 6; i++)
    wrench(-0.9 + i * 0.34, 4.04 + (i % 2) * 0.07, 1.15 + (i % 3) * 0.1);
  // Pliers, drivers and a small hammer are solid pieces with handles and jaws.
  for (const x of [-2.62, -2.14]) {
    for (const side of [-1, 1]) {
      tube(
        [
          [x + side * 0.1, 4.2, -1.05],
          [x + side * 0.15, 4.43, -1.035],
          [x + side * 0.055, 4.66, -1.05],
        ],
        0.035,
        "dark",
      );
      box(
        0.055,
        0.26,
        0.07,
        "metal",
        [x + side * 0.05, 4.8, -1.04],
        [0, 0, -side * 0.16],
      );
    }
    cylinder(0.06, 0.06, 0.075, "metal", [x, 4.64, -1.04], [Math.PI / 2, 0, 0]);
  }
  for (const x of [-1.68, -1.38, 2.54]) {
    box(0.09, 0.32, 0.09, "dark", [x, 4.35, -1.035]);
    rod([x, 4.51, -1.035], [x, 4.98, -1.035], 0.014, "metal");
  }
  box(0.08, 0.65, 0.08, "wood", [2.14, 4.37, -1.0]);
  box(0.4, 0.14, 0.15, "metal", [2.14, 4.76, -1.0]);
  cylinder(
    0.095,
    0.095,
    0.08,
    "metal",
    [2.36, 4.76, -1.0],
    [0, 0, Math.PI / 2],
  );
  // Open pencil cup and its individual pencils.
  cylinder(0.17, 0.12, 0.3, "metal", [1.53, 4.45, -0.99], [0, 0, 0], true);
  cylinder(0.12, 0.12, 0.025, "dark", [1.53, 4.3, -0.99]);
  for (let i = 0; i < 5; i++)
    rod(
      [1.43 + i * 0.04, 4.33, -0.99],
      [1.41 + i * 0.055, 5.04 + (i % 2) * 0.1, -0.99],
      0.014,
      i % 2 ? "wood" : "dark",
    );

  // Books have covers, a spine and a paper block.
  for (let i = 0; i < 4; i++) {
    const x = 1.15 + i * 0.24,
      height = 0.65 + (i % 3) * 0.12;
    box(0.19, height, 0.48, "paper", [x, 6.1 + height / 2, -1.02]);
    for (const side of [-1, 1])
      box(0.025, height + 0.04, 0.52, "wood", [
        x + side * 0.107,
        6.1 + height / 2,
        -1.02,
      ]);
    box(0.2, height + 0.035, 0.025, "metal", [x, 6.1 + height / 2, -0.753]);
  }
  box(0.67, 0.83, 0.53, "wood", [2.5, 6.51, -1.03]);
  for (let i = 0; i < 4; i++) {
    box(0.57, 0.16, 0.05, "paper", [2.5, 6.22 + i * 0.19, -0.742]);
    handle(2.5, 6.24 + i * 0.19, -0.707, 0.22);
  }
  for (const x of [-1.2, -0.35]) {
    box(0.72, 0.4, 0.55, "paper", [x, 6.3, -1.03]);
    box(0.75, 0.055, 0.58, "wood", [x, 6.52, -1.03]);
    box(0.17, 0.07, 0.03, "metal", [x, 6.37, -0.739]);
  }

  // Plant: a tapered pot, branching stems and curved volumetric leaves.
  cylinder(0.27, 0.21, 0.53, "wood", [-2.42, 6.36, -1.02], [0, 0, 0], true);
  cylinder(0.247, 0.247, 0.025, "soil", [-2.42, 6.59, -1.02]);
  tube(
    [
      [-2.42, 6.56, -1.02],
      [-2.4, 7.04, -1.02],
      [-2.31, 7.49, -1.05],
    ],
    0.009,
    "dark",
  );
  for (let i = 0; i < 16; i++) {
    const side = i % 2 ? 1 : -1;
    const height = 0.18 + (i % 8) * 0.105;
    const spread =
      0.18 + (1 - Math.abs(height - 0.55)) * (0.18 + (i % 3) * 0.08);
    const dx = side * spread;
    const dz = Math.sin(i * 2.4) * 0.21;
    const end: Point = [-2.42 + dx, 6.65 + height, -1.02 + dz];
    tube(
      [
        [-2.4, 6.59 + height * 0.65, -1.02],
        [-2.42 + dx * 0.55, 6.63 + height * 0.9, -1.02 + dz * 0.35],
        end,
      ],
      0.009,
      "dark",
    );
    const leaf = new Shape();
    leaf.moveTo(0, -0.5);
    leaf.quadraticCurveTo(-0.38, -0.02, 0, 0.5);
    leaf.quadraticCurveTo(0.36, 0.03, 0, -0.5);
    const geometry = new ExtrudeGeometry(leaf, {
      depth: 0.018,
      bevelEnabled: false,
      curveSegments: 8,
    });
    const positions = geometry.getAttribute("position");
    for (let vertex = 0; vertex < positions.count; vertex++)
      positions.setZ(
        vertex,
        positions.getZ(vertex) +
          0.065 * Math.sin((positions.getY(vertex) + 0.5) * Math.PI),
      );
    geometry.computeVertexNormals();
    add(
      geometry,
      "leaf",
      [end[0] + side * 0.08, end[1] + 0.08, end[2]],
      [Math.sin(i * 2.4) * 0.35, dz * 2, -side * (0.7 + (i % 3) * 0.18)],
      [0.52, 0.43, 0.65],
    );
  }

  function illustration(
    width: number,
    height: number,
    quad: IllustrationQuad,
    at: Point,
    rotation: Point = [0, 0, 0],
  ) {
    add(
      mapIllustration(new PlaneGeometry(width, height), quad),
      illustrationMaterial,
      at,
      rotation,
      [1, 1, 1],
      false,
    );
  }
  // Laptop base, keyboard, trackpad, hinge and a solid tilted lid.
  box(1.95, 0.08, 1.15, "metal", [-1.52, 3.18, 0.28]);
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 12; col++)
      box(0.105, 0.012, 0.075, "dark", [
        -2.17 + col * 0.116,
        3.227,
        -0.04 + row * 0.09,
      ]);
  box(0.48, 0.012, 0.25, "paper", [-1.52, 3.228, 0.66]);
  cylinder(
    0.038,
    0.038,
    1.75,
    "dark",
    [-1.52, 3.23, -0.25],
    [0, 0, Math.PI / 2],
  );
  box(1.83, 1.13, 0.075, "metal", [-1.52, 3.8, -0.34], [-0.16, 0, 0]);
  illustration(
    1.63,
    0.94,
    [
      [680, 410],
      [845, 407],
      [859, 505],
      [693, 515],
    ],
    [-1.52, 3.803, -0.294],
    [-0.16, 0, 0],
  );
  // Main display and stand, with rear vents visible when orbiting behind it.
  box(0.085, 0.44, 0.12, "metal", [0.75, 3.39, -0.18]);
  box(0.92, 0.065, 0.5, "metal", [0.75, 3.18, -0.06]);
  box(1.7, 1.1, 0.12, "metal", [0.75, 4.12, -0.25]);
  illustration(
    1.51,
    0.91,
    [
      [1015, 390],
      [1181, 393],
      [1171, 492],
      [1008, 485],
    ],
    [0.75, 4.12, -0.182],
  );
  for (let i = 0; i < 8; i++)
    box(0.022, 0.19, 0.008, "dark", [0.47 + i * 0.08, 4.29, -0.316]);
  box(0.32, 0.24, 0.012, "paper", [0.75, 3.94, -0.316]);
  for (const x of [0.31, 1.18])
    for (const y of [3.71, 4.54]) screw([x, y, -0.322]);
  for (let i = 0; i < 4; i++)
    box(0.12, 0.035, 0.02, "dark", [0.43 + i * 0.17, 3.65, -0.323]);
  tube(
    [
      [0.76, 3.63, -0.32],
      [0.76, 3.4, -0.6],
      [1.23, 3.17, -0.91],
      [1.66, 3.16, -1.1],
    ],
    0.012,
    "dark",
  );
  // Rear laptop vents, feet and a subtle maker plate remain legible when rotated.
  for (let i = 0; i < 12; i++)
    box(0.052, 0.012, 0.015, "dark", [-2.16 + i * 0.116, 3.37, -0.45]);
  box(0.36, 0.16, 0.012, "paper", [-1.52, 3.86, -0.388], [-0.16, 0, 0]);
  // Small desktop keyboard and mouse.
  box(1.05, 0.035, 0.4, "paper", [0.73, 3.165, 0.64]);
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 10; col++)
      box(0.075, 0.01, 0.075, "metal", [
        0.3 + col * 0.095,
        3.19,
        0.53 + row * 0.09,
      ]);
  add(
    new SphereGeometry(1, 16, 10),
    "metal",
    [1.55, 3.185, 0.65],
    [0, 0, 0],
    [0.16, 0.07, 0.22],
    false,
  );
  // Vise with a base, jaws, screw and sliding handle.
  box(0.57, 0.09, 0.48, "metal", [2.49, 3.185, 0.57]);
  box(0.35, 0.35, 0.36, "dark", [2.49, 3.4, 0.53]);
  for (const z of [0.38, 0.7]) box(0.47, 0.15, 0.12, "metal", [2.49, 3.64, z]);
  rod([2.49, 3.4, 0.7], [2.49, 3.4, 0.99], 0.045, "metal");
  rod([2.17, 3.4, 1], [2.81, 3.4, 1], 0.019, "metal");
  for (const x of [2.17, 2.81])
    add(
      new SphereGeometry(0.04, 8, 6),
      "dark",
      [x, 3.4, 1],
      [0, 0, 0],
      [1, 1, 1],
      false,
    );
  for (let i = 0; i < 8; i++) {
    add(new TorusGeometry(0.047, 0.006, 4, 10), "metal", [
      2.49,
      3.4,
      0.73 + i * 0.032,
    ]);
  }
  for (const x of [2.29, 2.69])
    for (const z of [0.42, 0.73]) screw([x, 3.235, z], false);
  // A knurled drafting pencil rests beside the keyboard, as in the source art.
  rod([-0.05, 3.18, 0.9], [0.43, 3.18, 0.8], 0.021, "wood");
  rod([-0.15, 3.18, 0.92], [-0.05, 3.18, 0.9], 0.012, "dark");

  // Toolbox with a lid, catches and raised handle.
  box(1.36, 0.51, 0.85, "metal", [-1.82, 0.98, 0.04]);
  box(1.39, 0.1, 0.88, "wood", [-1.82, 1.28, 0.04]);
  for (const x of [-2.43, -1.21]) {
    box(0.07, 0.51, 0.88, "metal", [x, 0.98, 0.04]);
    for (const z of [-0.4, 0.48]) screw([x, 1.06, z]);
    box(0.13, 0.12, 0.035, "metal", [x, 1.24, -0.415]);
  }
  for (const x of [-2.22, -1.42])
    box(0.09, 0.15, 0.045, "dark", [x, 1.15, 0.487]);
  handle(-1.82, 1.17, 0.48, 0.4);
  tube(
    [
      [-2.1, 1.33, 0.02],
      [-2.08, 1.46, 0.02],
      [-1.56, 1.46, 0.02],
      [-1.54, 1.33, 0.02],
    ],
    0.025,
    "dark",
  );

  // Adjustable stool: turned seat, stem, foot ring and four independent feet.
  const seatProfile = [
    [0, 0],
    [0.49, 0],
    [0.55, 0.04],
    [0.55, 0.12],
    [0.5, 0.17],
    [0, 0.17],
  ].map((p) => new Vector2(p[0], p[1]));
  const stoolX = -0.18,
    stoolZ = 1.9;
  add(new LatheGeometry(seatProfile, 32), "wood", [stoolX, 1.86, stoolZ]);
  cylinder(0.055, 0.07, 1.72, "metal", [stoolX, 1.01, stoolZ]);
  add(
    new TorusGeometry(0.4, 0.022, 8, 40),
    "metal",
    [stoolX, 0.73, stoolZ],
    [Math.PI / 2, 0, 0],
  );
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + 0.3,
      x = stoolX + Math.cos(angle) * 0.68,
      z = stoolZ + Math.sin(angle) * 0.68;
    rod([stoolX, 0.25, stoolZ], [x, 0.12, z], 0.035, "metal");
    cylinder(0.052, 0.052, 0.09, "dark", [x, 0.08, z]);
  }

  // Merge opaque parts by finish; screen materials retain their own UV crop.
  const silhouette = new MeshBasicMaterial({
    color: 0x403d35,
    side: BackSide,
    toneMapped: false,
  });
  silhouette.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\ntransformed += normal * 0.012;",
    );
  };
  for (const [material, geometries] of batches) {
    const geometry = mergeGeometries(geometries, false);
    if (!geometry) throw new Error("Incompatible workbench geometry");
    const mesh = new Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    if (material.name !== "original-pencil-detail")
      group.add(new Mesh(geometry, silhouette));
    geometries.forEach((g) => g.dispose());
  }
  const inkGeometry = mergeGeometries(outlines, false);
  if (inkGeometry)
    group.add(
      new LineSegments(
        inkGeometry,
        new LineBasicMaterial({
          color: 0x403d35,
          transparent: true,
          opacity: 0.86,
          toneMapped: false,
        }),
      ),
    );
  outlines.forEach((g) => g.dispose());

  return {
    group,
    partCount,
    dispose() {
      const disposed = new Set<Material>();
      const geometries = new Set<BufferGeometry>();
      group.traverse((object) => {
        if (object instanceof Mesh || object instanceof LineSegments) {
          if (!geometries.has(object.geometry)) {
            object.geometry.dispose();
            geometries.add(object.geometry);
          }
          const values = Array.isArray(object.material)
            ? object.material
            : [object.material];
          for (const value of values)
            if (!disposed.has(value)) {
              value.dispose();
              disposed.add(value);
            }
        }
      });
    },
  };
}
