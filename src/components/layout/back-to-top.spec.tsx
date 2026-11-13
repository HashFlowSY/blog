import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BackToTop } from "./back-to-top";

function renderBackToTop() {
  return render(
    <>
      <main id="content" tabIndex={-1} />
      <BackToTop targetId="content" placement="site" />
    </>,
  );
}

describe("BackToTop", () => {
  let scrollToMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollToMock = vi.fn();
    vi.stubGlobal("scrollTo", scrollToMock);
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("scrolls smoothly to the top when clicked", () => {
    const { getByRole } = renderBackToTop();

    fireEvent.click(getByRole("button", { name: "回到顶部" }));

    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    expect(getByRole("main")).toHaveFocus();
  });

  it("returns immediately when reduced motion is requested", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const { getByRole } = renderBackToTop();
    fireEvent.click(getByRole("button", { name: "回到顶部" }));
    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: "instant" });
  });
});
