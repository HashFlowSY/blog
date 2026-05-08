import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ReadingProgress } from "./reading-progress";

describe("ReadingProgress", () => {
  let scrollY = 0;

  beforeEach(() => {
    scrollY = 0;
    vi.spyOn(window, "scrollY", "get").mockImplementation(() => scrollY);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 500,
    });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: 1_000,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sets the progress transform from the current scroll position", () => {
    const { container } = render(<ReadingProgress />);
    const progress = container.querySelector(".read-progress");

    expect(progress).toHaveStyle({ transform: "scaleX(0)" });

    scrollY = 250;
    fireEvent.scroll(window);

    expect(progress).toHaveStyle({ transform: "scaleX(0.5)" });
  });

  it("clamps progress to the available range", () => {
    const { container } = render(<ReadingProgress />);
    const progress = container.querySelector(".read-progress");

    scrollY = 800;
    fireEvent.resize(window);

    expect(progress).toHaveStyle({ transform: "scaleX(1)" });
  });
});
