import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PostCard } from "./post-card";

import type { PostCardMeta } from "@/lib/content-catalog";

const basePost: PostCardMeta = {
  slug: "test-post",
  title: "Test Post",
  date: "2026-01-15",
  tags: ["typescript", "react"],
  summary: "A test summary",
  readingMinutes: 5,
};

describe("PostCard", () => {
  it("renders the article row with date stamp and metadata", () => {
    render(<PostCard post={basePost} />);

    expect(screen.getByText("2026.01.15")).toHaveAttribute(
      "datetime",
      "2026-01-15",
    );
    expect(screen.getByText("typescript")).toBeInTheDocument();
    expect(screen.getByText("约 5 分钟")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Test Post",
    );
    expect(screen.getByText("A test summary")).toBeInTheDocument();
  });

  it("makes the title and summary part of one post link", () => {
    render(<PostCard post={basePost} />);

    const link = screen.getByRole("link", { name: "Test Post" });
    expect(link).toHaveAttribute("href", "/posts/test-post/");
    expect(link).toContainElement(screen.getByText("A test summary"));
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});
