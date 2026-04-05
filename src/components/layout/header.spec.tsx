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
    expect(screen.getByText("home")).toBeInTheDocument();
    expect(screen.getByText("posts")).toBeInTheDocument();
    expect(screen.getByText("projects")).toBeInTheDocument();
    expect(screen.getByText("about")).toBeInTheDocument();
  });

  it("highlights active nav link for root path", () => {
    render(<Header />);
    const homeLink = screen.getAllByText("home")[0]!;
    expect(homeLink.className).toContain("font-medium");
  });

  it("does not highlight inactive nav link", () => {
    render(<Header />);
    const postsLink = screen.getAllByText("posts")[0]!;
    expect(postsLink.className).toContain("text-muted-foreground");
  });

  it("renders locale switcher with EN text", () => {
    render(<Header />);
    expect(screen.getByText("EN")).toBeInTheDocument();
  });

  it("mobile menu is closed by default", () => {
    const { container } = render(<Header />);
    expect(container.querySelectorAll("nav")).toHaveLength(1);
  });

  it("clicking hamburger opens mobile menu", () => {
    render(<Header />);
    const toggle = screen.getByLabelText("Toggle menu");
    fireEvent.click(toggle);
    expect(document.querySelectorAll("nav")).toHaveLength(2);
  });

  it("clicking mobile nav link closes menu", () => {
    render(<Header />);
    const toggle = screen.getByLabelText("Toggle menu");
    fireEvent.click(toggle);
    expect(document.querySelectorAll("nav")).toHaveLength(2);

    const postsLinks = screen.getAllByText("posts");
    fireEvent.click(postsLinks[1]!);
    expect(document.querySelectorAll("nav")).toHaveLength(1);
  });
});
