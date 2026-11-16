import { describe, expect, it } from "vitest";

import { createWorkbenchInteractions } from "./workbench-interactions";

import type { WorkbenchLeaf, WorkbenchPart } from "./workbench-parts";

function workbench(reduceMotion = false) {
  let now = 0;
  let message = "";
  const actions = createWorkbenchInteractions({
    onMessage(next) {
      message = next;
    },
    reducedMotion: () => reduceMotion,
    random: () => 0.999,
  });
  return {
    get message() {
      return message;
    },
    get pose() {
      return actions.pose;
    },
    activate(part: WorkbenchPart) {
      actions.activate(part, now);
      return actions.tick(now, 0);
    },
    sweep(part: WorkbenchLeaf, sign: number) {
      actions.sweep(part, sign, now);
    },
    advance(ms: number, sample?: () => void) {
      const frames = Math.ceil(ms / 16);
      let moving = false;
      for (let i = 0; i < frames; i++) {
        now += ms / frames;
        moving = actions.tick(now, ms / frames / 1000);
        sample?.();
      }
      return moving;
    },
  };
}

describe("2D workbench actions", () => {
  it("settles the light source faster and reverses from the current brightness", () => {
    const view = workbench();
    expect(view.pose).toMatchObject({ lampOn: true, light: 1, sourceLight: 1 });

    expect(view.activate("lamp")).toBe(true);
    expect(view.pose.lampOn).toBe(false);
    expect(view.message).toBe("工作灯已关闭");
    view.advance(64);
    const { light, sourceLight } = view.pose;
    expect(light).toBeGreaterThan(0);
    expect(light).toBeLessThan(1);
    expect(sourceLight).toBeLessThan(light);

    expect(view.activate("lamp")).toBe(true);
    expect(view.pose.lampOn).toBe(true);
    expect(view.pose).toMatchObject({ light, sourceLight });
    expect(view.message).toBe("工作灯已开启");
    view.advance(64);
    expect(view.pose.light).toBeGreaterThan(light);
    expect(view.pose.sourceLight).toBeGreaterThan(sourceLight);
    expect(view.advance(220)).toBe(false);
    expect(view.pose).toMatchObject({ light: 1, sourceLight: 1 });

    view.activate("lamp");
    expect(view.advance(180)).toBe(false);
    expect(view.pose).toMatchObject({ light: 0, sourceLight: 0 });
  });

  it("plays nine distinct keys before drawing and runs only one device at a time", () => {
    const view = workbench();
    for (const [part, device, other] of [
      ["laptop", "laptop", "display"],
      ["display-key-0", "display", "laptop"],
    ] as const) {
      view.activate(part);
      view.activate(other);
      const pressed = new Set<number>();
      let drew = false;
      expect(
        view.advance(4800, () => {
          const { screen } = view.pose;
          if (!screen) return;
          expect(screen.device).toBe(device);
          if (screen.keyIndex !== undefined && screen.keyPress > 0)
            pressed.add(screen.keyIndex);
          if (screen.progress > 0) {
            drew = true;
            expect(screen.keyIndex).toBeUndefined();
            expect(screen.keyGlow).toBe(0);
            expect(screen.clearInk).toBe(1);
          }
        }),
      ).toBe(false);
      expect(pressed.size).toBe(9);
      expect(pressed.has(26)).toBe(true);
      expect(drew).toBe(true);
      expect(view.pose.screen).toBeUndefined();
      expect(view.message).toBe("图纸绘制完成");
    }
  });

  it("swings the swept leaf and its neighbor while a computer plays", () => {
    const view = workbench();
    view.activate("display");
    view.sweep("leaf-0", -1);
    view.advance(64);
    expect(view.pose.swings.get("leaf-0")).toBeLessThan(-0.03);
    expect(view.pose.swings.get("leaf-1")).toBeGreaterThan(0);
    expect(view.pose.swings.has("leaf-2")).toBe(false);
    expect(view.pose.screen?.device).toBe("display");
    view.advance(1600);
    expect(view.pose.swings.size).toBe(0);
    expect(view.pose.screen?.device).toBe("display");
  });

  it("provides feedback without starting animations with reduced motion", () => {
    const view = workbench(true);
    expect(view.activate("laptop")).toBe(false);
    expect(view.pose.screen).toBeUndefined();
    expect(view.message).toBe("图纸已就绪");
    view.sweep("leaf-1", -1);
    expect(view.activate("leaf-0")).toBe(false);
    expect(view.pose.swings.size).toBe(0);
    expect(view.message).toBe("树叶保持静止");
    expect(view.activate("lamp")).toBe(false);
    expect(view.pose).toMatchObject({
      lampOn: false,
      light: 0,
      sourceLight: 0,
    });
    expect(view.activate("lamp")).toBe(false);
    expect(view.pose).toMatchObject({ lampOn: true, light: 1, sourceLight: 1 });
    expect(view.advance(64)).toBe(false);
  });
});
