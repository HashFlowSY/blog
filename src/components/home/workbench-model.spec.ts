import { Box3, Mesh, Raycaster, Texture, Vector3 } from "three";
import { describe, expect, it, vi } from "vitest";

import { buildWorkbenchModel } from "./workbench-model";

describe("physical workbench model", () => {
  it("has substantial depth, complete geometry and batched rendering", () => {
    const model = buildWorkbenchModel(new Texture(), new Texture());
    const size = new Box3().setFromObject(model.group).getSize(new Vector3());
    expect(size.x).toBeGreaterThan(7);
    expect(size.y).toBeGreaterThan(7);
    expect(size.z).toBeGreaterThan(4);
    expect(model.partCount).toBeGreaterThan(250);
    const meshes = model.group.children.filter(
      (child) => child instanceof Mesh,
    );
    expect(meshes.length).toBeLessThan(24);
    expect(
      meshes.reduce(
        (sum, mesh) => sum + mesh.geometry.getAttribute("position").count / 3,
        0,
      ),
    ).toBeGreaterThan(20000);
    model.dispose();
  });

  it("models holes through the board rather than painting dots on a flat face", () => {
    const model = buildWorkbenchModel(new Texture(), new Texture());
    model.group.updateMatrixWorld(true);
    const meshes = model.group.children.filter(
      (child) => child instanceof Mesh,
    );
    const x = (-2.88 + 9 * 0.303) * model.group.scale.x,
      y = 3.34 + 7 * 0.303;
    const open = new Raycaster(
      new Vector3(x, y, -5),
      new Vector3(0, 0, 1),
      0,
      3.75,
    );
    const solid = new Raycaster(
      new Vector3(x + 0.1, y, -5),
      new Vector3(0, 0, 1),
      0,
      3.75,
    );
    expect(open.intersectObjects(meshes, false)).toHaveLength(0);
    expect(solid.intersectObjects(meshes, false).length).toBeGreaterThan(0);
    model.dispose();
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
