import { fireEvent, render, screen } from "@testing-library/react";
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
  it("renders the portfolio brand lockup without language switcher", () => {
    render(<Header siteName={SITE.name} siteRole={SITE.role} />);

    expect(screen.getByText("H")).toBeInTheDocument();
    expect(screen.getByText("Hashflow")).toBeInTheDocument();
    expect(screen.getByText("AI 全栈工程师")).toBeInTheDocument();
    expect(screen.queryByText("EN")).not.toBeInTheDocument();
    expect(screen.queryByText("中文")).not.toBeInTheDocument();
  });

  it("renders the four Chinese-only primary navigation links", () => {
    render(<Header siteName={SITE.name} siteRole={SITE.role} />);

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
    expect(screen.getByRole("link", { name: "联系我" })).toHaveAttribute(
      "href",
      "/about/#contact",
    );
  });

  it("marks the active route with aria-current", () => {
    usePathnameMock.mockReturnValue("/projects/");

    render(<Header siteName={SITE.name} siteRole={SITE.role} />);

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
    render(<Header siteName={SITE.name} siteRole={SITE.role} />);

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
