import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";

import { WorkbenchInteractive } from "./workbench-interactive";

type PointerKind =
  | "pointerdown"
  | "pointermove"
  | "pointerup"
  | "pointercancel"
  | "pointerover"
  | "pointerout"
  | "lostpointercapture";

function mount({
  enabled = true,
  touchActive = false,
  reducedMotion = false,
} = {}) {
  let time = 500;
  let nextId = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const point = vi.fn<() => Element | null>();
  const originalPoint = Object.getOwnPropertyDescriptor(
    document,
    "elementFromPoint",
  );
  Object.defineProperty(document, "elementFromPoint", {
    configurable: true,
    value: point,
  });
  // jsdom event stamps use wall-clock time. Use one manual browser clock for
  // native pointer and keyboard events and the animation frames they start.
  const lifetime = new window.AbortController();
  for (const type of [
    "click",
    "keydown",
    "pointerup",
    "pointermove",
    "pointerover",
  ]) {
    document.addEventListener(
      type,
      (event) => {
        Object.defineProperty(event, "timeStamp", { value: time });
      },
      { capture: true, signal: lifetime.signal },
    );
  }
  vi.stubGlobal("matchMedia", () => ({ matches: reducedMotion }));
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    frames.set(++nextId, callback);
    return nextId;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
    frames.delete(id);
  });
  const view = render(
    <WorkbenchInteractive enabled={enabled} touchActive={touchActive} />,
  );
  onTestFinished(() => {
    lifetime.abort();
    view.unmount();
    if (originalPoint)
      Object.defineProperty(document, "elementFromPoint", originalPoint);
    else Reflect.deleteProperty(document, "elementFromPoint");
  });
  const user = userEvent.setup();
  const sheet = view.container.querySelector("svg")!;
  return {
    view,
    sheet,
    frames,
    rest: sheet.innerHTML,
    button(name: string) {
      return screen.getByRole("button", { name });
    },
    part(name: string) {
      return sheet.querySelector(`[data-workbench-part="${name}"]`);
    },
    blueprint() {
      return sheet.querySelector("[data-blueprint-device]");
    },
    async key(button: HTMLElement, key = "{Enter}") {
      button.focus();
      await user.keyboard(key);
    },
    pointer(
      target: HTMLElement,
      type: PointerKind,
      options: PointerEventInit = {},
      hit: Element | null = target,
    ) {
      point.mockReturnValue(hit);
      fireEvent(
        target,
        new PointerEvent(type, {
          bubbles: true,
          pointerId: 1,
          pointerType: "mouse",
          clientX: 100,
          clientY: 100,
          ...options,
        }),
      );
    },
    advance(ms: number) {
      const target = time + ms;
      act(() => {
        while (time < target && frames.size) {
          time = Math.min(time + 16, target);
          const pending = Array.from(frames.values());
          frames.clear();
          for (const callback of pending) callback(time);
        }
        time = target;
      });
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("2D workbench controls", () => {
  it("shows the completed artwork before the interaction assets are ready", () => {
    const view = mount({ enabled: false });
    expect(screen.queryByRole("group", { name: "二维工作台部件" })).toBeNull();
    expect(
      view.sheet.querySelector('[data-workbench-art="rest"]'),
    ).not.toBeNull();
    view.view.rerender(<WorkbenchInteractive enabled touchActive={false} />);
    expect(view.button("黄色抽屉")).toHaveAttribute("aria-pressed", "false");
    expect(view.sheet.innerHTML).toBe(view.rest);
    expect(view.frames.size).toBe(0);
  });

  it("commits a mouse tap once on release and cancels a drag or a release on another part", () => {
    const view = mount();
    const drawer = view.button("黄色抽屉");
    const other = view.button("中抽屉");
    view.pointer(drawer, "pointerdown", { button: 2 });
    view.pointer(drawer, "pointerup", { button: 2 });
    expect(drawer).toHaveAttribute("aria-pressed", "false");

    view.pointer(drawer, "pointerdown");
    view.pointer(drawer, "pointermove", { clientX: 104, buttons: 1 });
    view.pointer(drawer, "pointerup");
    expect(drawer).toHaveAttribute("aria-pressed", "false");

    view.pointer(drawer, "pointerdown");
    view.pointer(drawer, "pointerup", {}, other);
    expect(drawer).toHaveAttribute("aria-pressed", "false");
    view.pointer(drawer, "pointerdown");
    view.pointer(other, "pointerup");
    expect(other).toHaveAttribute("aria-pressed", "false");
    view.pointer(drawer, "pointerdown");
    view.pointer(drawer, "pointerup", { clientX: 110 });
    expect(drawer).toHaveAttribute("aria-pressed", "false");

    view.pointer(drawer, "pointerdown");
    view.pointer(drawer, "pointermove", { clientX: 102, buttons: 1 });
    expect(drawer).toHaveAttribute("aria-pressed", "false");
    view.pointer(drawer, "pointerup", { clientX: 102 });
    fireEvent.click(drawer, { detail: 1 });
    expect(drawer).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent("拉出黄色抽屉");
    view.advance(1000);
    expect(view.part("drawer-2")).not.toBeNull();
    expect(view.frames.size).toBe(0);
  });

  it("requires touch opt-in and cancels taps on interruption or a second contact", () => {
    const view = mount({ reducedMotion: true });
    const drawer = view.button("黄色抽屉");
    const other = view.button("上抽屉");
    const touch = { pointerType: "touch" };
    view.pointer(drawer, "pointerdown", touch);
    view.pointer(drawer, "pointerup", touch);
    expect(drawer).toHaveAttribute("aria-pressed", "false");

    view.view.rerender(<WorkbenchInteractive enabled touchActive />);
    view.pointer(drawer, "pointerdown", touch);
    view.pointer(drawer, "pointercancel", touch);
    view.pointer(drawer, "pointerup", touch);
    expect(drawer).toHaveAttribute("aria-pressed", "false");

    view.pointer(drawer, "pointerdown", touch);
    view.pointer(other, "pointerdown", { ...touch, pointerId: 2 });
    view.pointer(drawer, "pointerup", touch);
    view.pointer(other, "pointerup", { ...touch, pointerId: 2 });
    expect(drawer).toHaveAttribute("aria-pressed", "false");
    expect(other).toHaveAttribute("aria-pressed", "false");

    view.pointer(drawer, "pointerdown", touch);
    view.pointer(drawer, "pointerout", {
      ...touch,
      relatedTarget: document.body,
    });
    view.pointer(drawer, "pointerup", touch);
    expect(drawer).toHaveAttribute("aria-pressed", "false");

    view.pointer(drawer, "pointerdown", touch);
    view.pointer(drawer, "pointermove", { ...touch, clientY: 120 });
    view.pointer(drawer, "pointerup", touch);
    expect(drawer).toHaveAttribute("aria-pressed", "false");

    view.pointer(drawer, "pointerdown", touch);
    view.pointer(drawer, "pointerup", { ...touch, clientY: 108 });
    expect(drawer).toHaveAttribute("aria-pressed", "true");
    expect(view.frames.size).toBe(0);
    expect(view.part("drawer-2")).not.toBeNull();
  });

  it("keeps keyboard focus on moved drawers and restores the original artwork after closing", async () => {
    const view = mount();
    const yellow = view.button("黄色抽屉");
    const top = view.button("上抽屉");
    const middle = view.button("中抽屉");
    const restPosition = yellow.style.left;

    await view.key(yellow, " ");
    view.advance(340);
    expect(yellow).toHaveFocus();
    expect(yellow.style.left).not.toBe(restPosition);
    expect(view.part("drawer-2")).not.toBeNull();
    expect(
      view.sheet.querySelector('[href$="/drawer-2-open.webp"]'),
    ).not.toBeNull();

    await view.key(top);
    view.advance(100);
    expect(view.part("drawer-2")).not.toBeNull();
    expect(view.part("drawer-0")).toBeNull();
    await view.key(middle);
    view.advance(1500);
    expect(view.part("drawer-0")).toBeNull();
    expect(view.part("drawer-2")).toBeNull();
    expect(view.part("drawer-1")).not.toBeNull();
    expect(middle).toHaveFocus();
    expect(middle).toHaveAttribute("aria-pressed", "true");
    await view.key(middle);
    view.advance(1000);
    expect(view.sheet.innerHTML).toBe(view.rest);
    expect(view.frames.size).toBe(0);
  });

  it("renders the toolbox, stool and lamp separately and returns each to the source frame", async () => {
    const view = mount();
    const box = view.button("工具箱");
    const stool = view.button("圆凳");
    const lamp = view.button("工作灯");
    await view.key(box);
    await view.key(stool);
    await view.key(lamp);
    view.advance(40);
    expect(view.part("case-latches")).not.toBeNull();
    expect(view.part("case-lid")).toBeNull();
    expect(view.part("stool")).not.toBeNull();
    expect(view.part("lamp-diffuser")).toHaveAttribute(
      "style",
      expect.stringContaining("brightness("),
    );
    expect(lamp).toHaveAttribute("aria-pressed", "false");
    view.advance(1400);
    expect(view.part("case-latches")).toBeNull();
    expect(
      view.part("case-lid")?.querySelector('[href$="/case-base-open.webp"]'),
    ).toHaveAttribute("opacity", "1");

    await view.key(box);
    view.advance(200);
    expect(view.part("case-lid")).not.toBeNull();
    await view.key(box);
    view.advance(1100);
    expect(box).toHaveAttribute("aria-pressed", "true");
    expect(
      view.part("case-lid")?.querySelector('[href$="/case-base-open.webp"]'),
    ).toHaveAttribute("opacity", "1");
    await view.key(box);
    await view.key(stool);
    await view.key(lamp);
    view.advance(1500);
    expect(view.sheet.innerHTML).toBe(view.rest);
  });

  it("sweeps only the hovered tool and replaces mouse feedback on the next press", async () => {
    const view = mount();
    const wrench = view.button("扳手 1");
    const nextTool = view.button("扳手 2");
    const leaf = view.button("盆栽叶片");
    view.pointer(wrench, "pointerover", { pointerType: "touch" });
    view.pointer(wrench, "pointerout", { relatedTarget: document.body });
    view.pointer(wrench, "pointerover", { buttons: 1 });
    expect(view.frames.size).toBe(0);
    view.pointer(wrench, "pointerout", { relatedTarget: document.body });
    view.pointer(nextTool, "pointermove", { clientX: 200 });
    view.pointer(wrench, "pointerover", { clientX: 180 });
    await view.key(leaf);
    view.advance(80);
    expect(view.part("wrench-0")).not.toBeNull();
    expect(view.part("wrench-1")).toBeNull();
    expect(view.part("leaf-0")).not.toBeNull();

    await view.key(view.button("鼠标左键"));
    view.advance(90);
    expect(view.part("mouse-left")).not.toBeNull();
    await view.key(view.button("鼠标右键"));
    view.advance(90);
    expect(view.part("mouse-left")).toBeNull();
    expect(view.part("mouse-right")).not.toBeNull();
    view.advance(1700);
    expect(view.sheet.innerHTML).toBe(view.rest);
  });

  it("keeps the handle at a partial turn after losing capture and supports keyboard adjustment", async () => {
    const view = mount();
    const handle = view.button("台钳手柄");
    const layer = screen.getByRole("group", { name: "二维工作台部件" });
    vi.spyOn(layer, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 82, 1440, 682),
    );
    const capture = vi.fn();
    Object.defineProperty(handle, "setPointerCapture", { value: capture });

    view.pointer(handle, "pointerdown", { clientX: 1144, clientY: 452 });
    expect(capture).toHaveBeenCalledWith(1);
    view.pointer(handle, "pointermove", {
      clientX: 1146,
      clientY: 452,
      buttons: 1,
    });
    expect(view.part("vise-handle")).toBeNull();
    view.pointer(handle, "pointermove", {
      clientX: 1164,
      clientY: 435,
      buttons: 1,
    });
    view.pointer(handle, "lostpointercapture");
    expect(view.part("vise-handle")).not.toBeNull();
    expect(view.part("vise-stock")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("钳口停在当前位置");
    const partial = view
      .part("vise-handle")
      ?.parentElement?.getAttribute("transform");
    view.pointer(handle, "pointermove", {
      clientX: 1164,
      clientY: 414,
      buttons: 1,
    });
    expect(view.part("vise-handle")?.parentElement).toHaveAttribute(
      "transform",
      partial,
    );

    await view.key(handle, "{ArrowRight}");
    expect(
      view.part("vise-handle")?.parentElement?.getAttribute("transform"),
    ).not.toBe(partial);
    await view.key(handle, "{ArrowLeft}");
    await view.key(handle);
    view.advance(1600);
    expect(view.sheet.innerHTML).toBe(view.rest);
  });

  it("drops the released wood and returns it before the clamp closes", async () => {
    const view = mount();
    const handle = view.button("台钳手柄");
    await view.key(handle);
    view.advance(920);
    expect(screen.getByRole("status")).toHaveTextContent("木块正在落下");
    expect(view.part("vise-stock")).not.toBeNull();
    const falling = view
      .part("vise-stock")
      ?.parentElement?.getAttribute("transform");
    view.advance(1500);
    expect(screen.getByRole("status")).toHaveTextContent("木块已落到地面");
    const grounded = view
      .part("vise-stock")
      ?.parentElement?.getAttribute("transform");
    expect(grounded).not.toBe(falling);

    await view.key(handle);
    view.advance(1770);
    expect(screen.getByRole("status")).toHaveTextContent("木块正在复位");
    expect(handle).toHaveAttribute("aria-pressed", "true");
    expect(
      view.part("vise-stock")?.parentElement?.getAttribute("transform"),
    ).not.toBe(grounded);
    view.advance(1700);
    expect(screen.getByRole("status")).toHaveTextContent(
      "钳口已合拢，木块已复位",
    );
    expect(view.sheet.innerHTML).toBe(view.rest);
  });

  it("lights keys before revealing each screen and leaves the other screen unchanged", async () => {
    const view = mount();
    const laptop = view.button("笔记本");
    const display = view.button("外接键盘");
    await view.key(laptop);
    await view.key(display);
    view.advance(82);
    expect(view.blueprint()).toHaveAttribute("data-blueprint-device", "laptop");
    expect(view.blueprint()).toHaveAttribute("data-phase", "typing");
    expect(view.blueprint()?.querySelector(":scope > path")).not.toBeNull();
    expect(view.blueprint()?.querySelector("mask path")).toBeNull();

    view.advance(2200);
    expect(view.blueprint()).toHaveAttribute("data-phase", "drawing");
    expect(view.blueprint()?.querySelector(":scope > path")).toBeNull();
    const strokes = view.blueprint()?.querySelectorAll("mask path").length;
    expect(strokes).toBeGreaterThan(0);
    view.advance(1200);
    expect(
      view.blueprint()?.querySelectorAll("mask path").length,
    ).toBeGreaterThan(strokes!);
    view.advance(1500);
    expect(view.blueprint()).toBeNull();
    expect(view.sheet.innerHTML).toBe(view.rest);

    await view.key(display);
    view.advance(82);
    expect(view.blueprint()).toHaveAttribute(
      "data-blueprint-device",
      "display",
    );
    expect(view.blueprint()?.querySelector(":scope > path")).not.toBeNull();
    view.advance(4600);
    expect(screen.getByRole("status")).toHaveTextContent("图纸绘制完成");
    expect(view.sheet.innerHTML).toBe(view.rest);
    expect(view.frames.size).toBe(0);
  });

  it("cancels outstanding animation frames when the workbench is unmounted", async () => {
    const view = mount();
    await view.key(view.button("笔记本"));
    expect(view.frames.size).toBe(1);
    view.view.unmount();
    expect(view.frames.size).toBe(0);
  });
});
