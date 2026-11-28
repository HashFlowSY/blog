import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SITE } from "@/lib/site";

import { Header } from "./header";

const usePathnameMock = vi.hoisted(() => vi.fn(() => "/"));

vi.mock("next/navigation", () => {
  return {
    usePathname: usePathnameMock,
  };
});

describe("Header", () => {
  it("renders the four Chinese-only primary navigation links", () => {
    render(<Header siteName={SITE.name} />);

    expect(screen.getByRole("link", { name: "首页" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "文章" })).toHaveAttribute(
      "href",
      "/posts/",
    );
    expect(screen.getByRole("link", { name: "项目" })).toHaveAttribute(
      "href",
      "/projects/",
    );
    expect(screen.getByRole("link", { name: "关于" })).toHaveAttribute(
      "href",
      "/about/",
    );
  });

  it("marks the active route with aria-current", () => {
    usePathnameMock.mockReturnValue("/projects/");

    render(<Header siteName={SITE.name} />);

    expect(screen.getByRole("link", { name: "项目" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "首页" })).toHaveAttribute(
      "aria-current",
      "false",
    );
  });

  it("keeps one marker in place within a section and reuses it across sections", () => {
    usePathnameMock.mockReturnValue("/projects/");
    const { container, rerender } = render(<Header siteName={SITE.name} />);
    const marker = container.querySelector<HTMLElement>(".nav-current-track");
    expect(marker).toBeInTheDocument();
    const startingPosition = marker?.style.backgroundPositionX;

    usePathnameMock.mockReturnValue("/projects/personal-blog/");
    rerender(<Header siteName={SITE.name} />);
    expect(marker?.style.backgroundPositionX).toBe(startingPosition);

    usePathnameMock.mockReturnValue("/about/");
    rerender(<Header siteName={SITE.name} />);
    expect(container.querySelector(".nav-current-track")).toBe(marker);
    expect(marker?.style.backgroundPositionX).toBe("100%");
    expect(screen.getByRole("link", { name: "联系我" })).toHaveAttribute(
      "href",
      "#contact",
    );
  });

  it("orders the visible section links like the selected paper edition", () => {
    usePathnameMock.mockReturnValue("/");
    render(<Header siteName={SITE.name} />);
    const links = screen
      .getByRole("navigation", { name: "主导航" })
      .querySelectorAll("a");
    expect(Array.from(links, (link) => link.textContent)).toEqual([
      "首页",
      "项目",
      "文章",
      "关于",
    ]);
    expect(screen.getByRole("link", { name: "联系我" })).toHaveAttribute(
      "href",
      "/about/#contact",
    );
  });
});
