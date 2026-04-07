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
}));

vi.mock("@/components/tag", () => ({
  TagBadge: ({ tag }: { tag: string }) =>
    createElement("span", { "data-testid": "tag-badge" }, tag),
}));

import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, it, expect } from "vitest";

import { PostCard } from "./post-card";

import type { PostMeta } from "@/lib/posts";

const basePost: PostMeta = {
  slug: "test-post",
  title: "Test Post",
  date: "2026-01-15",
  updated: "2026-01-15",
  tags: ["typescript", "react"],
  summary: "A test summary",
  cover: null,
  readingTime: 0,
};

describe("PostCard", () => {
  it("renders post title", () => {
    render(<PostCard post={basePost} />);
    expect(screen.getByText("Test Post")).toBeInTheDocument();
  });

  it("renders date in time element with dateTime", () => {
    render(<PostCard post={basePost} />);
    const time = screen.getByText("2026-01-15");
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("dateTime", "2026-01-15");
  });

  it("renders summary when present", () => {
    render(<PostCard post={basePost} />);
    expect(screen.getByText("A test summary")).toBeInTheDocument();
  });

  it("does not render summary when empty", () => {
    const noSummary = { ...basePost, summary: "" };
    render(<PostCard post={noSummary} />);
    expect(screen.queryByText("A test summary")).not.toBeInTheDocument();
  });

  it("renders TagBadge for each tag", () => {
    render(<PostCard post={basePost} />);
    expect(screen.getAllByTestId("tag-badge")).toHaveLength(2);
    expect(screen.getByText("typescript")).toBeInTheDocument();
    expect(screen.getByText("react")).toBeInTheDocument();
  });

  it("does not render tags section when tags empty", () => {
    const noTags = { ...basePost, tags: [] };
    render(<PostCard post={noTags} />);
    expect(screen.queryByTestId("tag-badge")).not.toBeInTheDocument();
  });

  it("links to /posts/{slug}/", () => {
    render(<PostCard post={basePost} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/posts/test-post/");
  });

  it("shows updated date when updated !== date and updatedLabel provided", () => {
    const updated = { ...basePost, updated: "2026-02-01" };
    render(<PostCard post={updated} updatedLabel="Updated" />);
    expect(screen.getByText(/2026-02-01/)).toBeInTheDocument();
  });

  it("does not show updated date when updated === date", () => {
    render(<PostCard post={basePost} updatedLabel="Updated" />);
    // Should only have one date text (the time element)
    expect(screen.getByText("2026-01-15")).toBeInTheDocument();
    expect(screen.queryByText("Updated 2026-01-15")).not.toBeInTheDocument();
  });

  it("does not show updated date when updatedLabel is undefined", () => {
    const updated = { ...basePost, updated: "2026-02-01" };
    render(<PostCard post={updated} />);
    expect(screen.queryByText("2026-02-01")).not.toBeInTheDocument();
  });
});

describe("PostCard - A11y (H6: Heading hierarchy)", () => {
  it("uses h2 element for post title instead of h3", () => {
    render(<PostCard post={basePost} />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("Test Post");
  });

  it("does not render h3 element", () => {
    render(<PostCard post={basePost} />);
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });
});
