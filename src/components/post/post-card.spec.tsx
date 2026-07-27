import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
  readingTime: 5,
  locale: "zh-CN",
};

describe("PostCard", () => {
  it("renders the article row with date stamp and metadata", () => {
    render(<PostCard post={basePost} />);

    expect(
      screen.getByText("2026.01.15 / typescript / 5 min"),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Test Post",
    );
    expect(screen.getByText("A test summary")).toBeInTheDocument();
  });

  it("links to the Chinese-only post route", () => {
    render(<PostCard post={basePost} />);

    expect(screen.getByRole("link", { name: "Test Post" })).toHaveAttribute(
      "href",
      "/posts/test-post/",
    );
    expect(screen.getByRole("link", { name: "阅读Test Post" })).toHaveAttribute(
      "href",
      "/posts/test-post/",
    );
  });
});
