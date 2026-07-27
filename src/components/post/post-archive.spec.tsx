import { render, screen } from "@testing-library/react";
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
  it("renders topic context and one article list", () => {
    const { container } = render(
      <PostArchive posts={posts} tags={["手记", "工程"]} />,
    );

    expect(screen.getByLabelText("当前写作主题")).toBeInTheDocument();
    expect(screen.getByText("当前主题")).toBeInTheDocument();
    expect(container.querySelectorAll(".portfolio-article-row")).toHaveLength(
      2,
    );
    expect(screen.getByRole("link", { name: "第一篇" })).toHaveAttribute(
      "href",
      "/posts/first/",
    );
    expect(screen.queryByText("最新阅读")).not.toBeInTheDocument();
  });

  it("renders an empty state when there are no posts", () => {
    render(<PostArchive posts={[]} tags={[]} />);

    expect(screen.getByText("暂无文章")).toBeInTheDocument();
  });
});
