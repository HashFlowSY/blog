import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkbenchOrbit } from "./workbench-orbit";

const engine = vi.hoisted(() => ({
  create: vi.fn(),
  rotate: vi.fn(),
  zoom: vi.fn(),
  reset: vi.fn(),
  dispose: vi.fn(),
}));
vi.mock("./workbench-scene", () => ({ createWorkbenchScene: engine.create }));

describe("WorkbenchOrbit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    engine.create.mockResolvedValue(engine);
  });

  it("waits for a real renderer before announcing an interactive model", async () => {
    const status = vi.fn();
    const { container } = render(<WorkbenchOrbit onStatus={status} />);
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(container.querySelector("canvas")).toBeInTheDocument();
    const view = await screen.findByRole("group", {
      name: "可旋转的立体工作台",
    });
    expect(view).toHaveAttribute("aria-roledescription", "三维模型");
    expect(view).toHaveAccessibleDescription(/360度.*双指缩放/);
    expect(status).toHaveBeenCalledWith("ready");
    expect(engine.create).toHaveBeenCalledWith(
      container.querySelector("canvas"),
      expect.any(Function),
    );
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  it("forwards unrestricted orbit, zoom and reset keys while preserving ordinary browser keys", async () => {
    render(<WorkbenchOrbit />);
    const view = await screen.findByRole("group");
    for (let i = 0; i < 30; i++) fireEvent.keyDown(view, { key: "ArrowRight" });
    expect(engine.rotate).toHaveBeenCalledTimes(30);
    expect(engine.rotate).toHaveBeenLastCalledWith(15, 0);
    fireEvent.keyDown(view, { key: "ArrowLeft" });
    expect(engine.rotate).toHaveBeenLastCalledWith(-15, 0);
    fireEvent.keyDown(view, { key: "ArrowUp" });
    expect(engine.rotate).toHaveBeenLastCalledWith(0, 10);
    fireEvent.keyDown(view, { key: "ArrowDown" });
    expect(engine.rotate).toHaveBeenLastCalledWith(0, -10);
    fireEvent.keyDown(view, { key: "Tab" });
    fireEvent.keyDown(view, { key: "ArrowRight", ctrlKey: true });
    expect(engine.rotate).toHaveBeenCalledTimes(33);
    fireEvent.keyDown(view, { key: "+" });
    expect(engine.zoom).toHaveBeenLastCalledWith(1.15);
    fireEvent.keyDown(view, { key: "-" });
    expect(engine.zoom).toHaveBeenLastCalledWith(1 / 1.15);
    fireEvent.keyDown(view, { key: "Home" });
    expect(engine.reset).toHaveBeenCalledOnce();
  });

  it("disposes the GPU scene when navigating away", async () => {
    const { unmount } = render(<WorkbenchOrbit />);
    await screen.findByRole("group");
    unmount();
    expect(engine.dispose).toHaveBeenCalledTimes(1);
  });

  it("disposes a renderer that finishes loading after its page has gone away", async () => {
    let finish: ((value: typeof engine) => void) | undefined;
    engine.create.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const status = vi.fn();
    const { unmount } = render(<WorkbenchOrbit onStatus={status} />);
    await waitFor(() => expect(engine.create).toHaveBeenCalledTimes(1));
    unmount();
    await act(async () => {
      finish?.(engine);
    });
    expect(engine.dispose).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
  });

  it("keeps the drawing available when a device cannot initialize graphics", async () => {
    engine.create.mockRejectedValue(new Error("No graphics context"));
    const status = vi.fn();
    const { container } = render(<WorkbenchOrbit onStatus={status} />);
    await waitFor(() => expect(status).toHaveBeenCalledWith("failed"));
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-model-status="failed"]'),
    ).toBeInTheDocument();
  });
});
