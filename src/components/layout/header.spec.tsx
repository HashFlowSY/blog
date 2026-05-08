import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Header } from "./header";

const usePathnameMock = vi.hoisted(() => vi.fn(() => "/"));

vi.mock("next/navigation", () => {
  return {
    usePathname: usePathnameMock,
  };
});

describe("Header", () => {
  it("renders the industrial reference brand lockup without language switcher", () => {
    render(<Header />);

    expect(screen.getByText("废")).toBeInTheDocument();
    expect(screen.getByText("Scraplog")).toBeInTheDocument();
    expect(screen.getByText("废料通信站")).toBeInTheDocument();
    expect(screen.queryByText("EN")).not.toBeInTheDocument();
    expect(screen.queryByText("中文")).not.toBeInTheDocument();
  });

  it("renders the four Chinese-only primary navigation links", () => {
    render(<Header />);

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

    render(<Header />);

    expect(screen.getByRole("link", { name: "项目" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "首页" })).toHaveAttribute(
      "aria-current",
      "false",
    );
  });

  it("opens and closes the mobile menu with the reference class contract", () => {
    render(<Header />);

    const button = screen.getByRole("button", { name: "菜单" });
    const header = screen.getByLabelText("站点头部");

    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(header).not.toHaveClass("is-menu-open");

    fireEvent.click(button);

    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(header).toHaveClass("is-menu-open");

    fireEvent.click(button);

    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(header).not.toHaveClass("is-menu-open");
  });
});
