import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BackToTop } from "./back-to-top";

describe("BackToTop", () => {
  let scrollY = 0;
  let scrollToMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollY = 0;
    scrollToMock = vi.fn();
    vi.spyOn(window, "scrollY", "get").mockImplementation(() => scrollY);
    vi.stubGlobal("scrollTo", scrollToMock);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("hides the control until the page has scrolled past the desktop threshold", () => {
    const { container } = render(<BackToTop />);

    const button = container.querySelector(".back-to-top");
    expect(button).toHaveAttribute("aria-hidden", "true");
    expect(button).toHaveAttribute("tabindex", "-1");

    scrollY = 120;
    fireEvent.scroll(window);

    expect(button).toHaveAttribute("aria-hidden", "false");
    expect(button).toHaveAttribute("tabindex", "0");
  });

  it("scrolls smoothly to the top when clicked", () => {
    const { container } = render(<BackToTop />);
    const button = container.querySelector(".back-to-top");

    fireEvent.click(button!);

    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});
