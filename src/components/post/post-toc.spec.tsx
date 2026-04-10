const mockObserve = vi.fn();
const mockDisconnect = vi.fn();
const mockUnobserve = vi.fn();

function MockIntersectionObserver(
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit,
) {
  mockObserve.mockImplementation((el: Element) => {
    if (options?.rootMargin) return;
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
import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { PostToc } from "./post-toc";

import type { TocItem } from "@/lib/markdown";

const headings: TocItem[] = [
  { level: 1, id: "intro", text: "Introduction" },
  { level: 2, id: "setup", text: "Setup" },
  { level: 3, id: "config", text: "Configuration" },
];

describe("PostToc", () => {
  beforeEach(() => {
    mockObserve.mockClear();
    mockDisconnect.mockClear();
    document.body.innerHTML = "";
    Element.prototype.scrollIntoView = vi.fn();
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      media: "",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("returns null when headings is empty", () => {
    const { container } = render(<PostToc headings={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nav with heading links", () => {
    const { container } = render(<PostToc headings={headings} />);
    const nav = container.querySelector("nav");
    expect(nav).toBeInTheDocument();
    expect(container.textContent).toContain("Introduction");
    expect(container.textContent).toContain("Setup");
    expect(container.textContent).toContain("Configuration");
  });

  it("each link has correct href", () => {
    const { container } = render(<PostToc headings={headings} />);
    const links = container.querySelectorAll("a");
    expect(links[0]).toHaveAttribute("href", "#intro");
    expect(links[1]).toHaveAttribute("href", "#setup");
    expect(links[2]).toHaveAttribute("href", "#config");
  });

  it("applies indentation based on heading level", () => {
    const { container } = render(<PostToc headings={headings} />);
    const items = container.querySelectorAll("li");
    expect(items[0]).toHaveStyle({ paddingLeft: "0rem" });
    expect(items[1]).toHaveStyle({ paddingLeft: "0.75rem" });
    expect(items[2]).toHaveStyle({ paddingLeft: "1.5rem" });
  });

  it("no heading is active by default", () => {
    const { container } = render(<PostToc headings={headings} />);
    const links = container.querySelectorAll("a");
    for (const link of links) {
      expect(link.className).not.toContain("font-medium");
    }
  });

  it("click prevents default and calls scrollIntoView", () => {
    document.body.innerHTML = '<div id="setup">Setup</div>';
    const { container } = render(<PostToc headings={headings} />);
    const setupLink = container.querySelectorAll("a")[1]!;
    fireEvent.click(setupLink);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
    });
  });

  it("disconnects observer on unmount", () => {
    document.body.innerHTML = '<div class="prose"><h1 id="intro">X</h1></div>';
    const { unmount } = render(<PostToc headings={headings} />);
    expect(mockDisconnect).not.toHaveBeenCalled();
    unmount();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it("creates observer", () => {
    document.body.innerHTML = '<div class="prose"><h1 id="intro">X</h1></div>';
    render(<PostToc headings={headings} />);
    expect(mockObserve).toHaveBeenCalled();
  });

  it("renders toggle button with toc text", () => {
    const { getByRole } = render(<PostToc headings={headings} />);
    const button = getByRole("button", { name: /toc/i });
    expect(button).toBeInTheDocument();
  });

  it("toggle button has aria-expanded=false by default", () => {
    const { getByRole } = render(<PostToc headings={headings} />);
    const button = getByRole("button", { name: /toc/i });
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("heading list is hidden by default on mobile", () => {
    const { container } = render(<PostToc headings={headings} />);
    const listWrapper = container.querySelector("nav > div");
    expect(listWrapper?.className).toContain("hidden");
  });

  it("clicking toggle shows heading list", () => {
    const { getByRole, container } = render(<PostToc headings={headings} />);
    const button = getByRole("button", { name: /toc/i });
    fireEvent.click(button);

    expect(button).toHaveAttribute("aria-expanded", "true");
    const listWrapper = container.querySelector("nav > div");
    expect(listWrapper?.className).toContain("block");
    expect(listWrapper?.className).not.toContain("hidden");
  });

  it("clicking toggle twice hides heading list again", () => {
    const { getByRole, container } = render(<PostToc headings={headings} />);
    const button = getByRole("button", { name: /toc/i });

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    const listWrapper = container.querySelector("nav > div");
    expect(listWrapper?.className).toContain("hidden");
  });
});

describe("PostToc - A11y (M4: Nav aria-label)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("nav has aria-label from translation", () => {
    const { container } = render(<PostToc headings={headings} />);
    const nav = container.querySelector("nav");
    expect(nav).toHaveAttribute("aria-label", "toc");
  });
});

describe("PostToc - A11y (L2: Reduced motion)", () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    document.body.innerHTML = '<div id="setup">Setup</div>';
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    document.body.innerHTML = "";
  });

  it("uses smooth scroll when prefers-reduced-motion is not set", () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      media: "(prefers-reduced-motion: reduce)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    const { container } = render(<PostToc headings={headings} />);
    const setupLink = container.querySelectorAll("a")[1]!;
    fireEvent.click(setupLink);

    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
    });
  });

  it("uses instant scroll when prefers-reduced-motion: reduce is set", () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    const { container } = render(<PostToc headings={headings} />);
    const setupLink = container.querySelectorAll("a")[1]!;
    fireEvent.click(setupLink);

    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: "instant",
    });
  });
});
