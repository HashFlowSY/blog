import {
  Box3,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Texture,
  Vector3,
} from "three";
import { describe, expect, it, vi } from "vitest";

import { buildWorkbenchModel, buildWorkbenchSurfaces } from "./workbench-model";
import {
  artworkHeight,
  artworkPoint,
  artworkWidth,
  createArtworkCamera,
} from "./workbench-view";

function pixel(point: Vector3) {
  const { x, y } = point.clone().project(createArtworkCamera());
  return new Vector3(
    ((x + 1) * artworkWidth) / 2,
    ((1 - y) * artworkHeight) / 2,
    0,
  );
}

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

function fittedFace(
  surfaces: ReturnType<typeof buildWorkbenchSurfaces>,
  region: ReturnType<typeof buildWorkbenchSurfaces>[number]["region"],
  finish: string,
) {
  const face = surfaces.find(
    (surface) =>
      surface.region === region &&
      surface.finish === finish &&
      surface.projection,
  );
  if (!face?.projection) throw new Error(`Missing fitted ${region} face`);
  return face.projection;
}

describe("physical workbench model", () => {
  it("models circular holes through the board", () => {
    const model = buildWorkbenchModel(new Texture());
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

  it("registers the desktop, monitor and drawer from all four corners", () => {
    const surfaces = buildWorkbenchSurfaces();
    try {
      for (const [region, finish, tolerance] of [
        ["desk", "wood", 10],
        ["display", "metal", 0.6],
        ["cabinet", "yellow", 3.6],
      ] as const) {
        const { corners, pixels } = fittedFace(surfaces, region, finish);
        for (const [i, corner] of corners.entries()) {
          const [x, y] = pixels[i]!;
          expect
            .soft(pixel(corner).distanceTo(new Vector3(x, y, 0)))
            .toBeLessThan(tolerance);
        }
      }
    } finally {
      surfaces.forEach(({ geometry }) => geometry.dispose());
    }
  });

  it("fits the three visible monitor base corners and seats the plate on the desktop", () => {
    const surfaces = buildWorkbenchSurfaces();
    try {
      const { corners } = fittedFace(surfaces, "display", "dark");
      const observed = [
        [1040.5, 528],
        [1115.5, 534],
        [1141.5, 523],
      ] as const;
      for (const [i, [x, y]] of observed.entries())
        expect(
          pixel(corners[i]!).distanceTo(new Vector3(x, y, 0)),
        ).toBeLessThan(0.6);
      const parts = surfaces.filter((surface) => surface.region === "display");
      const base = parts.find(
        (surface) => surface.finish === "dark" && !surface.projection,
      );
      if (!base) throw new Error("Missing monitor base side walls");
      base.geometry.computeBoundingBox();
      expect(base.geometry.boundingBox?.min.y).toBeCloseTo(3.13, 5);
    } finally {
      surfaces.forEach(({ geometry }) => geometry.dispose());
    }
  });

  it("keeps the tabletop and screens rectangular in model space", () => {
    const surfaces = buildWorkbenchSurfaces();
    try {
      for (const [region, finish] of [
        ["desk", "wood"],
        ["display", "metal"],
        ["laptop", "metal"],
      ] as const) {
        const [a, b, c, d] = fittedFace(surfaces, region, finish).corners;
        const width = b!.clone().sub(a!);
        const height = d!.clone().sub(a!);
        expect(width.dot(height)).toBeCloseTo(0, 5);
        expect(a!.clone().add(width).add(height).distanceTo(c!)).toBeLessThan(
          1e-5,
        );
      }
    } finally {
      surfaces.forEach(({ geometry }) => geometry.dispose());
    }
  });

  it("keeps the upholstered profile circular around its axis", () => {
    const model = buildWorkbenchModel(new Texture());
    model.group.updateMatrixWorld(true);
    try {
      const seat = meshForFinish(model.group, "seat");
      const center = new Box3().setFromObject(seat).getCenter(new Vector3());
      const position = seat.geometry.getAttribute("position");
      const point = new Vector3();
      const camera = createArtworkCamera();
      const radii: number[] = [];
      const upperRim: [number, number][] = [];
      for (let i = 0; i < position.count; i++) {
        point.fromBufferAttribute(position, i);
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

  it("joins the laptop lid to the keyboard shell at both hinge endpoints", () => {
    const surfaces = buildWorkbenchSurfaces();
    try {
      const { corners } = fittedFace(surfaces, "laptop", "metal");
      const shell = surfaces.find((surface) => surface.region === "laptop");
      if (!shell) throw new Error("Missing laptop base");
      const position = shell.geometry.getAttribute("position");
      const vertices = Array.from({ length: position.count }, (_, index) =>
        new Vector3().fromBufferAttribute(position, index),
      );
      for (const point of corners.slice(2))
        expect(
          vertices.some((vertex) => vertex.distanceToSquared(point) < 1e-10),
        ).toBe(true);
    } finally {
      surfaces.forEach(({ geometry }) => geometry.dispose());
    }
  });

  it("keeps the toolbox lid and case walls flat", () => {
    const model = buildWorkbenchModel(new Texture());
    model.group.updateMatrixWorld(true);
    try {
      const caseMesh = meshForFinish(model.group, "metal");
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
      }
    } finally {
      model.dispose();
    }
  });

  it("assigns finite atlas coordinates to every triangle", () => {
    const texture = new Texture();
    const model = buildWorkbenchModel(texture);
    try {
      for (const child of model.group.children) {
        if (
          !(child instanceof Mesh) ||
          !(child.material instanceof MeshBasicMaterial)
        )
          continue;
        expect(child.material.map).toBe(texture);
        const { geometry } = child;
        const uv = geometry.getAttribute("uv");
        expect(uv.count).toBe(geometry.getAttribute("position").count);
        let minimum = 1,
          maximum = 0;
        for (let i = 0; i < uv.count; i++) {
          minimum = Math.min(minimum, uv.getX(i), uv.getY(i));
          maximum = Math.max(maximum, uv.getX(i), uv.getY(i));
        }
        expect(minimum).toBeGreaterThan(0);
        expect(maximum).toBeLessThan(1);
      }
    } finally {
      model.dispose();
    }
  });

  it("has five separated rows of raised laptop keys", () => {
    const model = buildWorkbenchModel(new Texture());
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
    const model = buildWorkbenchModel(new Texture());
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
      for (const { geometry } of meshes) {
        const position = geometry.getAttribute("position");
        for (let i = 0; i < position.count; i++) {
          if (!area.containsPoint(point.fromBufferAttribute(position, i)))
            continue;
          lowest = Math.min(lowest, point.y);
        }
      }
      expect.soft(lowest).toBeCloseTo(3.13, 5);
    } finally {
      model.dispose();
    }
  });

  it("releases each mesh while retaining ownership of the atlas", () => {
    const atlas = new Texture();
    const atlasDispose = vi.spyOn(atlas, "dispose");
    const model = buildWorkbenchModel(atlas);
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
    expect(atlasDispose).not.toHaveBeenCalled();
  });
});
