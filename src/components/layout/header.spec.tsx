vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "zh-CN",
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => createElement("a", { href, ...props }, children),
  usePathname: () => "/",
  useLocale: () => "zh-CN",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/theme/theme-toggle", () => ({
  ThemeToggle: () =>
    createElement("button", { "data-testid": "theme-toggle" }, "Toggle"),
}));

import { render, screen, fireEvent } from "@testing-library/react";
import { createElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { Header } from "./header";

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders site name link", () => {
    render(<Header />);
    expect(screen.getByText("siteName")).toBeInTheDocument();
  });

  it("renders 4 navigation links on desktop", () => {
    render(<Header />);
    expect(screen.getAllByText("home")).toHaveLength(2);
    expect(screen.getAllByText("posts")).toHaveLength(2);
    expect(screen.getAllByText("projects")).toHaveLength(2);
    expect(screen.getAllByText("about")).toHaveLength(2);
  });

  it("highlights active nav link for root path", () => {
    render(<Header />);
    const homeLinks = screen.getAllByText("home");
    expect(homeLinks[0]!.className).toContain("font-medium");
  });

  it("does not highlight inactive nav link", () => {
    render(<Header />);
    const postsLinks = screen.getAllByText("posts");
    expect(postsLinks[0]!.className).toContain("text-muted-foreground");
  });

  it("renders locale switcher with EN text", () => {
    render(<Header />);
    expect(screen.getAllByText("EN")).toHaveLength(2);
  });

  it("mobile menu is closed by default", () => {
    render(<Header />);
    const mobileNav = document.getElementById("mobile-nav");
    expect(mobileNav).toBeInTheDocument();
    expect(mobileNav).toHaveClass("hidden");
  });

  it("clicking hamburger opens mobile menu", () => {
    render(<Header />);
    const toggle = screen.getByLabelText("Toggle menu");
    fireEvent.click(toggle);
    const mobileNav = document.getElementById("mobile-nav");
    expect(mobileNav).toBeInTheDocument();
    expect(mobileNav).not.toHaveClass("hidden");
  });

  it("clicking mobile nav link closes menu", () => {
    render(<Header />);
    const toggle = screen.getByLabelText("Toggle menu");
    fireEvent.click(toggle);
    expect(
      document.getElementById("mobile-nav")?.classList.contains("hidden"),
    ).toBe(false);

    const postsLinks = screen.getAllByText("posts");
    fireEvent.click(postsLinks[1]!);
    expect(
      document.getElementById("mobile-nav")?.classList.contains("hidden"),
    ).toBe(true);
  });
});

describe("Header - A11y (H5: Mobile Menu)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menu button has aria-expanded='false' when menu is closed", () => {
    render(<Header />);
    const toggle = screen.getByLabelText("Toggle menu");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("menu button has aria-expanded='true' when menu is open", () => {
    render(<Header />);
    const toggle = screen.getByLabelText("Toggle menu");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("menu button has aria-controls='mobile-nav'", () => {
    render(<Header />);
    const toggle = screen.getByLabelText("Toggle menu");
    expect(toggle).toHaveAttribute("aria-controls", "mobile-nav");
  });

  it("mobile nav has id='mobile-nav'", () => {
    render(<Header />);
    const mobileNav = document.getElementById("mobile-nav");
    expect(mobileNav).toBeInTheDocument();
  });

  it("mobile nav has aria-hidden='true' when closed", () => {
    render(<Header />);
    const mobileNav = document.getElementById("mobile-nav");
    expect(mobileNav).toHaveAttribute("aria-hidden", "true");
  });

  it("mobile nav does not have aria-hidden when open", () => {
    render(<Header />);
    const toggle = screen.getByLabelText("Toggle menu");
    fireEvent.click(toggle);
    const mobileNav = document.getElementById("mobile-nav");
    expect(mobileNav).toBeInTheDocument();
    expect(mobileNav).not.toHaveAttribute("aria-hidden", "true");
  });

  it("focus moves to first focusable element when menu opens", () => {
    render(<Header />);
    const toggle = screen.getByLabelText("Toggle menu");
    fireEvent.click(toggle);

    const homeLinks = screen.getAllByText("home");
    const mobileHomeLink = homeLinks[1]!;
    expect(mobileHomeLink).toHaveFocus();
  });

  it("Tab cycles within mobile menu when open", () => {
    render(<Header />);
    const toggle = screen.getByLabelText("Toggle menu");
    fireEvent.click(toggle);

    const homeLinks = screen.getAllByText("home");
    const mobileHomeLink = homeLinks[1]!;
    expect(mobileHomeLink).toHaveFocus();

    fireEvent.keyDown(mobileHomeLink, { key: "Tab" });

    const postsLinks = screen.getAllByText("posts");
    const mobilePostsLink = postsLinks[1]!;
    expect(mobilePostsLink).toBeInTheDocument();
  });

  it("Shift+Tab on first focusable wraps to last focusable", () => {
    render(<Header />);
    const toggle = screen.getByLabelText("Toggle menu");
    fireEvent.click(toggle);

    const homeLinks = screen.getAllByText("home");
    const mobileHomeLink = homeLinks[1]!;
    expect(mobileHomeLink).toHaveFocus();

    // Shift+Tab on first element should wrap to last
    fireEvent.keyDown(mobileHomeLink, { key: "Tab", shiftKey: true });

    const themeToggle = screen.getAllByTestId("theme-toggle")[1]!;
    expect(themeToggle).toHaveFocus();
  });

  it("Tab on last focusable wraps to first focusable", () => {
    render(<Header />);
    const toggle = screen.getByLabelText("Toggle menu");
    fireEvent.click(toggle);

    // Focus the last focusable element (theme toggle in mobile menu)
    const themeToggles = screen.getAllByTestId("theme-toggle");
    const mobileThemeToggle = themeToggles[1]!;
    mobileThemeToggle.focus();
    expect(mobileThemeToggle).toHaveFocus();

    // Tab on last element should wrap to first
    fireEvent.keyDown(mobileThemeToggle, { key: "Tab" });

    const homeLinks = screen.getAllByText("home");
    const mobileHomeLink = homeLinks[1]!;
    expect(mobileHomeLink).toHaveFocus();
  });

  it("Escape closes menu and returns focus to button", () => {
    render(<Header />);
    const toggle = screen.getByLabelText("Toggle menu");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    const mobileNav = document.getElementById("mobile-nav")!;
    fireEvent.keyDown(mobileNav, { key: "Escape" });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(
      document.getElementById("mobile-nav")?.classList.contains("hidden"),
    ).toBe(true);
    expect(toggle).toHaveFocus();
  });

  it("clicking a nav link closes menu and returns focus to button", () => {
    render(<Header />);
    const toggle = screen.getByLabelText("Toggle menu");
    fireEvent.click(toggle);

    const postsLinks = screen.getAllByText("posts");
    fireEvent.click(postsLinks[1]!);

    expect(
      document.getElementById("mobile-nav")?.classList.contains("hidden"),
    ).toBe(true);
    expect(toggle).toHaveFocus();
  });
});

describe("Header - A11y (M3+M4: Nav aria-label)", () => {
  it("desktop nav has aria-label='Main navigation'", () => {
    render(<Header />);
    const navs = document.querySelectorAll("nav");
    expect(navs).toHaveLength(2);
    expect(navs[0]).toHaveAttribute("aria-label", "Main navigation");
  });

  it("mobile nav has aria-label='Main navigation'", () => {
    render(<Header />);
    const mobileNav = document.getElementById("mobile-nav");
    expect(mobileNav).toHaveAttribute("aria-label", "Main navigation");
  });
});
