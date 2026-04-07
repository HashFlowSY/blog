const mockObserve = vi.fn();
const mockDisconnect = vi.fn();
const mockUnobserve = vi.fn();

function MockIntersectionObserver(
  callback: IntersectionObserverCallback,
  _options?: IntersectionObserverInit,
) {
  mockObserve.mockImplementation((el: Element) => {
    callback(
      [{ isIntersecting: true, target: el } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  });
  return {
    observe: mockObserve,
    disconnect: mockDisconnect,
    unobserve: mockUnobserve,
  };
}

vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { FadeIn } from "./fade-in";

describe("FadeIn", () => {
  beforeEach(() => {
    mockObserve.mockClear();
    mockDisconnect.mockClear();
  });

  it("renders children", () => {
    const { getByText } = render(<FadeIn>Hello</FadeIn>);
    expect(getByText("Hello")).toBeInTheDocument();
  });

  it("creates an IntersectionObserver", () => {
    render(<FadeIn>Content</FadeIn>);
    expect(mockObserve).toHaveBeenCalled();
  });

  it("passes className to wrapper", () => {
    const { container } = render(
      <FadeIn className="test-class">Content</FadeIn>,
    );
    expect(container.firstChild).toHaveClass("test-class");
  });

  it("disconnects observer on unmount", () => {
    const { unmount } = render(<FadeIn>Content</FadeIn>);
    unmount();
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("applies delay via inline style", () => {
    const { container } = render(<FadeIn delay={200}>Content</FadeIn>);
    const style = (container.firstChild as HTMLElement).style;
    expect(style.transition).toContain("200ms");
  });
});
