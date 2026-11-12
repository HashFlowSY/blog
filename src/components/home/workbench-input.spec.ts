import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Vector3,
} from "three";
import { describe, expect, it, onTestFinished, vi } from "vitest";

import { createWorkbenchInput } from "./workbench-input";

import type { WorkbenchPart } from "./workbench-parts";

function viewer() {
  const camera = new PerspectiveCamera(44, 1, 0.1, 20);
  camera.position.z = 6;
  camera.updateMatrixWorld();
  const canvas = document.createElement("canvas");
  canvas.getBoundingClientRect = () => new DOMRect(0, 0, 200, 200);
  const group = new Group();
  const shape = new BoxGeometry(0.5, 0.5, 0.15);
  const material = new MeshBasicMaterial();
  function piece(x: number, y: number, z: number, part?: WorkbenchPart) {
    const mesh = new Mesh(shape, material);
    mesh.position.set(x, y, z);
    mesh.userData["part"] = part;
    group.add(mesh);
    return mesh;
  }
  piece(-1, 0, 0, "drawer-2");
  piece(0, 1, 0, "leaf-7");
  piece(1, 0, 0, "vise-grip");
  const cover = piece(-0.84, 0, 0.9);
  const motion = {
    activate: vi.fn(),
    sweep: vi.fn(),
    visePivot: (out: Vector3) => out.set(0.65, 0, 0),
    startTurningVise: vi.fn(),
    turnVise: vi.fn(),
    stopTurningVise: vi.fn(),
  };
  const frame = vi.fn();
  const input = createWorkbenchInput(canvas, camera, group, motion, frame);
  onTestFinished(() => {
    input.dispose();
    shape.dispose();
    material.dispose();
  });

  return {
    canvas,
    cover,
    frame,
    input,
    motion,
    point(x: number, y: number) {
      const pos = new Vector3(x, y, 0).project(camera);
      return { clientX: 100 + pos.x * 100, clientY: 100 - pos.y * 100 };
    },
    send(
      type: string,
      at: { clientX: number; clientY: number },
      init: PointerEventInit = {},
    ) {
      canvas.dispatchEvent(
        new PointerEvent(type, {
          pointerId: 1,
          pointerType: "mouse",
          bubbles: true,
          ...at,
          ...init,
        }),
      );
    },
  };
}

describe("workbench pointer input", () => {
  it("hits visible parts, gives dragging to the camera and abandons a touch when pinching", () => {
    const view = viewer();
    const drawer = view.point(-1, 0);
    expect(view.input.hitPart(drawer.clientX, drawer.clientY)).toBe(false);
    view.cover.position.y = 2;
    expect(view.input.hitPart(drawer.clientX, drawer.clientY)).toBe(true);
    const orbit = vi.fn();
    view.canvas.addEventListener("pointermove", orbit);
    view.send("pointerdown", drawer);
    view.send("pointermove", { ...drawer, clientX: drawer.clientX + 2 });
    expect(orbit).not.toHaveBeenCalled();
    view.send("pointermove", { ...drawer, clientX: drawer.clientX + 5 });
    expect(orbit).toHaveBeenCalledOnce();
    view.send("pointerup", drawer);
    expect(view.motion.activate).not.toHaveBeenCalled();

    view.send("pointerdown", drawer, { pointerType: "touch" });
    view.send("pointerdown", drawer, { pointerId: 2, pointerType: "touch" });
    view.send("pointerup", drawer, { pointerId: 2, pointerType: "touch" });
    view.send("pointerup", drawer, { pointerType: "touch" });
    expect(view.motion.activate).not.toHaveBeenCalled();
    view.send("pointerdown", drawer, { pointerType: "touch" });
    view.send(
      "pointermove",
      { ...drawer, clientX: drawer.clientX + 5 },
      { pointerType: "touch" },
    );
    view.send("pointerup", drawer, { pointerType: "touch" });
    expect(view.motion.activate).toHaveBeenCalledExactlyOnceWith("drawer-2");
  });

  it("only adds a leaf impulse on entry and does not start it while orbiting", () => {
    const view = viewer();
    const leaf = view.point(0, 1);
    view.send("pointermove", leaf);
    expect(view.frame).toHaveBeenCalledOnce();
    view.input.updateHover(true);
    expect(view.motion.sweep).not.toHaveBeenCalled();
    view.send("pointermove", { ...leaf, clientX: leaf.clientX - 2 });
    view.input.updateHover(false);
    expect(view.motion.sweep).toHaveBeenCalledExactlyOnceWith("leaf-7", -1);
    expect(view.canvas.dataset["actionable"]).toBe("true");
    view.send("pointermove", leaf);
    view.input.updateHover(false);
    expect(view.motion.sweep).toHaveBeenCalledOnce();
    view.send("pointerleave", leaf);
    expect(view.canvas.dataset["actionable"]).toBeUndefined();
  });

  it("turns a grabbed vise along the arc and ends the crank on pointer cancellation", () => {
    const view = viewer();
    const grip = view.point(1, 0);
    view.send("pointerdown", grip);
    const end = view.point(0.65, 0.4);
    view.send("pointermove", end);
    expect(view.motion.startTurningVise).toHaveBeenCalledOnce();
    expect(view.motion.turnVise.mock.calls[0]?.[0]).toBeCloseTo(Math.PI / 2, 2);
    view.send("pointercancel", end);
    expect(view.motion.stopTurningVise).toHaveBeenCalledOnce();
    expect(view.motion.activate).not.toHaveBeenCalled();
  });
});
