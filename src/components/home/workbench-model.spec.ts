import { Box3, Mesh, Raycaster, Texture, Vector3 } from "three";
import { describe, expect, it, vi } from "vitest";

import { buildWorkbenchModel } from "./workbench-model";
import {
  artworkHeight,
  artworkPoint,
  artworkWidth,
  createArtworkCamera,
} from "./workbench-view";

const screenFaces = [
  [
    [670, 398],
    [852, 396],
    [867, 516],
    [681, 523],
  ],
  [
    [988, 379],
    [1188, 381],
    [1178, 501],
    [978, 495],
  ],
] as const;

function meshForFinish(
  group: ReturnType<typeof buildWorkbenchModel>["group"],
  finish: string,
) {
  const mesh = group.children
    .filter((child) => child instanceof Mesh)
    .find(
      (child) =>
        !Array.isArray(child.material) &&
        child.material.name === `graphite-${finish}`,
    );
  if (!mesh) throw new Error(`Missing graphite mesh for ${finish}`);
  return mesh;
}

function paintedVertex(
  group: ReturnType<typeof buildWorkbenchModel>["group"],
  finish: string,
  x: number,
  y: number,
) {
  const mesh = meshForFinish(group, finish);
  const ink = mesh.geometry.getAttribute("pencilUv");
  const positions = mesh.geometry.getAttribute("position");
  for (let index = 0; index < ink.count; index++) {
    if (ink.getW(index) !== 1) continue;
    const sampleX = (ink.getX(index) / ink.getZ(index)) * artworkWidth;
    const sampleY = (1 - ink.getY(index) / ink.getZ(index)) * artworkHeight;
    if (Math.abs(sampleX - x) < 0.01 && Math.abs(sampleY - y) < 0.01)
      return new Vector3()
        .fromBufferAttribute(positions, index)
        .applyMatrix4(mesh.matrixWorld);
  }
  throw new Error(`Missing artwork landmark at ${x}, ${y}`);
}

function hasProjectedInk(mesh: Mesh) {
  const ink = mesh.geometry.getAttribute("pencilUv");
  for (let i = 0; i < ink.count; i++) if (ink.getW(i) > 0.5) return true;
  return false;
}

describe("physical workbench model", () => {
  it("models circular holes through the board", () => {
    const model = buildWorkbenchModel(new Texture(), new Texture());
    model.group.updateMatrixWorld(true);
    const meshes = model.group.children.filter(
      (child) => child instanceof Mesh,
    );
    const hole = artworkPoint([911.75, 301.9], "z", -1.2).applyMatrix4(
      model.group.matrixWorld,
    );
    function hitsBoard(dx: number, dy: number) {
      return new Raycaster(
        new Vector3(hole.x + dx, hole.y + dy, -5),
        new Vector3(0, 0, 1),
        0,
        3.85,
      ).intersectObjects(meshes, false).length;
    }
    expect(hitsBoard(0, 0)).toBe(0);
    expect(hitsBoard(0.012, 0)).toBe(0);
    expect(hitsBoard(0, 0.012)).toBe(0);
    expect(hitsBoard(0.017, 0)).toBeGreaterThan(0);
    expect(hitsBoard(0, 0.017)).toBeGreaterThan(0);
    const board = meshForFinish(model.group, "pegboard");
    expect(hasProjectedInk(board)).toBe(false);
    const position = board.geometry.getAttribute("position");
    const normal = board.geometry.getAttribute("normal");
    const corners = [new Vector3(), new Vector3(), new Vector3()];
    let longestEdge = 0;
    for (let i = 0; i < position.count; i += 3) {
      if (normal.getZ(i) < 0.999) continue;
      corners.forEach((corner, index) =>
        corner.fromBufferAttribute(position, i + index),
      );
      corners.forEach((corner, index) => {
        longestEdge = Math.max(
          longestEdge,
          corner.distanceTo(corners[(index + 1) % 3]!),
        );
      });
    }
    expect(longestEdge).toBeGreaterThan(0);
    expect(longestEdge).toBeLessThan(0.6);
    model.dispose();
  });

  it("aligns the tabletop edge, monitor and yellow drawer with the drawing", () => {
    const model = buildWorkbenchModel(new Texture(), new Texture());
    model.group.updateMatrixWorld(true);
    const camera = createArtworkCamera();
    for (const { finish, x, y } of [
      { finish: "wood", x: 498, y: 540 },
      { finish: "metal", x: 988, y: 379 },
    ]) {
      const point = paintedVertex(model.group, finish, x, y).project(camera);
      expect(((point.x + 1) * artworkWidth) / 2).toBeCloseTo(x, 2);
      expect(((1 - point.y) * artworkHeight) / 2).toBeCloseTo(y, 2);
    }
    const drawer = meshForFinish(model.group, "yellow");
    const { min, max } = new Box3().setFromObject(drawer);
    const corner = new Vector3(min.x, max.y, max.z).project(camera);
    const [x, y] = [
      ((corner.x + 1) * artworkWidth) / 2,
      ((1 - corner.y) * artworkHeight) / 2,
    ];
    expect(Math.hypot(x - 1018, y - 716)).toBeLessThan(2);
    expect(hasProjectedInk(drawer)).toBe(false);
    model.dispose();
  });

  it("projects the monitor base corners close to the drawing", () => {
    const model = buildWorkbenchModel(new Texture(), new Texture());
    const camera = createArtworkCamera();
    const corners = [
      [1040.5, 528],
      [1115.5, 534],
      [1141.5, 523],
    ] as const;
    try {
      const projected: [number, number][] = [];
      const point = new Vector3();
      for (const finish of ["metal", "dark"]) {
        const { geometry } = meshForFinish(model.group, finish);
        const position = geometry.getAttribute("position");
        const normal = geometry.getAttribute("normal");
        for (let index = 0; index < position.count; index++) {
          if (normal.getY(index) < 0.999) continue;
          point.fromBufferAttribute(position, index);
          if (
            point.x < 1 ||
            point.x > 2.1 ||
            point.y < 3.15 ||
            point.y > 3.2 ||
            point.z < -1.21 ||
            point.z > -0.2
          )
            continue;
          point.project(camera);
          projected.push([
            ((point.x + 1) * artworkWidth) / 2,
            ((1 - point.y) * artworkHeight) / 2,
          ]);
        }
      }
      for (const [x, y] of corners)
        expect
          .soft(
            Math.min(
              ...projected.map(([px, py]) => Math.hypot(px - x, py - y)),
            ),
          )
          .toBeLessThan(2);
    } finally {
      model.dispose();
    }
  });

  it("keeps the painted slab square and the front legs upright in three dimensions", () => {
    const model = buildWorkbenchModel(new Texture(), new Texture());
    model.group.updateMatrixWorld(true);
    try {
      const left = paintedVertex(model.group, "wood", 498, 540);
      const right = paintedVertex(model.group, "wood", 1271, 591);
      const rear = paintedVertex(model.group, "wood", 1368, 530);
      const edge = right.clone().sub(left).normalize();
      const depth = rear.clone().sub(right).normalize();
      expect(edge.dot(depth)).toBeCloseTo(0, 5);

      for (const [[topX, topY], [footX, footY]] of [
        [
          [523, 570],
          [524, 802],
        ],
        [
          [1216, 626],
          [1216, 924],
        ],
      ] as const) {
        const top = paintedVertex(model.group, "wood", topX, topY);
        const foot = paintedVertex(model.group, "wood", footX, footY);
        expect(top.x).toBeCloseTo(foot.x, 5);
        expect(top.z).toBeCloseTo(foot.z, 5);
        expect(top.y).toBeGreaterThan(foot.y);
      }
    } finally {
      model.dispose();
    }
  });

  it("keeps the stool rim circular and the seat free of projected shadows", () => {
    const model = buildWorkbenchModel(new Texture(), new Texture());
    model.group.updateMatrixWorld(true);
    try {
      const seat = meshForFinish(model.group, "seat");
      const center = new Box3().setFromObject(seat).getCenter(new Vector3());
      const position = seat.geometry.getAttribute("position");
      const ink = seat.geometry.getAttribute("pencilUv");
      const point = new Vector3();
      const camera = createArtworkCamera();
      const radii: number[] = [];
      const upperRim: [number, number][] = [];
      let projectedInk = 0;
      for (let i = 0; i < position.count; i++) {
        point.fromBufferAttribute(position, i);
        projectedInk = Math.max(projectedInk, ink.getW(i));
        if (Math.abs(point.y - center.y) < 0.05)
          radii.push(Math.hypot(point.x - center.x, point.z - center.z));
        if (point.y > center.y) {
          point.project(camera);
          upperRim.push([
            ((point.x + 1) * artworkWidth) / 2,
            ((1 - point.y) * artworkHeight) / 2,
          ]);
        }
      }
      expect(radii.length).toBeGreaterThan(60);
      expect(Math.max(...radii) / Math.min(...radii)).toBeCloseTo(1, 4);
      expect(projectedInk).toBe(0);
      for (const [x, y] of [
        [755.5, 696],
        [900.5, 698],
      ] as const)
        expect(
          Math.min(...upperRim.map(([px, py]) => Math.hypot(px - x, py - y))),
        ).toBeLessThan(2);
    } finally {
      model.dispose();
    }
  });

  it("keeps the equipment shells rectangular, with the laptop joined at its hinge", () => {
    const model = buildWorkbenchModel(new Texture(), new Texture());
    model.group.updateMatrixWorld(true);
    try {
      for (const corners of screenFaces) {
        const [a, b, c, d] = corners.map(([x, y]) =>
          paintedVertex(model.group, "metal", x, y),
        ) as [Vector3, Vector3, Vector3, Vector3];
        const width = b.clone().sub(a);
        const height = d.clone().sub(a);
        expect(
          width.clone().normalize().dot(height.clone().normalize()),
        ).toBeCloseTo(0, 5);
        expect(a.clone().add(width).add(height).distanceTo(c)).toBeLessThan(
          1e-5,
        );
      }
      const { geometry } = meshForFinish(model.group, "metal");
      const position = geometry.getAttribute("position");
      const normal = geometry.getAttribute("normal");
      const point = new Vector3();
      for (const [x, y] of [
        [681, 523],
        [867, 516],
      ] as const) {
        const hinge = paintedVertex(model.group, "metal", x, y);
        let joined = false;
        for (let i = 0; i < position.count; i++) {
          if (normal.getY(i) < 0.999) continue;
          point.fromBufferAttribute(position, i);
          if (point.distanceToSquared(hinge) >= 1e-10) continue;
          joined = true;
          break;
        }
        expect(joined).toBe(true);
      }
    } finally {
      model.dispose();
    }
  });

  it("keeps the toolbox lid and case walls flat with graphite shading", () => {
    const model = buildWorkbenchModel(new Texture(), new Texture());
    model.group.updateMatrixWorld(true);
    try {
      const caseMesh = meshForFinish(model.group, "metal");
      const ink = caseMesh.geometry.getAttribute("pencilUv");
      for (const [origin, normal] of [
        [new Vector3(-2.93, 1.96, 0.56), new Vector3(0, 1, 0)],
        [new Vector3(-2.3, 1.96, 0.02), new Vector3(0, 1, 0)],
        [new Vector3(-2.61, 1.44, 1.05), new Vector3(0, 0, 1)],
        [new Vector3(-2.61, 1.44, -0.44), new Vector3(0, 0, -1)],
        [new Vector3(-3.5, 1.44, 0.31), new Vector3(-1, 0, 0)],
        [new Vector3(-1.71, 1.44, 0.31), new Vector3(1, 0, 0)],
      ] as const) {
        const ray = new Raycaster(origin, normal.clone().negate(), 0, 0.24);
        const [hit] = ray.intersectObject(caseMesh);
        if (!hit?.face) throw new Error("Missing toolbox surface");
        expect.soft(hit.face.normal.dot(normal)).toBeCloseTo(1, 5);
        expect.soft(ink.getW(hit.face.a)).toBe(0);
      }
    } finally {
      model.dispose();
    }
  });

  it("samples every painted face through one continuous planar projection", () => {
    const model = buildWorkbenchModel(new Texture(), new Texture());
    try {
      let paintedQuads = 0;
      let mixedTriangles = 0;
      for (const mesh of model.group.children) {
        if (
          !(mesh instanceof Mesh) ||
          Array.isArray(mesh.material) ||
          !mesh.material.name.startsWith("graphite-")
        )
          continue;
        const position = mesh.geometry.getAttribute("position");
        const ink = mesh.geometry.getAttribute("pencilUv");
        for (let i = 0; i < position.count; i += 3) {
          if (!ink.getW(i)) {
            if (ink.getW(i + 1) || ink.getW(i + 2)) mixedTriangles++;
            continue;
          }
          const corners = new Map<string, { uv: Vector3; shared: boolean }>();
          for (let j = i; j < i + 6; j++) {
            expect(ink.getW(j)).toBe(1);
            const key = new Vector3()
              .fromBufferAttribute(position, j)
              .toArray()
              .join();
            const corner = corners.get(key);
            if (corner) corner.shared = true;
            else
              corners.set(key, {
                uv: new Vector3(ink.getX(j), ink.getY(j), ink.getZ(j)),
                shared: false,
              });
          }
          expect(corners.size).toBe(4);
          const common = new Vector3();
          const alternate = new Vector3();
          for (const { uv, shared } of corners.values())
            (shared ? common : alternate).add(uv);
          // The same midpoint must have the same homogeneous coordinates
          // when sampled through either diagonal of the quad.
          const pixelGap = Math.hypot(
            (common.x / common.z - alternate.x / alternate.z) * artworkWidth,
            (common.y / common.z - alternate.y / alternate.z) * artworkHeight,
          );
          expect.soft(pixelGap).toBeLessThan(0.001);
          expect.soft(common.z / alternate.z).toBeCloseTo(1, 6);
          paintedQuads++;
          i += 3;
        }
      }
      expect(mixedTriangles).toBe(0);
      expect(paintedQuads).toBeGreaterThan(0);
    } finally {
      model.dispose();
    }
  });

  it("has five separated rows of raised laptop keys", () => {
    const model = buildWorkbenchModel(new Texture(), new Texture());
    model.group.updateMatrixWorld(true);
    try {
      const keys = meshForFinish(model.group, "dark");
      const left = artworkPoint([681, 523], "y", 3.21);
      const right = artworkPoint([867, 516], "y", 3.21);
      const forward = right
        .clone()
        .sub(left)
        .cross(new Vector3(0, 1, 0))
        .normalize();
      const center = left.clone().lerp(right, 0.463).setY(3.26);
      const ray = new Raycaster(
        center.clone(),
        new Vector3(0, -1, 0),
        0,
        0.037,
      );
      let rows = 0;
      let previousHit = false;
      for (let depth = 0; depth < 0.9; depth += 0.006) {
        ray.ray.origin.copy(center).addScaledVector(forward, depth);
        const hit = ray.intersectObject(keys, false).length > 0;
        if (hit && !previousHit) rows++;
        previousHit = hit;
      }
      expect(rows).toBe(5);
    } finally {
      model.dispose();
    }
  });

  it("keeps the vise jaws open and its base flush with the tabletop", () => {
    const model = buildWorkbenchModel(new Texture(), new Texture());
    model.group.updateMatrixWorld(true);
    try {
      const meshes = ["metal", "dark"].map((finish) =>
        meshForFinish(model.group, finish),
      );
      const viseX = artworkPoint([1246, 530], "z", 0.69).x;
      const down = new Vector3(0, -1, 0);
      const ray = new Raycaster(new Vector3(viseX, 4.15, 0), down, 0, 0.4);
      const gaps = [];
      let lastJaw: number | undefined;
      for (let step = 0; step <= 200; step++) {
        const z = step / 200;
        ray.ray.origin.z = z;
        if (ray.intersectObjects(meshes, false).length === 0) continue;
        if (lastJaw !== undefined) gaps.push(z - lastJaw);
        lastJaw = z;
      }
      expect.soft(Math.max(...gaps)).toBeGreaterThan(0.1);

      const area = new Box3(
        new Vector3(viseX - 0.37, 2.98, 0.13),
        new Vector3(viseX + 0.37, 4.15, 1.55),
      );
      const point = new Vector3();
      let lowest = Infinity;
      let painted = 0;
      for (const { geometry } of meshes) {
        const position = geometry.getAttribute("position");
        const ink = geometry.getAttribute("pencilUv");
        for (let i = 0; i < position.count; i++) {
          if (!area.containsPoint(point.fromBufferAttribute(position, i)))
            continue;
          lowest = Math.min(lowest, point.y);
          if (ink.getW(i) === 1) painted++;
        }
      }
      expect.soft(lowest).toBeCloseTo(3.13, 5);
      expect.soft(painted).toBe(0);
    } finally {
      model.dispose();
    }
  });

  it("releases shared geometries once while retaining ownership of source textures", () => {
    const paper = new Texture(),
      screens = new Texture();
    const paperDispose = vi.spyOn(paper, "dispose"),
      screenDispose = vi.spyOn(screens, "dispose");
    const model = buildWorkbenchModel(paper, screens);
    const geometries = new Set(
      model.group.children
        .filter((child) => child instanceof Mesh)
        .map((mesh) => mesh.geometry),
    );
    const releases = [...geometries].map((geometry) =>
      vi.spyOn(geometry, "dispose"),
    );
    model.dispose();
    releases.forEach((release) => expect(release).toHaveBeenCalledTimes(1));
    expect(paperDispose).not.toHaveBeenCalled();
    expect(screenDispose).not.toHaveBeenCalled();
  });
});
