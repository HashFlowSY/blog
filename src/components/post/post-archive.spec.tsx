import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PostArchive } from "./post-archive";

import type { PostMeta } from "@/lib/content-catalog";

const posts: PostMeta[] = [
  {
    slug: "first",
    title: "第一篇",
    date: "2026-01-02",
    updated: "2026-01-02",
    tags: ["手记"],
    summary: "第一篇摘要",
    readingTime: 3,
  },
  {
    slug: "second",
    title: "第二篇",
    date: "2026-02-03",
    updated: "2026-02-03",
    tags: ["工程"],
    summary: "第二篇摘要",
    readingTime: 5,
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

  it("combines keyword and topic filters and restores all articles when cleared", () => {
    render(<PostArchive posts={posts} tags={["手记", "工程"]} />);
    const search = screen.getByRole("searchbox", { name: "查找文章" });
    fireEvent.change(search, { target: { value: "第二篇摘要" } });
    expect(screen.getByRole("link", { name: "第二篇" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "第一篇" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "手记" }));
    expect(screen.getByText("没有找到匹配的文章")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("0 / 2 篇文章");
    fireEvent.click(screen.getByRole("button", { name: "清除筛选" }));
    expect(search).toHaveValue("");
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "全部" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("toggles a selected topic off without losing the search query", () => {
    render(<PostArchive posts={posts} tags={["手记", "工程"]} />);
    const topic = screen.getByRole("button", { name: "工程" });
    fireEvent.click(topic);
    expect(screen.getAllByRole("article")).toHaveLength(1);
    fireEvent.click(topic);
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });
});
