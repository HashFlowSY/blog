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

function mount({ enabled = true, reducedMotion = false } = {}) {
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
    <WorkbenchInteractive enabled={enabled} progress={100} />,
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
  it("shows the completed artwork and mounts only the seven enabled hotspots", () => {
    const view = mount({ enabled: false });
    expect(screen.queryByRole("group", { name: "二维工作台部件" })).toBeNull();
    expect(
      view.sheet.querySelector('[data-workbench-art="rest"]'),
    ).not.toBeNull();
    view.view.rerender(<WorkbenchInteractive enabled progress={100} />);
    expect(
      screen
        .getAllByRole("button")
        .map((button) => button.getAttribute("aria-label")),
    ).toEqual([
      "盆栽叶片",
      "左侧叶片",
      "右侧叶片",
      "工作灯",
      "笔记本",
      "显示器",
      "外接键盘",
    ]);
    expect(view.sheet.innerHTML).toBe(view.rest);
    expect(view.frames.size).toBe(0);
  });

  it("commits a primary mouse tap on release and cancels drags and off-target releases", () => {
    const view = mount();
    const laptop = view.button("笔记本");
    const other = view.button("显示器");
    view.pointer(laptop, "pointerdown", { button: 2 });
    view.pointer(laptop, "pointerup", { button: 2 });
    expect(view.blueprint()).toBeNull();

    view.pointer(laptop, "pointerdown");
    view.pointer(laptop, "pointermove", { clientX: 104, buttons: 1 });
    view.pointer(laptop, "pointerup");
    expect(view.blueprint()).toBeNull();

    view.pointer(laptop, "pointerdown");
    view.pointer(laptop, "pointerup", {}, other);
    expect(view.blueprint()).toBeNull();
    view.pointer(laptop, "pointerdown");
    view.pointer(other, "pointerup");
    expect(view.blueprint()).toBeNull();
    view.pointer(laptop, "pointerdown");
    view.pointer(laptop, "pointerup", { clientX: 110 });
    expect(view.blueprint()).toBeNull();

    fireEvent.click(laptop, { detail: 1 });
    expect(view.blueprint()).toBeNull();
    view.pointer(laptop, "pointerdown");
    view.pointer(laptop, "pointermove", { clientX: 102, buttons: 1 });
    expect(view.blueprint()).toBeNull();
    view.pointer(laptop, "pointerup", { clientX: 102 });
    fireEvent.click(laptop, { detail: 1 });
    expect(view.blueprint()).toHaveAttribute("data-blueprint-device", "laptop");
    expect(screen.getByRole("status")).toHaveTextContent("笔记本正在打字");
    expect(view.frames.size).toBe(1);
    view.advance(4600);
    expect(view.sheet.innerHTML).toBe(view.rest);
    expect(view.frames.size).toBe(0);
  });

  it("accepts direct touch taps and cancels interrupted or multiple contacts", () => {
    const view = mount({ reducedMotion: true });
    const laptop = view.button("笔记本");
    const other = view.button("显示器");
    const status = screen.getByRole("status");
    const touch = { pointerType: "touch" };

    view.pointer(laptop, "pointerdown", touch);
    view.pointer(laptop, "pointercancel", touch);
    view.pointer(laptop, "pointerup", touch);
    expect(status).toBeEmptyDOMElement();

    view.pointer(laptop, "pointerdown", touch);
    view.pointer(other, "pointerdown", { ...touch, pointerId: 2 });
    view.pointer(laptop, "pointerup", touch);
    view.pointer(other, "pointerup", { ...touch, pointerId: 2 });
    expect(status).toBeEmptyDOMElement();

    view.pointer(laptop, "pointerdown", touch);
    view.pointer(laptop, "pointerout", {
      ...touch,
      relatedTarget: document.body,
    });
    view.pointer(laptop, "pointerup", touch);
    expect(status).toBeEmptyDOMElement();

    view.pointer(laptop, "pointerdown", touch);
    view.pointer(laptop, "lostpointercapture", touch);
    view.pointer(laptop, "pointerup", touch);
    expect(status).toBeEmptyDOMElement();

    view.pointer(laptop, "pointerdown", touch);
    view.pointer(laptop, "pointermove", { ...touch, clientY: 120 });
    view.pointer(laptop, "pointerup", touch);
    expect(status).toBeEmptyDOMElement();

    view.pointer(laptop, "pointerdown", touch);
    view.pointer(laptop, "pointerup", { ...touch, clientY: 108 });
    expect(status).toHaveTextContent("图纸已就绪");
    expect(view.frames.size).toBe(0);
  });

  it("swings the hovered or keyboard-activated leaf and settles back to the original artwork", async () => {
    const view = mount();
    const leaf = view.button("盆栽叶片");
    const nextLeaf = view.button("左侧叶片");
    const laptop = view.button("笔记本");
    view.pointer(leaf, "pointerover", { pointerType: "touch" });
    view.pointer(leaf, "pointerout", { relatedTarget: document.body });
    view.pointer(leaf, "pointerover", { buttons: 1 });
    view.pointer(leaf, "pointerout", { relatedTarget: document.body });
    view.pointer(laptop, "pointerover");
    expect(view.frames.size).toBe(0);

    view.pointer(laptop, "pointermove", { clientX: 200 });
    view.pointer(leaf, "pointerover", { clientX: 180 });
    view.advance(80);
    expect(view.part("leaf-0")?.parentElement).toHaveAttribute(
      "transform",
      expect.stringContaining("rotate(-"),
    );
    expect(view.part("leaf-1")).not.toBeNull();
    expect(view.part("leaf-2")).toBeNull();
    view.advance(1600);
    expect(view.sheet.innerHTML).toBe(view.rest);

    await view.key(nextLeaf, " ");
    view.advance(80);
    expect(nextLeaf).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent("树叶轻摆");
    expect(view.part("leaf-0")).toBeNull();
    expect(view.part("leaf-1")).not.toBeNull();
    expect(view.part("leaf-2")).not.toBeNull();
    view.advance(1600);
    expect(view.sheet.innerHTML).toBe(view.rest);
    expect(view.frames.size).toBe(0);
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
