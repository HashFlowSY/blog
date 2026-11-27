import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AssemblyWorkbench } from "./assembly-workbench";
import {
  artworkSettledAt,
  drawingDuration,
  drawingObjects,
  drawingProgress,
} from "./pencil-plan";
import { workbenchDrawingArt, workbenchSurfaceArt } from "./workbench-art";
import { WorkbenchDrawing } from "./workbench-drawing";
import { drawingMarks } from "./workbench-geometry";

// Browser tests exercise the pencil with native SVG path geometry.
vi.mock("./workbench-pencil", () => ({ WorkbenchPencil: () => null }));

describe("AssemblyWorkbench", () => {
  it("only shows a positioning dot after the pencil has touched that point", () => {
    const { container, rerender } = render(<WorkbenchDrawing progress={0} />);
    expect(container.querySelectorAll("[data-drawing-mark]")).toHaveLength(0);
    for (const mark of drawingMarks.filter((mark) => mark.kind === "point")) {
      const selector = `circle[data-pencil-point="${mark.id}"]`;
      rerender(
        <WorkbenchDrawing progress={drawingProgress(mark.fromMs - 1)} />,
      );
      expect(container.querySelector(selector)).toBeNull();
      rerender(
        <WorkbenchDrawing
          progress={drawingProgress((mark.fromMs + mark.toMs) / 2)}
        />,
      );
      expect(
        Number(container.querySelector(selector)?.getAttribute("opacity")),
      ).toBeGreaterThan(0);
    }
  });

  let time: number;
  let nextId: number;
  let frames: Map<number, FrameRequestCallback>;
  type VisibilityEntry = Pick<
    IntersectionObserverEntry,
    "isIntersecting" | "intersectionRatio"
  >;
  type VisibilityCallback = (entries: VisibilityEntry[]) => void;
  let visibilityChanged: VisibilityCallback | undefined;

  function stubImageDecoding(decode: () => Promise<void>) {
    vi.stubGlobal(
      "Image",
      class {
        src = "";
        decode = decode;
      },
    );
  }

  beforeEach(() => {
    window.sessionStorage.clear();
    time = 0;
    nextId = 0;
    frames = new Map();
    visibilityChanged = undefined;
    stubImageDecoding(() => Promise.resolve());
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
        constructor(callback: VisibilityCallback) {
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

  function artwork(src: string) {
    return scene().querySelector(`image[href="${src}"]`);
  }

  async function renderReadyWorkbench() {
    const view = render(<AssemblyWorkbench />);
    await act(async () => {
      fireEvent.load(artwork(workbenchDrawingArt.rest)!);
      const paper = artwork(workbenchDrawingArt.paper);
      if (paper) fireEvent.load(paper);
      for (const { src } of workbenchSurfaceArt) {
        const texture = artwork(src);
        if (texture) fireEvent.load(texture);
      }
    });
    return view;
  }

  function revealCanvas(intersectionRatio = 1) {
    const onVisibilityChanged = visibilityChanged;
    if (!onVisibilityChanged)
      throw new Error("The scene is not being observed");
    act(() =>
      onVisibilityChanged([{ isIntersecting: true, intersectionRatio }]),
    );
  }

  async function restoreFromHistoryCache() {
    await act(async () => {
      fireEvent(
        window,
        new PageTransitionEvent("pageshow", { persisted: true }),
      );
    });
  }

  it("waits for a visible canvas on the first visit and opens the finished drawing on return", async () => {
    const first = await renderReadyWorkbench();
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
    await renderReadyWorkbench();
    expect(scene()).toHaveAttribute("data-drawing-state", "complete");
    expect(screen.getByRole("button", { name: "工作灯" })).toBeEnabled();
  });

  it("waits for part image events when decoding is unavailable", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true })),
    );
    const requested: LoadableImage[] = [];
    class LoadableImage {
      onload: (() => void) | null = null;

      constructor() {
        requested.push(this);
      }
    }
    vi.stubGlobal("Image", LoadableImage);
    await renderReadyWorkbench();
    expect(scene()).toHaveAttribute("data-drawing-state", "complete");
    expect(
      scene().querySelector('[data-workbench-art="rest"]'),
    ).toBeInTheDocument();
    expect(scene().querySelectorAll("button")).toHaveLength(0);
    await act(async () => {
      for (const image of requested) image.onload?.();
    });
    expect(screen.getAllByRole("button")).toHaveLength(7);
  });

  it("keeps the same drawn sheet through the final lift and into interaction", async () => {
    await renderReadyWorkbench();
    const rest = artwork(workbenchDrawingArt.rest);
    expect(rest).toBeInTheDocument();
    expect(
      scene().querySelector("[data-workbench-waiting]"),
    ).toBeInTheDocument();
    revealCanvas();
    expect(scene().querySelector("[data-workbench-waiting]")).toBeNull();
    expect(artwork(workbenchDrawingArt.rest)).toBe(rest);
    advanceTo(drawingObjects[0]!.end - 10);
    expect(scene()).toHaveAttribute("data-drawing-object", "table");
    expect(
      scene().querySelector('[data-drawing-mark="table-right-contact"]'),
    ).toBeInTheDocument();
    expect(scene().querySelector('[data-mark-object="toolbox"]')).toBeNull();
    const contactMask = rest?.parentElement?.getAttribute("mask");
    expect(contactMask).toMatch(/^url\(/);
    advanceTo(artworkSettledAt + 1);
    expect(rest?.parentElement).toHaveAttribute("mask", contactMask);
    expect(
      scene().querySelector('[data-mark-part="right-short-driver"]'),
    ).toBeInTheDocument();
    expect(scene().querySelector('[data-workbench-art="rest"]')).toBeNull();
    expect(
      screen.getByRole("img", { name: "正在绘制的工作台" }),
    ).toBeInTheDocument();
    expect(scene().querySelectorAll("button")).toHaveLength(0);
    advanceTo(drawingDuration);
    expect(scene().querySelector('[data-workbench-art="rest"]')).toBe(rest);
    expect(rest?.parentElement).toHaveAttribute("mask", contactMask);
    expect(
      screen.queryByRole("img", { name: "正在绘制的工作台" }),
    ).not.toBeInTheDocument();
    expect(scene()).toHaveAttribute("data-drawing-state", "complete");
    expect(frames.size).toBe(0);
  });

  it("waits for the document to become visible before starting", async () => {
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    await renderReadyWorkbench();
    revealCanvas();
    expect(scene()).toHaveAttribute("data-drawing-state", "waiting");
    expect(frames.size).toBe(0);
    hidden.mockReturnValue(false);
    fireEvent(document, new Event("visibilitychange"));
    expect(scene()).toHaveAttribute("data-drawing-state", "drawing");
    advanceTo(drawingDuration);
    expect(scene()).toHaveAttribute("data-drawing-state", "complete");
  });

  it("keeps the finished drawing on ordinary pageshow and history-cache restoration", async () => {
    await renderReadyWorkbench();
    revealCanvas();
    advanceTo(drawingDuration);
    fireEvent(
      window,
      new PageTransitionEvent("pageshow", { persisted: false }),
    );
    expect(scene()).toHaveAttribute("data-drawing-state", "complete");
    await restoreFromHistoryCache();
    expect(scene()).toHaveAttribute("data-progress", "100");
    expect(screen.getByRole("button", { name: "工作灯" })).toBeEnabled();
  });

  it("shows the finished drawing when history restores an unfinished drawing", async () => {
    await renderReadyWorkbench();
    revealCanvas();
    advanceTo(1200);
    time = 100000;
    await restoreFromHistoryCache();
    expect(scene()).toHaveAttribute("data-progress", "100");
    expect(frames.size).toBe(0);
    expect(screen.getByRole("button", { name: "重看绘制" })).toBeEnabled();
  });

  it("shows the finished artwork with reduced motion and resets retained controls on restoration", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true })),
    );
    await renderReadyWorkbench();
    expect(scene()).toHaveAttribute("data-drawing-state", "complete");
    expect(
      screen.getByRole("group", { name: "二维工作台部件" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(7);
    const laptop = screen.getByRole("button", { name: "笔记本" });
    fireEvent.click(laptop);
    expect(screen.getByText("图纸已就绪")).toBeInTheDocument();
    expect(frames.size).toBe(0);
    await restoreFromHistoryCache();
    expect(scene()).toHaveAttribute("data-drawing-state", "complete");
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
      stubImageDecoding(() => pending.promise);
      await renderReadyWorkbench();
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

  it("pauses a hidden drawing and resumes from the last painted frame", async () => {
    await renderReadyWorkbench();
    revealCanvas();
    const endOfTable = drawingObjects[0]!.end;
    advanceTo(endOfTable - 100);
    const pausedProgress = scene().getAttribute("data-progress");
    expect(frames.size).toBe(1);
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    fireEvent(document, new Event("visibilitychange"));
    expect(frames.size).toBe(0);
    advanceTo(60000);
    expect(scene()).toHaveAttribute("data-drawing-state", "drawing");
    expect(scene()).toHaveAttribute("data-progress", pausedProgress);
    expect(scene().querySelector('[data-mark-object="toolbox"]')).toBeNull();

    hidden.mockReturnValue(false);
    fireEvent(document, new Event("visibilitychange"));
    expect(scene()).toHaveAttribute("data-progress", pausedProgress);
    advanceTo(60120);
    expect(scene()).toHaveAttribute("data-drawing-object", "toolbox");
    expect(scene()).toHaveAttribute(
      "data-progress",
      String(drawingProgress(endOfTable + 20)),
    );
  });
});
