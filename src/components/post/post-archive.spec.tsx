import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PostArchive } from "./post-archive";

import type { PostMeta } from "@/lib/posts";

const posts: PostMeta[] = [
  {
    slug: "first",
    title: "第一篇",
    date: "2026-01-02",
    updated: "2026-01-02",
    tags: ["手记"],
    summary: "第一篇摘要",
    cover: null,
    readingTime: 3,
    locale: "zh-CN",
  },
  {
    slug: "second",
    title: "第二篇",
    date: "2026-02-03",
    updated: "2026-02-03",
    tags: ["工程"],
    summary: "第二篇摘要",
    cover: null,
    readingTime: 5,
    locale: "zh-CN",
  },
];

describe("PostArchive", () => {
  it("renders archive filters, article cards, and latest reading links", () => {
    const { container } = render(
      <PostArchive posts={posts} tags={["手记", "工程"]} />,
    );

    expect(screen.getByLabelText("文章筛选")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /全部 02/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(container.querySelectorAll(".article-card")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "第一篇" })).toHaveAttribute(
      "href",
      "/posts/first/",
    );
    expect(
      screen.getByRole("heading", { name: "最新阅读" }),
    ).toBeInTheDocument();
  });

  it("filters posts by tag and can reset to all posts", () => {
    const { container } = render(
      <PostArchive posts={posts} tags={["手记", "工程"]} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /工程 01/ }));

    expect(container.querySelectorAll(".article-card")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "第二篇" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "第一篇" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /全部 02/ }));

    expect(container.querySelectorAll(".article-card")).toHaveLength(2);
  });

  it("renders an empty state when no post matches the selected tag", () => {
    render(<PostArchive posts={posts} tags={["不存在"]} />);

    fireEvent.click(screen.getByRole("button", { name: /不存在 00/ }));

    expect(screen.getByText("暂无文章")).toBeInTheDocument();
  });
});
