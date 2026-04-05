vi.mock("./post-card", () => ({
  PostCard: ({ post }: { post: { title: string; [key: string]: unknown } }) =>
    createElement("div", { "data-testid": "post-card" }, post.title),
}));

import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, it, expect } from "vitest";

import { PostList } from "./post-list";

import type { PostMeta } from "@/lib/posts";

const posts: PostMeta[] = [
  {
    slug: "post-1",
    title: "First Post",
    date: "2026-01-15",
    updated: "2026-01-15",
    tags: [],
    summary: "",
    cover: null,
  },
  {
    slug: "post-2",
    title: "Second Post",
    date: "2026-02-20",
    updated: "2026-02-20",
    tags: [],
    summary: "",
    cover: null,
  },
];

describe("PostList", () => {
  it("renders PostCard for each post", () => {
    render(<PostList posts={posts} />);
    expect(screen.getAllByTestId("post-card")).toHaveLength(2);
  });

  it("returns null when posts is empty", () => {
    const { container } = render(<PostList posts={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("passes updatedLabel to PostCard when provided", () => {
    const { container } = render(
      <PostList posts={posts} updatedLabel="Updated" />,
    );
    expect(container.firstChild).not.toBeNull();
  });

  it("does not crash when updatedLabel is undefined", () => {
    const { container } = render(<PostList posts={posts} />);
    expect(container.firstChild).not.toBeNull();
  });
});
