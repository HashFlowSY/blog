import { Group, Mesh, MeshBasicMaterial, Texture } from "three";
import { describe, expect, it, onTestFinished, vi } from "vitest";

import { createWorkbenchInteractions } from "./workbench-interactions";
import { buildWorkbenchModel } from "./workbench-model";

import type { WorkbenchDevice, WorkbenchPart } from "./workbench-parts";

function workbench() {
  let time = 0;
  const clock = vi.spyOn(performance, "now").mockImplementation(() => time);
  const atlas = new Texture();
  const model = buildWorkbenchModel(atlas);
  const drawings = new Map<
    WorkbenchDevice,
    { panel: Group; progress: number; clearInk: number }
  >();
  let message = "";
  const actions = createWorkbenchInteractions(
    model,
    (device) => {
      // Record the animation at its GPU boundary; Playwright exercises the actual shader.
      const drawing = { panel: new Group(), progress: 0, clearInk: 0 };
      drawings.set(device, drawing);
      return {
        panel: drawing.panel,
        update(clearInk, progress) {
          Object.assign(drawing, { clearInk, progress });
        },
        dispose() {
          drawing.panel.removeFromParent();
        },
      };
    },
    { matches: false },
    (next) => {
      message = next;
    },
    () => {},
  );
  onTestFinished(() => {
    clock.mockRestore();
    actions.dispose();
    model.dispose();
    atlas.dispose();
  });
  return {
    actions,
    drawings,
    get message() {
      return message;
    },
    part: (name: WorkbenchPart) => model.parts.get(name)!,
    keys: [...model.keys.keys()].map((name) => model.parts.get(name)!),
    advance(ms: number, sample?: () => void) {
      const frames = Math.ceil(ms / 16);
      let moving = false;
      for (let i = 0; i < frames; i++) {
        time += ms / frames;
        moving = actions.tick(time, ms / frames / 1000);
        sample?.();
      }
      return moving;
    },
  };
}

describe("assembled workbench actions", () => {
  it("seats one drawer before extending the next and closes parts on the next press", () => {
    const view = workbench();
    const yellow = view.part("drawer-2");
    const top = view.part("drawer-0");
    const stool = view.part("stool");
    const base = view.part("case-base");
    const lid = view.part("case-lid");
    const latches = view.part("case-latches");
    view.actions.activate("drawer-2");
    view.actions.activate("case-lid");
    view.actions.activate("stool");
    view.advance(55);
    expect(latches.rotation.x).toBeGreaterThan(0);
    expect(lid.rotation.x).toBeCloseTo(0);
    expect(view.advance(1300)).toBe(false);
    expect(yellow.position.z).toBeGreaterThan(0.5);
    expect(stool.position.x).toBeLessThan(-0.5);
    expect(stool.position.y).toBe(0);
    expect(lid.rotation.x).toBeLessThan(-1);
    expect(base.rotation.x).toBe(0);

    view.actions.activate("drawer-0");
    view.actions.activate("case-lid");
    view.advance(150);
    expect(yellow.position.z).toBeGreaterThan(0);
    expect(top.position.z).toBe(0);
    expect(lid.rotation.x).toBeLessThan(0);
    expect(latches.rotation.x).toBeGreaterThan(0.4);
    let overlapped = false;
    view.advance(1500, () => {
      overlapped ||= yellow.position.z > 0 && top.position.z > 0;
    });
    expect(overlapped).toBe(false);
    expect(top.position.z).toBeGreaterThan(0.5);
    expect(lid.rotation.x).toBeCloseTo(0);
    expect(latches.rotation.x).toBe(0);

    view.actions.activate("drawer-0");
    view.actions.activate("stool");
    view.advance(1300);
    expect(top.position.z).toBe(0);
    expect(stool.position.x).toBeCloseTo(0);
    expect(view.actions.changedPose).toBe(false);
  });

  it("presses and lights individual keys before revealing their own screen drawing", () => {
    const view = workbench();
    view.actions.activate("laptop-screen");
    view.actions.activate("display-screen");
    expect(view.drawings.has("display")).toBe(false);
    const drawing = view.drawings.get("laptop")!;
    const pressed = new Set<string>();
    let inkWithKeyDown = false;
    let simultaneousRims = false;
    let sawPartialDrawing = false;
    view.advance(4800, () => {
      const keys = view.keys.filter(({ position }) => position.y < -0.001);
      for (const key of keys) pressed.add(key.name);
      simultaneousRims ||=
        view.keys.filter((key) => key.children[1]?.visible).length > 1;
      inkWithKeyDown ||= drawing.progress > 0 && keys.length > 0;
      sawPartialDrawing ||= drawing.progress > 0.1 && drawing.progress < 0.8;
    });
    expect(pressed.size).toBe(9);
    expect([...pressed].every((key) => key.startsWith("laptop-key-"))).toBe(
      true,
    );
    expect(simultaneousRims).toBe(false);
    expect(inkWithKeyDown).toBe(false);
    expect(sawPartialDrawing).toBe(true);
    expect(drawing.panel.visible).toBe(false);
    expect(view.message).toBe("图纸绘制完成");

    view.actions.activate("display-screen");
    view.advance(410);
    expect(view.drawings.get("display")?.clearInk).toBe(1);
    view.advance(4400);
    expect(
      view.keys.every(
        (key) => key.position.y === 0 && !key.children[1]?.visible,
      ),
    ).toBe(true);
    expect(view.drawings.get("display")?.panel.visible).toBe(false);
  });

  it("lets a leaf and a single tool swing without moving their mounts", () => {
    const view = workbench();
    const leaf = view.part("leaf-7");
    const wrench = view.part("wrench-931");
    const otherTool = view.part("wrench-954");
    view.actions.sweep("leaf-7", -1);
    view.actions.sweep("wrench-931", 1);
    view.actions.sweep("wrench-931", -1);
    view.advance(64);
    expect(leaf.rotation.z).toBeLessThan(-0.03);
    expect(wrench.rotation.z).toBeGreaterThan(0.015);
    expect(otherTool.rotation.z).toBe(0);
    expect(leaf.position.lengthSq()).toBe(0);
    view.advance(1600);
    expect(wrench.rotation.z).toBe(0);
    expect(leaf.rotation.z).toBe(0);
  });

  it("dims the work light and lights only the pressed mouse button", () => {
    const view = workbench();
    const diffuser = view.part("lamp-diffuser").children[0];
    if (
      !(diffuser instanceof Mesh) ||
      !(diffuser.material instanceof MeshBasicMaterial)
    )
      throw new Error("Missing work light diffuser");
    const left = view.part("mouse-left");
    const right = view.part("mouse-right");
    view.actions.activate("lamp");
    view.actions.activate("mouse-left");
    view.advance(120);
    expect(diffuser.material.color.getHex()).not.toBe(0xffffff);
    expect(left.children[1]?.visible).toBe(true);
    expect(right.children[1]?.visible).toBe(false);
    expect(Math.abs(left.rotation.x)).toBeGreaterThan(0);
    view.actions.activate("mouse-right");
    view.advance(120);
    expect(left.children[1]?.visible).toBe(false);
    expect(right.children[1]?.visible).toBe(true);
    view.advance(600);
    expect(right.children[1]?.visible).toBe(false);
  });

  it("bounces the released wood at the desk and floor, then arcs into the jaws", () => {
    const view = workbench();
    const wood = view.part("vise-stock");
    const jaw = view.part("vise-slide");
    const handle = view.part("vise-handle");
    const held = wood.position.clone();
    const jawRest = jaw.position.z;
    view.actions.startTurningVise();
    view.actions.turnVise(Math.PI / 2);
    view.actions.stopTurningVise();
    view.advance(300);
    expect(jaw.position.z - jawRest).toBeGreaterThan(0.015);
    expect(jaw.position.z - jawRest).toBeLessThan(0.021);
    expect(handle.rotation.z).toBeCloseTo(Math.PI / 2, 5);
    expect(wood.position.distanceTo(held)).toBe(0);
    expect(view.message).toBe("钳口停在当前位置");
    view.actions.startTurningVise();
    view.actions.turnVise(-Math.PI / 2);
    view.actions.stopTurningVise();
    expect(jaw.position.z).toBeCloseTo(jawRest, 6);

    const heights: number[] = [];
    view.actions.activate("vise-grip");
    view.advance(2800, () => {
      heights.push(wood.position.y);
    });
    const onFloor = wood.position.clone();
    expect(view.message).toBe("木块已落到地面");
    expect(onFloor.y).toBeLessThan(held.y - 3);
    const impacts = heights.filter(
      (y, i) =>
        i > 0 &&
        i + 1 < heights.length &&
        heights[i - 1]! > y &&
        heights[i + 1]! > y,
    );
    expect(impacts.some((y) => y > onFloor.y + 2)).toBe(true);
    expect(impacts.some((y) => Math.abs(y - onFloor.y) < 0.03)).toBe(true);

    view.actions.activate("vise-grip");
    let highest = onFloor.y;
    let midHeight = onFloor.y;
    let prematureClamp = false;
    view.advance(3300, () => {
      const progress = (wood.position.x - onFloor.x) / (held.x - onFloor.x);
      highest = Math.max(highest, wood.position.y);
      if (progress > 0.45 && progress < 0.55) midHeight = wood.position.y;
      if (progress > 0 && progress < 0.99)
        prematureClamp ||= jaw.position.z <= jawRest + 0.02;
    });
    expect(midHeight).toBeGreaterThan((held.y + onFloor.y) / 2 + 0.5);
    expect(highest).toBeGreaterThan(held.y + 0.2);
    expect(prematureClamp).toBe(false);
    expect(wood.position.distanceTo(held)).toBeLessThan(1e-7);
    expect(jaw.position.z).toBeCloseTo(jawRest, 6);
    expect(view.message).toBe("钳口已合拢，木块已复位");
  });
});
