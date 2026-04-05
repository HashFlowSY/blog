vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    className,
    variant,
    ...props
  }: {
    children: React.ReactNode;
    className?: string;
    variant?: string;
    [key: string]: unknown;
  }) =>
    createElement(
      "span",
      { "data-testid": "badge", className, variant, ...props },
      children,
    ),
}));

import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, it, expect } from "vitest";

import { TagBadge } from "./tag-badge";

describe("TagBadge", () => {
  it("renders tag text", () => {
    render(<TagBadge tag="typescript" />);
    expect(screen.getByText("typescript")).toBeInTheDocument();
  });

  it("applies sm size styles by default", () => {
    render(<TagBadge tag="test" />);
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("h-5");
  });

  it("applies md size styles", () => {
    render(<TagBadge tag="react" size="md" />);
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("h-7");
  });

  it("passes variant=secondary to Badge", () => {
    render(<TagBadge tag="test" />);
    const badge = screen.getByTestId("badge");
    expect(badge.getAttribute("variant")).toBe("secondary");
  });

  it("applies custom className", () => {
    render(<TagBadge tag="test" className="extra-class" />);
    const badge = screen.getByTestId("badge");
    expect(badge.className).toContain("extra-class");
  });
});
