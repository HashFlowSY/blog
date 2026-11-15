import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AssemblyWorkbench } from "./assembly-workbench";
import { drawingDuration, drawingTime } from "./pencil-plan";
import { WorkbenchDrawing } from "./workbench-drawing";
import { drawingAreas, pointStrokes } from "./workbench-geometry";

describe("AssemblyWorkbench", () => {
  it("only shows a positioning dot after the pencil has touched that point", () => {
    const { container, rerender } = render(<WorkbenchDrawing progress={0} />);
    const initialMarks = Array.from(
      container.querySelectorAll('[data-construction-layer="points"] circle'),
    ).filter(
      (circle) =>
        circle.getAttribute("visibility") !== "hidden" &&
        Number(circle.getAttribute("opacity") ?? "1") > 0,
    );
    expect(initialMarks).toHaveLength(0);
    for (const stroke of pointStrokes) {
      rerender(<WorkbenchDrawing progress={stroke.start - 0.0001} />);
      const circle = container.querySelector(
        `circle[data-pencil-point="${stroke.id}"]`,
      );
      expect(circle).not.toBeNull();
      expect(circle).toHaveAttribute("visibility", "hidden");
      rerender(<WorkbenchDrawing progress={(stroke.start + stroke.end) / 2} />);
      expect(circle).toHaveAttribute("visibility", "visible");
      expect(Number(circle?.getAttribute("opacity"))).toBeGreaterThan(0);
    }
    rerender(<WorkbenchDrawing progress={18} />);
    const paths = container.querySelectorAll("[data-pencil-path]");
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      expect(path).toHaveAttribute("visibility", "hidden");
    }
  });

  let time: number;
  let nextId: number;
  let frames: Map<number, FrameRequestCallback>;
  type VisibilityEntry = Pick<
    IntersectionObserverEntry,
    "isIntersecting" | "intersectionRatio"
  >;
  let visibilityChanged: (entries: VisibilityEntry[]) => void;

  beforeEach(() => {
    document.documentElement.style.setProperty(
      "--studio-header-height",
      "82px",
    );
    time = 0;
    nextId = 0;
    frames = new Map();
    vi.spyOn(performance, "now").mockImplementation(() => time);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.set(++nextId, callback);
      return nextId;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      frames.delete(id);
    });
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: false })),
    );
    vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(292);
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: typeof visibilityChanged) {
          visibilityChanged = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    document.documentElement.style.removeProperty("--studio-header-height");
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function advanceTo(nextTime: number) {
    time = nextTime;
    const pending = Array.from(frames.values());
    frames.clear();
    act(() => pending.forEach((callback) => callback(time)));
  }

  function scene() {
    return screen
      .getByRole("region", { name: "交互工作台" })
      .querySelector("[data-drawing-state]")!;
  }

  function revealCanvas(intersectionRatio = 1) {
    act(() => visibilityChanged([{ isIntersecting: true, intersectionRatio }]));
  }

  it("waits for a visible canvas and draws from the start on each mount", () => {
    const first = render(<AssemblyWorkbench />);
    revealCanvas(0.39);
    advanceTo(1200);
    expect(scene()).toHaveAttribute("data-progress", "0");
    expect(scene()).toHaveAttribute("data-drawing-state", "waiting");
    revealCanvas(0.6);
    expect(scene()).toHaveAttribute("data-drawing-state", "drawing");
    advanceTo(2400);
    expect(Number(scene().getAttribute("data-progress"))).toBeGreaterThan(0);
    first.unmount();
    expect(frames.size).toBe(0);
    render(<AssemblyWorkbench />);
    expect(scene()).toHaveAttribute("data-progress", "0");
    revealCanvas();
    advanceTo(3600);
    expect(Number(scene().getAttribute("data-progress"))).toBeGreaterThan(0);
  });

  it("releases each completed area before enabling the finished workbench", () => {
    render(<AssemblyWorkbench />);
    revealCanvas();
    const first = drawingAreas[0]!;
    const second = drawingAreas[1]!;
    const firstArea = `[data-drawing-area="${first.id}"]`;
    const secondArea = `[data-drawing-area="${second.id}"]`;

    advanceTo(drawingTime(first.end - 0.01));
    expect(scene().querySelector(firstArea)).toBeInTheDocument();
    advanceTo(drawingTime((first.end + second.strokes[0]!.start) / 2));
    expect(scene().querySelector(firstArea)).not.toBeInTheDocument();
    expect(scene().querySelector(secondArea)).toBeInTheDocument();
    expect(scene().querySelector('[data-workbench-art="rest"]')).toBeNull();
    expect(
      screen.getByRole("img", { name: "正在绘制的工作台" }),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    advanceTo(drawingDuration);
    expect(
      scene().querySelector('[data-workbench-art="rest"]'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "正在绘制的工作台" }),
    ).not.toBeInTheDocument();
    expect(scene()).toHaveAttribute("data-drawing-state", "complete");
    expect(frames.size).toBe(0);
  });

  it("waits for the document to become visible before starting", () => {
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    render(<AssemblyWorkbench />);
    revealCanvas();
    expect(scene()).toHaveAttribute("data-drawing-state", "waiting");
    expect(frames.size).toBe(0);
    hidden.mockReturnValue(false);
    fireEvent(document, new Event("visibilitychange"));
    expect(scene()).toHaveAttribute("data-drawing-state", "drawing");
    advanceTo(drawingDuration);
    expect(scene()).toHaveAttribute("data-complete", "true");
  });

  it("restarts after history-cache restoration, while ordinary pageshow leaves it unchanged", () => {
    render(<AssemblyWorkbench />);
    revealCanvas();
    advanceTo(drawingDuration);
    fireEvent(
      window,
      new PageTransitionEvent("pageshow", { persisted: false }),
    );
    expect(scene()).toHaveAttribute("data-complete", "true");
    fireEvent(window, new PageTransitionEvent("pageshow", { persisted: true }));
    expect(scene()).toHaveAttribute("data-progress", "0");
    expect(
      screen.queryByRole("group", { name: "二维工作台部件" }),
    ).not.toBeInTheDocument();
    revealCanvas();
    advanceTo(drawingDuration + drawingTime(9));
    expect(Number(scene().getAttribute("data-progress"))).toBeGreaterThan(0);
    expect(Number(scene().getAttribute("data-progress"))).toBeLessThan(18);
  });

  it("starts a fresh timeline when history restores an unfinished playing drawing", () => {
    render(<AssemblyWorkbench />);
    revealCanvas();
    advanceTo(1200);
    time = 100000;
    fireEvent(window, new PageTransitionEvent("pageshow", { persisted: true }));
    expect(scene()).toHaveAttribute("data-progress", "0");
    expect(frames.size).toBe(0);
    revealCanvas();
    advanceTo(100000 + drawingTime(9));
    expect(Number(scene().getAttribute("data-progress"))).toBeGreaterThan(0);
    expect(Number(scene().getAttribute("data-progress"))).toBeLessThan(18);
  });

  it("shows the finished artwork with reduced motion and resets retained controls on restoration", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true })),
    );
    render(<AssemblyWorkbench />);
    await act(async () => {});
    advanceTo(0);
    expect(scene()).toHaveAttribute("data-complete", "true");
    expect(
      screen.getByRole("group", { name: "二维工作台部件" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(7);
    const laptop = screen.getByRole("button", { name: "笔记本" });
    fireEvent.click(laptop);
    expect(screen.getByText("图纸已就绪")).toBeInTheDocument();
    expect(frames.size).toBe(0);
    fireEvent(window, new PageTransitionEvent("pageshow", { persisted: true }));
    expect(scene()).toHaveAttribute("data-complete", "true");
    expect(screen.queryByText("图纸已就绪")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "笔记本" })).not.toBe(laptop);
    expect(frames.size).toBe(0);
  });

  it.each(["load", "fail"] as const)(
    "keeps the finished artwork visible while part images %s",
    async (result) => {
      vi.stubGlobal(
        "matchMedia",
        vi.fn(() => ({ matches: true })),
      );
      const pending = Promise.withResolvers<void>();
      vi.stubGlobal(
        "Image",
        class {
          src = "";
          decode() {
            return pending.promise;
          }
        },
      );
      render(<AssemblyWorkbench />);
      advanceTo(0);
      expect(
        scene().querySelector('[data-workbench-art="rest"]'),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("group", { name: "二维工作台部件" }),
      ).toBeNull();
      expect(
        screen.getByText("工作台绘制完成，正在载入部件素材"),
      ).toBeInTheDocument();
      await act(async () => {
        if (result === "load") pending.resolve();
        else pending.reject(new Error("Asset failed"));
      });
      expect(
        scene().querySelector('[data-workbench-art="rest"]'),
      ).toBeInTheDocument();
      if (result === "load") {
        expect(screen.getAllByRole("button")).toHaveLength(7);
      } else {
        expect(
          screen.queryByRole("group", { name: "二维工作台部件" }),
        ).toBeNull();
        expect(
          screen.getByText("工作台绘制完成，部件素材未能载入"),
        ).toBeInTheDocument();
      }
    },
  );

  it("finishes an in-progress drawing when the document is hidden", () => {
    render(<AssemblyWorkbench />);
    revealCanvas();
    advanceTo(drawingTime(40));
    expect(frames.size).toBe(1);
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    fireEvent(document, new Event("visibilitychange"));
    expect(scene()).toHaveAttribute("data-drawing-state", "complete");
    expect(scene()).toHaveAttribute("data-progress", "100");
    expect(frames.size).toBe(0);
  });
});
