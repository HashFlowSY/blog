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
  setTouchInteraction: vi.fn(),
  toggleYellowDrawer: vi.fn(),
  dispose: vi.fn(),
}));
vi.mock("./workbench-scene", () => ({ createWorkbenchScene: engine.create }));

describe("WorkbenchOrbit", () => {
  const onStatus = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    engine.create.mockResolvedValue(engine);
  });

  it("waits for a real renderer before announcing an interactive model", async () => {
    const { container } = render(
      <WorkbenchOrbit onStatus={onStatus} touchActive={false} />,
    );
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(container.querySelector("canvas")).toBeInTheDocument();
    const view = await screen.findByRole("group", {
      name: "可旋转的立体工作台",
    });
    expect(view).toHaveAttribute("aria-roledescription", "三维模型");
    expect(view).toHaveAccessibleDescription(/360 度.*双指缩放/);
    expect(view).toHaveAccessibleDescription(/Enter 或空格开合黄色抽屉/);
    expect(onStatus).toHaveBeenCalledWith("ready");
    expect(engine.create).toHaveBeenCalledWith(
      container.querySelector("canvas"),
      expect.any(Function),
    );
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });

  it("handles model shortcuts while preserving ordinary browser keys", async () => {
    render(<WorkbenchOrbit onStatus={onStatus} touchActive={false} />);
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
    fireEvent.keyDown(view, { key: "Enter" });
    fireEvent.keyDown(view, { key: " " });
    fireEvent.keyDown(view, { key: " ", repeat: true });
    fireEvent.keyDown(view, { key: "Enter", ctrlKey: true });
    expect(engine.toggleYellowDrawer).toHaveBeenCalledTimes(2);
  });

  it("switches touch modes without rebuilding the GPU scene", async () => {
    const { rerender } = render(
      <WorkbenchOrbit onStatus={onStatus} touchActive={false} />,
    );
    await screen.findByRole("group");
    expect(engine.setTouchInteraction).toHaveBeenLastCalledWith(false);
    rerender(<WorkbenchOrbit onStatus={onStatus} touchActive />);
    expect(engine.setTouchInteraction).toHaveBeenLastCalledWith(true);
    rerender(<WorkbenchOrbit onStatus={onStatus} touchActive={false} />);
    expect(engine.setTouchInteraction).toHaveBeenLastCalledWith(false);
    expect(engine.create).toHaveBeenCalledOnce();
    expect(engine.dispose).not.toHaveBeenCalled();
  });

  it("disposes the GPU scene when navigating away", async () => {
    const { unmount } = render(
      <WorkbenchOrbit onStatus={onStatus} touchActive={false} />,
    );
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
    const { unmount } = render(
      <WorkbenchOrbit onStatus={onStatus} touchActive={false} />,
    );
    await waitFor(() => expect(engine.create).toHaveBeenCalledTimes(1));
    unmount();
    await act(async () => {
      finish?.(engine);
    });
    expect(engine.dispose).toHaveBeenCalledTimes(1);
    expect(onStatus).not.toHaveBeenCalled();
  });

  it("keeps the drawing available when a device cannot initialize graphics", async () => {
    engine.create.mockRejectedValue(new Error("No graphics context"));
    const { container } = render(
      <WorkbenchOrbit onStatus={onStatus} touchActive={false} />,
    );
    await waitFor(() => expect(onStatus).toHaveBeenCalledWith("failed"));
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-model-status="failed"]'),
    ).toBeInTheDocument();
  });
});
