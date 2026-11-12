import { Mesh, MeshBasicMaterial, Raycaster, Texture, Vector3 } from "three";
import { describe, expect, it, vi } from "vitest";

import { buildWorkbenchModel, buildWorkbenchSurfaces } from "./workbench-model";
import {
  artworkHeight,
  artworkPoint,
  artworkWidth,
  createArtworkCamera,
} from "./workbench-view";

import type { Group } from "three";

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

function meshesIn(group: Group) {
  const meshes: Mesh[] = [];
  group.traverse((child) => {
    if (child instanceof Mesh) meshes.push(child);
  });
  return meshes;
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

  it("recesses the monitor vents and routes its cable through the gap under the board", () => {
    const surfaces = buildWorkbenchSurfaces();
    const material = new MeshBasicMaterial();
    try {
      const [a, b, c, d] = fittedFace(surfaces, "display", "metal").corners;
      const right = b!.clone().sub(a!).normalize();
      const up = a!.clone().sub(d!).normalize();
      const normal = right.clone().cross(up);
      const center = a!.clone().lerp(c!, 0.5);
      const display = surfaces.filter(({ region }) => region === "display");
      const meshes = display.map(
        ({ geometry }) => new Mesh(geometry, material),
      );
      function hitAt(x: number) {
        const origin = center
          .clone()
          .addScaledVector(right, x)
          .addScaledVector(up, 0.119)
          .addScaledVector(normal, -0.3);
        return new Raycaster(origin, normal, 0, 0.3).intersectObjects(
          meshes,
        )[0]!.distance;
      }
      expect(hitAt(0) - hitAt(0.053)).toBeGreaterThan(0.045);

      const board = surfaces.find(({ finish }) => finish === "pegboard")!;
      board.geometry.computeBoundingBox();
      const bounds = board.geometry.boundingBox!;
      const cable = display.find(
        ({ finish, uvSize }) =>
          finish === "dark" && uvSize && uvSize[0] > 1 && uvSize[1] < 0.08,
      )!;
      const positions = cable.geometry.getAttribute("position");
      let crossing = 0;
      for (let i = 0; i < positions.count; i++) {
        const z = positions.getZ(i);
        if (z < bounds.min.z || z > bounds.max.z) continue;
        expect(positions.getY(i)).toBeGreaterThan(3.13);
        expect(positions.getY(i)).toBeLessThan(bounds.min.y);
        crossing++;
      }
      expect(crossing).toBeGreaterThan(0);
    } finally {
      material.dispose();
      surfaces.forEach(({ geometry }) => geometry.dispose());
    }
  });

  it("keeps the vise jaws clear beside the wood and the base on the desktop", () => {
    const surfaces = buildWorkbenchSurfaces();
    const material = new MeshBasicMaterial();
    try {
      const vise = surfaces.filter(({ region }) => region === "vise");
      const meshes = vise.map(({ geometry }) => new Mesh(geometry, material));
      const x = artworkPoint([1246, 530], "z", 0.69).x;
      function hits(dx: number, z: number) {
        return new Raycaster(
          new Vector3(x + dx, 4.13, z),
          new Vector3(0, -1, 0),
          0,
          0.34,
        ).intersectObjects(meshes).length;
      }
      expect(hits(-0.15, 0.48)).toBe(0);
      expect(hits(-0.15, 0.32)).toBeGreaterThan(0);
      expect(hits(0.245, 0.48)).toBeGreaterThan(0);
      const [contact] = new Raycaster(
        new Vector3(x, 2.98, 0.6),
        new Vector3(0, 1, 0),
        0,
        0.3,
      ).intersectObjects(meshes);
      expect(contact?.point.y).toBeCloseTo(3.13, 5);
    } finally {
      material.dispose();
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
    const surfaces = buildWorkbenchSurfaces();
    try {
      const { geometry } = surfaces.find(
        ({ region, finish }) => region === "stool" && finish === "seat",
      )!;
      geometry.computeBoundingBox();
      const center = geometry.boundingBox!.getCenter(new Vector3());
      const position = geometry.getAttribute("position");
      const point = new Vector3();
      const camera = createArtworkCamera();
      const rings = new Map<number, number[]>();
      const upperRim: [number, number][] = [];
      for (let i = 0; i < position.count; i++) {
        point.fromBufferAttribute(position, i);
        const radius = Math.hypot(point.x - center.x, point.z - center.z);
        if (radius > 0.02) {
          const height = Math.round(point.y * 100000);
          const radii = rings.get(height) ?? [];
          radii.push(radius);
          rings.set(height, radii);
        }
        if (point.y > center.y) {
          point.project(camera);
          upperRim.push([
            ((point.x + 1) * artworkWidth) / 2,
            ((1 - point.y) * artworkHeight) / 2,
          ]);
        }
      }
      expect(rings.size).toBeGreaterThan(4);
      for (const radii of rings.values()) {
        expect(radii.length).toBeGreaterThan(60);
        expect(Math.max(...radii) / Math.min(...radii)).toBeCloseTo(1, 4);
      }
      for (const [x, y] of [
        [755.5, 696],
        [900.5, 698],
      ] as const)
        expect(
          Math.min(...upperRim.map(([px, py]) => Math.hypot(px - x, py - y))),
        ).toBeLessThan(2);
    } finally {
      surfaces.forEach(({ geometry }) => geometry.dispose());
    }
  });

  it("bridges the laptop lid and deck at both hinge mounts", () => {
    const surfaces = buildWorkbenchSurfaces();
    try {
      const [, , right, left] = fittedFace(surfaces, "laptop", "metal").corners;
      const forward = right!
        .clone()
        .sub(left!)
        .normalize()
        .cross(new Vector3(0, 1, 0));
      const mounts = surfaces.filter(
        ({ region, finish, sourceInk }) =>
          region === "laptop" && finish === "metal" && sourceInk === false,
      );
      for (const fraction of [0.13, 0.87]) {
        const hinge = left!.clone().lerp(right!, fraction);
        const pinContact = hinge
          .clone()
          .addScaledVector(forward, -0.027)
          .setY(hinge.y - 0.012);
        const deckContact = hinge
          .clone()
          .addScaledVector(forward, 0.06)
          .setY(hinge.y - 0.022);
        expect(
          mounts.some(({ geometry }) => {
            geometry.computeBoundingBox();
            const bounds = geometry.boundingBox!;
            return (
              bounds.containsPoint(pinContact) &&
              bounds.containsPoint(deckContact)
            );
          }),
        ).toBe(true);
      }
    } finally {
      surfaces.forEach(({ geometry }) => geometry.dispose());
    }
  });

  it("keeps the toolbox lid flat and tapers the case walls toward its feet", () => {
    const surfaces = buildWorkbenchSurfaces();
    const material = new MeshBasicMaterial();
    try {
      const meshes = surfaces
        .filter(({ region }) => region === "case")
        .map(({ geometry }) => new Mesh(geometry, material));
      function hitFrom(origin: Vector3, normal: Vector3) {
        const ray = new Raycaster(origin, normal.clone().negate(), 0, 0.24);
        const [hit] = ray.intersectObjects(meshes);
        if (!hit?.face) throw new Error("Missing toolbox surface");
        return { normal: hit.face.normal, distance: hit.distance };
      }
      for (const x of [-2.93, -2.3]) {
        const up = new Vector3(0, 1, 0);
        expect(
          hitFrom(new Vector3(x, 1.96, 0.31), up).normal.dot(up),
        ).toBeCloseTo(1, 5);
      }
      for (const [origin, normal] of [
        [new Vector3(-2.61, 1.44, 1.05), new Vector3(0, 0, 1)],
        [new Vector3(-2.61, 1.44, -0.44), new Vector3(0, 0, -1)],
        [new Vector3(-3.5, 1.44, 0.31), new Vector3(-1, 0, 0)],
        [new Vector3(-1.71, 1.44, 0.31), new Vector3(1, 0, 0)],
      ] as const) {
        const low = hitFrom(origin, normal);
        const high = hitFrom(origin.clone().setY(1.48), normal);
        expect(low.normal.dot(normal)).toBeGreaterThan(0.995);
        expect(low.normal.dot(high.normal)).toBeCloseTo(1, 5);
        expect(low.distance - high.distance).toBeGreaterThan(0.001);
      }
    } finally {
      material.dispose();
      surfaces.forEach(({ geometry }) => geometry.dispose());
    }
  });

  it("assigns finite atlas coordinates to every triangle", () => {
    const texture = new Texture();
    const model = buildWorkbenchModel(texture);
    try {
      for (const child of meshesIn(model.group)) {
        expect(child.material).toHaveProperty("map", texture);
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
      const keys = [...model.keys.keys()]
        .filter((part) => part.startsWith("laptop-key-"))
        .flatMap((part) => meshesIn(model.parts.get(part)!));
      keys.push(...meshesIn(model.parts.get("laptop")!));
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
        const hit = ray.intersectObjects(keys, false).length > 0;
        if (hit && !previousHit) rows++;
        previousHit = hit;
      }
      expect(rows).toBe(5);
    } finally {
      model.dispose();
    }
  });

  it("releases each mesh while retaining ownership of the atlas", () => {
    const atlas = new Texture();
    const atlasDispose = vi.spyOn(atlas, "dispose");
    const model = buildWorkbenchModel(atlas);
    const geometries = new Set(
      meshesIn(model.group).map((mesh) => mesh.geometry),
    );
    const releases = [...geometries].map((geometry) =>
      vi.spyOn(geometry, "dispose"),
    );
    model.dispose();
    releases.forEach((release) => expect(release).toHaveBeenCalledTimes(1));
    expect(atlasDispose).not.toHaveBeenCalled();
  });
});
