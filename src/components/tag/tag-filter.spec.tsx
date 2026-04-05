import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { TagFilter } from "./tag-filter";

describe("TagFilter", () => {
  const defaultProps = {
    tags: ["react", "vue"],
    activeTag: null as string | null,
    onTagChange: vi.fn(),
    allLabel: "All",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when tags is empty", () => {
    const { container } = render(<TagFilter {...defaultProps} tags={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders All button with allLabel text", () => {
    render(<TagFilter {...defaultProps} />);
    expect(screen.getByText("All")).toBeInTheDocument();
  });

  it("renders a button for each tag", () => {
    render(<TagFilter {...defaultProps} />);
    expect(screen.getByText("react")).toBeInTheDocument();
    expect(screen.getByText("vue")).toBeInTheDocument();
  });

  it("All button calls onTagChange(null) on click", () => {
    render(<TagFilter {...defaultProps} />);
    fireEvent.click(screen.getByText("All"));
    expect(defaultProps.onTagChange).toHaveBeenCalledWith(null);
  });

  it("clicking inactive tag calls onTagChange(tag)", () => {
    render(<TagFilter {...defaultProps} />);
    fireEvent.click(screen.getByText("react"));
    expect(defaultProps.onTagChange).toHaveBeenCalledWith("react");
  });

  it("clicking active tag calls onTagChange(null) to deselect", () => {
    render(<TagFilter {...defaultProps} activeTag="react" />);
    fireEvent.click(screen.getByText("react"));
    expect(defaultProps.onTagChange).toHaveBeenCalledWith(null);
  });

  it("active tag has primary styling", () => {
    render(<TagFilter {...defaultProps} activeTag="react" />);
    const btn = screen.getByText("react");
    expect(btn.className).toContain("bg-primary");
  });

  it("inactive tags have muted styling", () => {
    render(<TagFilter {...defaultProps} />);
    const btn = screen.getByText("react");
    expect(btn.className).toContain("text-muted-foreground");
  });

  it("applies custom className", () => {
    render(<TagFilter {...defaultProps} className="mt-6" />);
    const wrapper = screen.getByText("All").parentElement;
    expect(wrapper?.className).toContain("mt-6");
  });
});
