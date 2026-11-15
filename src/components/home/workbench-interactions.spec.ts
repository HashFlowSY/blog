import { describe, expect, it } from "vitest";

import { createWorkbenchInteractions } from "./workbench-interactions";

import type { WorkbenchPart } from "./workbench-parts";

function workbench(reduceMotion = false) {
  let now = 0;
  let message = "";
  const actions = createWorkbenchInteractions({
    onMessage(next) {
      message = next;
    },
    leaves: ["leaf-7", "leaf-8"],
    reducedMotion: () => reduceMotion,
    random: () => 0,
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
    sweep(part: WorkbenchPart, sign: number) {
      actions.sweep(part, sign, now);
    },
    turnVise(radians: number) {
      actions.startTurningVise();
      actions.turnVise(radians, now);
      actions.stopTurningVise();
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
  it("seats the active drawer before extending the latest requested drawer", () => {
    const view = workbench();
    const initial = view.pose;
    view.activate("drawer-2");
    view.advance(250);
    const startingClose = view.pose.drawers["drawer-2"];
    view.activate("drawer-0");
    view.advance(80);
    expect(view.pose.drawers["drawer-2"]).toBeLessThan(startingClose);
    expect(view.pose.drawers["drawer-2"]).toBeGreaterThan(0);
    expect(view.pose.drawers["drawer-0"]).toBe(0);

    view.activate("drawer-1");
    view.advance(1500, () => {
      const slides = Object.values(view.pose.drawers);
      expect(slides.filter((slide) => slide > 0).length).toBeLessThanOrEqual(1);
      expect(view.pose.drawers["drawer-0"]).toBe(0);
    });
    expect(view.pose.activeDrawer).toBe("drawer-1");
    expect(view.pose.drawers["drawer-1"]).toBe(1);

    view.activate("drawer-1");
    expect(view.advance(1200)).toBe(false);
    expect(view.pose).toEqual(initial);
    expect(view.message).toBe("合上中抽屉");
  });

  it("unlatches before opening the lid and latches again after it seats", () => {
    const view = workbench();
    view.activate("case-lid");
    view.activate("stool");
    view.advance(55);
    expect(view.pose.latch).toBeGreaterThan(0);
    expect(view.pose.lid).toBe(0);
    expect(view.advance(1300)).toBe(false);
    expect(view.pose.lid).toBe(1);
    expect(view.pose.stoolSlide).toBe(1);

    view.activate("case-base");
    view.advance(160, () => {
      expect(view.pose.latch).toBe(1);
    });
    expect(view.pose.lid).toBeGreaterThan(0);
    expect(view.pose.lid).toBeLessThan(1);

    const reversingPosition = view.pose.lid;
    view.activate("case-latches");
    expect(view.pose.lid).toBe(reversingPosition);
    view.advance(60);
    expect(view.pose.lid).toBeGreaterThan(reversingPosition);
    view.activate("case-base");
    view.activate("stool");
    expect(view.advance(1500)).toBe(false);
    expect(view.pose.lid).toBe(0);
    expect(view.pose.latch).toBe(0);
    expect(view.pose.stoolSlide).toBe(0);
  });

  it("plays each screen's nine distinct keys before revealing its drawing", () => {
    const view = workbench();
    view.activate("laptop-screen");
    view.activate("display-screen");
    const pressed = new Set<number>();
    let drew = false;
    expect(
      view.advance(4800, () => {
        const { screen } = view.pose;
        if (!screen) return;
        expect(screen.device).toBe("laptop");
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
    expect(drew).toBe(true);
    expect(view.pose.screen).toBeUndefined();
    expect(view.message).toBe("图纸绘制完成");

    view.activate("display-key-1");
    view.advance(400);
    expect(view.pose.screen?.device).toBe("display");
    expect(view.pose.screen?.clearInk).toBe(1);
    expect(view.advance(4400)).toBe(false);
    expect(view.pose.screen).toBeUndefined();
  });

  it("swings only the target tool and animates the touched leaf and its neighbor", () => {
    const view = workbench();
    view.sweep("leaf-7", -1);
    view.sweep("wrench-931", 1);
    view.sweep("wrench-931", -1);
    view.advance(64);
    expect(view.pose.swings.get("leaf-7")).toBeLessThan(-0.03);
    expect(view.pose.swings.get("leaf-8")).toBeGreaterThan(0);
    expect(view.pose.swings.get("wrench-931")).toBeGreaterThan(0.015);
    expect(view.pose.swings.has("wrench-954")).toBe(false);
    expect(view.advance(1600)).toBe(false);
    expect(view.pose.swings.size).toBe(0);
  });

  it("keeps the lamp switched off and replaces mouse feedback with the last button pressed", () => {
    const view = workbench();
    view.activate("lamp");
    view.activate("mouse-left");
    view.advance(120);
    expect(view.pose.light).toBeLessThan(1);
    expect(view.pose.mouse).toEqual({ part: "mouse-left", press: 1, glow: 1 });
    view.activate("mouse-right");
    view.advance(120);
    expect(view.pose.mouse).toEqual({ part: "mouse-right", press: 1, glow: 1 });
    expect(view.advance(600)).toBe(false);
    expect(view.pose.mouse).toBeUndefined();
    expect(view.pose.light).toBe(0);
    view.activate("lamp-diffuser");
    expect(view.advance(600)).toBe(false);
    expect(view.pose.light).toBe(1);
  });

  it("keeps a partial turn and waits for the wood to return before clamping", () => {
    const view = workbench();
    view.turnVise(Math.PI / 2);
    view.advance(300);
    expect(view.pose.vise.opening).toBeCloseTo(1 / 12);
    expect(view.pose.vise.handleAngle).toBeCloseTo(Math.PI / 2);
    expect(view.pose.vise.stock.phase).toBe("held");
    expect(view.message).toBe("钳口停在当前位置");
    view.turnVise(-Math.PI / 2);
    expect(view.pose.vise.opening).toBe(0);

    view.activate("vise-handle");
    view.advance(760);
    expect(view.pose.vise.stock.phase).toBe("falling");
    expect(view.pose.vise.stock.progress).toBeGreaterThan(0);
    expect(view.advance(1600)).toBe(false);
    expect(view.pose.vise.opening).toBe(1);
    expect(view.pose.vise.handleAngle).toBeCloseTo(Math.PI * 6);
    expect(view.pose.vise.stock).toEqual({ phase: "grounded", progress: 1 });
    expect(view.message).toBe("木块已落到地面");

    view.activate("vise-handle");
    let sawReturn = false;
    expect(
      view.advance(3500, () => {
        const { vise } = view.pose;
        if (vise.stock.phase === "returning" && vise.stock.progress < 1) {
          sawReturn = true;
          expect(vise.opening).toBeGreaterThan(0);
        }
      }),
    ).toBe(false);
    expect(sawReturn).toBe(true);
    expect(view.pose.vise).toEqual({
      opening: 0,
      handleAngle: 0,
      stock: { phase: "held", progress: 0 },
    });
    expect(view.message).toBe("钳口已合拢，木块已复位");
  });

  it("settles directly with reduced motion", () => {
    const view = workbench(true);
    expect(view.activate("drawer-2")).toBe(false);
    expect(view.pose.drawers["drawer-2"]).toBe(1);
    expect(view.activate("drawer-0")).toBe(false);
    expect(view.pose.drawers).toEqual({
      "drawer-0": 1,
      "drawer-1": 0,
      "drawer-2": 0,
    });
    expect(view.activate("case-lid")).toBe(false);
    expect(view.pose.latch).toBe(1);
    expect(view.pose.lid).toBe(1);
    expect(view.activate("vise-handle")).toBe(false);
    expect(view.pose.vise.stock.phase).toBe("grounded");
    expect(view.activate("vise-handle")).toBe(false);
    expect(view.pose.vise.stock.phase).toBe("held");
    expect(view.activate("laptop")).toBe(false);
    expect(view.pose.screen).toBeUndefined();
    expect(view.message).toBe("图纸已就绪");

    expect(view.advance(64)).toBe(false);
  });
});
