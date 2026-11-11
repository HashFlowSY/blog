import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./workbench-orbit", () => ({
  preloadWorkbenchScene: vi.fn().mockResolvedValue(undefined),
  WorkbenchOrbit: ({
    onStatus,
    active,
  }: {
    onStatus?: (status: "ready") => void;
    active?: boolean;
  }) => {
    useEffect(() => {
      onStatus?.("ready");
    }, [onStatus]);
    return (
      <div
        role="group"
        aria-label="可旋转的立体工作台"
        aria-hidden={!active}
        data-prepared-model
      />
    );
  },
}));

import { AssemblyWorkbench } from "./assembly-workbench";
import { drawingDuration } from "./pencil-plan";
import { WorkbenchDrawing } from "./workbench-drawing";
import { pointStrokes } from "./workbench-geometry";

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
    rerender(<WorkbenchDrawing progress={17} />);
    for (const path of container.querySelectorAll(
      '[data-construction-layer="lines"] path',
    )) {
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
      .querySelector("[data-progress]")!;
  }

  function revealCanvas(intersectionRatio = 1) {
    act(() => visibilityChanged([{ isIntersecting: true, intersectionRatio }]));
  }

  it("waits for a visible canvas and draws from the start on each mount", () => {
    const first = render(<AssemblyWorkbench />);
    revealCanvas(0.39);
    advanceTo(1200);
    expect(scene()).toHaveAttribute("data-progress", "0");
    expect(screen.queryByRole("button", { name: "暂停构建" })).toBeNull();
    revealCanvas(0.6);
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

  it("removes the progress and replay controls, and enables the 3D view only after drawing", () => {
    render(<AssemblyWorkbench />);
    revealCanvas();
    const workbench = screen.getByRole("region", { name: "交互工作台" });
    expect(within(workbench).queryByRole("slider")).not.toBeInTheDocument();
    expect(
      within(workbench).queryByText(/100%|回到起点|重看细节|先落点|拖动回看/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "可旋转的立体工作台" }),
    ).not.toBeInTheDocument();
    advanceTo(drawingDuration - 1);
    expect(scene()).toHaveAttribute("data-complete", "false");
    expect(
      workbench.querySelector("[data-prepared-model]"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "可旋转的立体工作台" }),
    ).not.toBeInTheDocument();
    expect(scene()).toHaveAttribute("data-model-ready", "false");
    advanceTo(drawingDuration);
    expect(scene()).toHaveAttribute("data-complete", "true");
    expect(
      screen.getByRole("group", { name: "可旋转的立体工作台" }),
    ).toBeInTheDocument();
    expect(within(workbench).queryByRole("button")).not.toBeInTheDocument();
    expect(
      workbench.querySelector('[data-construction-layer="pencil"]'),
    ).toHaveAttribute("data-pencil-length", "0");
  });

  it("constructs points, lines, and planes before the interactive finished view", () => {
    render(<AssemblyWorkbench />);
    revealCanvas();
    const lines = scene().querySelector('[data-construction-layer="lines"]');
    const planes = scene().querySelector('[data-construction-layer="planes"]');
    const finish = scene().querySelector('[data-construction-layer="finish"]');
    expect(lines).toHaveAttribute("opacity", "0");
    expect(planes).toHaveAttribute("opacity", "0");
    advanceTo(7000);
    expect(lines).toHaveAttribute("opacity", "1");
    expect(planes).toHaveAttribute("opacity", "0");
    advanceTo(9000);
    expect(planes).toHaveAttribute("opacity", "1");
    expect(finish).toHaveStyle({ opacity: "0" });
    advanceTo(drawingDuration);
    expect(finish).toHaveStyle({ opacity: "1" });
    expect(
      screen.queryByRole("img", { name: /工作台构建/ }),
    ).not.toBeInTheDocument();
  });

  it("pauses and resumes drawing without leaving a stuck or interrupted pencil", () => {
    render(<AssemblyWorkbench />);
    revealCanvas();
    advanceTo(1200);
    const paused = scene().getAttribute("data-progress");
    fireEvent.click(screen.getByRole("button", { name: "暂停构建" }));
    advanceTo(4000);
    expect(scene()).toHaveAttribute("data-progress", paused);
    fireEvent.click(screen.getByRole("button", { name: "继续构建" }));
    advanceTo(4000 + drawingDuration);
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
      screen.queryByRole("group", { name: "可旋转的立体工作台" }),
    ).not.toBeInTheDocument();
    revealCanvas();
    advanceTo(drawingDuration + 1200);
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
    revealCanvas();
    advanceTo(101200);
    expect(Number(scene().getAttribute("data-progress"))).toBeGreaterThan(0);
    expect(Number(scene().getAttribute("data-progress"))).toBeLessThan(18);
  });

  it("shows the interactive finished artwork immediately for reduced motion", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true })),
    );
    render(<AssemblyWorkbench />);
    advanceTo(0);
    expect(scene()).toHaveAttribute("data-complete", "true");
    expect(
      screen.getByRole("group", { name: "可旋转的立体工作台" }),
    ).toBeInTheDocument();
    expect(frames.size).toBe(0);
    fireEvent(window, new PageTransitionEvent("pageshow", { persisted: true }));
    expect(scene()).toHaveAttribute("data-complete", "true");
    expect(frames.size).toBe(0);
  });

  it("pauses when hidden and cleans up its frame when unmounted", () => {
    const { unmount } = render(<AssemblyWorkbench />);
    revealCanvas();
    advanceTo(1200);
    const paused = scene().getAttribute("data-progress");
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    fireEvent(document, new Event("visibilitychange"));
    advanceTo(9000);
    expect(scene()).toHaveAttribute("data-progress", paused);
    expect(frames.size).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "继续构建" }));
    expect(frames.size).toBe(1);
    unmount();
    expect(frames.size).toBe(0);
  });
});
