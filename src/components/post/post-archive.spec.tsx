import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PostArchive } from "./post-archive";

import type { PostCardMeta } from "@/lib/content-catalog";

const indexUrl = "/blog/search-index.json";
const index = [
  { slug: "first", blocks: [] },
  { slug: "second", blocks: ["月抛站位于正文。"] },
];

const posts: PostCardMeta[] = [
  {
    slug: "first",
    title: "第一篇",
    date: "2026-01-02",
    tags: ["手记"],
    summary: "第一篇摘要",
    readingMinutes: 3,
  },
  {
    slug: "second",
    title: "第二篇",
    date: "2026-02-03",
    tags: ["工程"],
    summary: "第二篇摘要",
    readingMinutes: 5,
  },
];

describe("PostArchive", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/posts/");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders an empty state when there are no posts", () => {
    render(<PostArchive posts={[]} tags={[]} indexUrl={indexUrl} />);

    expect(screen.getByText("暂无文章")).toBeInTheDocument();
  });

  it("combines keyword and topic filters and restores all articles when cleared", async () => {
    const fetchIndex = vi.fn().mockResolvedValue(Response.json(index));
    vi.stubGlobal("fetch", fetchIndex);
    render(
      <PostArchive posts={posts} tags={["手记", "工程"]} indexUrl={indexUrl} />,
    );
    const search = screen.getByRole("searchbox", { name: "查找文章" });
    fireEvent.change(search, { target: { value: "第二篇摘要" } });
    expect(
      await screen.findByRole("link", { name: "第二篇" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "第一篇" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "手记" }));
    expect(await screen.findByText("没有找到匹配的文章")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("0 / 2 篇文章");
    fireEvent.click(screen.getByRole("button", { name: "清除筛选" }));
    expect(search).toHaveValue("");
    expect(search).toHaveFocus();
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "全部" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("toggles a selected topic off", () => {
    const fetchIndex = vi.fn();
    vi.stubGlobal("fetch", fetchIndex);
    render(
      <PostArchive posts={posts} tags={["手记", "工程"]} indexUrl={indexUrl} />,
    );
    const topic = screen.getByRole("button", { name: "工程" });
    fireEvent.click(topic);
    expect(screen.getAllByRole("article")).toHaveLength(1);
    fireEvent.click(topic);
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(fetchIndex).not.toHaveBeenCalled();
  });

  it("waits for Chinese composition before searching and can remove only the topic", async () => {
    const fetchIndex = vi.fn().mockResolvedValue(Response.json(index));
    vi.stubGlobal("fetch", fetchIndex);
    render(
      <PostArchive
        posts={posts}
        tags={["手记", "工程"]}
        indexUrl="/ime-index.json"
      />,
    );
    const search = screen.getByRole("searchbox", { name: "查找文章" });
    fireEvent.click(screen.getByRole("button", { name: "手记" }));
    fireEvent.compositionStart(search);
    fireEvent.change(search, { target: { value: "yue" } });
    expect(fetchIndex).not.toHaveBeenCalled();
    expect(new URLSearchParams(window.location.search).has("q")).toBe(false);
    expect(screen.getByRole("link", { name: "第一篇" })).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "月抛站" } });
    fireEvent.compositionEnd(search);
    expect(fetchIndex).toHaveBeenCalledTimes(1);
    expect(new URLSearchParams(window.location.search).get("q")).toBe("月抛站");
    fireEvent.click(await screen.findByRole("button", { name: "仅取消主题" }));

    expect(search).toHaveValue("月抛站");
    expect(search).toHaveFocus();
    expect(
      screen.getByRole("link", { name: "第二篇" }),
    ).toHaveAccessibleDescription("正文：月抛站位于正文。");
  });

  it("shows a direct search error without partial results and retries the same search", async () => {
    const fetchIndex = vi
      .fn()
      .mockResolvedValueOnce(new Response("Missing", { status: 404 }))
      .mockResolvedValueOnce(Response.json(index));
    vi.stubGlobal("fetch", fetchIndex);
    render(
      <PostArchive
        posts={posts}
        tags={["手记", "工程"]}
        indexUrl="/retry-index.json"
      />,
    );
    const search = screen.getByRole("searchbox", { name: "查找文章" });
    fireEvent.click(screen.getByRole("button", { name: "工程" }));
    fireEvent.change(search, { target: { value: "第二篇" } });
    expect(screen.getByRole("status")).toHaveTextContent("正在搜索文章");
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(
      await screen.findByText("无法加载文章搜索索引。"),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    expect(screen.queryByText("没有找到匹配的文章")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "重试搜索" }));

    expect(
      await screen.findByRole("link", { name: "第二篇" }),
    ).toBeInTheDocument();
    expect(search).toHaveValue("第二篇");
    expect(new URLSearchParams(window.location.search).get("topic")).toBe(
      "工程",
    );
    expect(fetchIndex).toHaveBeenCalledTimes(2);
  });
});
