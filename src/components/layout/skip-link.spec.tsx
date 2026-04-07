import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { SkipLink } from "./skip-link";

describe("SkipLink", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("renders a link with href='#main-content'", () => {
    render(<SkipLink />);
    const link = screen.getByText("Skip to main content");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "#main-content");
    expect(link.tagName).toBe("A");
  });

  it("is visually hidden by default (has sr-only class)", () => {
    render(<SkipLink />);
    const link = screen.getByText("Skip to main content");
    expect(link.className).toContain("sr-only");
  });

  it("has data-testid for test identification", () => {
    render(<SkipLink />);
    expect(screen.getByTestId("skip-link")).toBeInTheDocument();
  });

  it("on click, focuses and scrolls to #main-content element", () => {
    document.body.innerHTML =
      '<main id="main-content"><p>Main content</p></main>';
    const mainEl = document.getElementById("main-content");
    const focusSpy = vi.spyOn(mainEl!, "focus");

    render(<SkipLink />);
    const link = screen.getByText("Skip to main content");
    fireEvent.click(link);

    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
    });
  });

  it("does not throw when #main-content does not exist", () => {
    render(<SkipLink />);
    const link = screen.getByText("Skip to main content");
    expect(() => fireEvent.click(link)).not.toThrow();
  });

  it("sets tabIndex on target element for programmatic focus", () => {
    document.body.innerHTML =
      '<main id="main-content"><p>Main content</p></main>';
    const mainEl = document.getElementById("main-content")!;

    render(<SkipLink />);
    const link = screen.getByText("Skip to main content");
    fireEvent.click(link);

    expect(mainEl.tabIndex).toBe(-1);
  });

  it("removes tabIndex on blur after focus", () => {
    document.body.innerHTML =
      '<main id="main-content"><p>Main content</p></main>';
    const mainEl = document.getElementById("main-content")!;

    render(<SkipLink />);
    const link = screen.getByText("Skip to main content");
    fireEvent.click(link);

    expect(mainEl.tabIndex).toBe(-1);

    fireEvent.blur(mainEl);
    expect(mainEl.tabIndex).toBe(-1);
  });

  it("can be customized via props", () => {
    render(<SkipLink label="Skip to content" targetId="main" />);
    const link = screen.getByText("Skip to content");
    expect(link).toHaveAttribute("href", "#main");
  });
});
