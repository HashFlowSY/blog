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
    window.history.replaceState(null, "", "/");
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

  it("removes the current chapter fragment while keeping the navigation entry", () => {
    const state = { projectOrigin: { id: "featured-personal-blog" } };
    window.history.replaceState(
      state,
      "",
      "/projects/personal-blog/?view=case#chapter",
    );
    const { getByRole } = render(
      <BackToTop targetId="project-title" placement="detail" />,
    );
    fireEvent.click(getByRole("button", { name: "回到顶部" }));
    expect(
      window.location.pathname + window.location.search + window.location.hash,
    ).toBe("/projects/personal-blog/?view=case");
    expect(window.history.state).toEqual(state);
  });
});
