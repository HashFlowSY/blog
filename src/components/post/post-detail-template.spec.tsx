import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  PostDetailTemplate,
  formatDetailDate,
  selectRelatedPosts,
  stripLeadingTitleHeading,
} from "./post-detail-template";

import type { TocItem } from "@/lib/markdown";
import type { Post, PostMeta } from "@/lib/posts";

const post: Post = {
  slug: "hello-world",
  title: "第一篇记录",
  date: "2026-04-02",
  updated: "2026-04-02",
  tags: ["手记", "工具链"],
  summary: "这是一篇用于验证中文博客内容管线的开场记录。",
  cover: null,
  readingTime: 6,
  locale: "zh-CN",
  content:
    '<p>欢迎来到这个被重新整理过的中文个人站。</p><h2 id="topic">这个博客会写什么？</h2><p>这里会记录 Web 开发。</p>',
};

const headings: TocItem[] = [
  { id: "topic", level: 2, text: "这个博客会写什么？" },
  { id: "stack", level: 2, text: "技术栈" },
];

const relatedPosts: PostMeta[] = [
  {
    slug: "interface-notes",
    title: "少用装饰，多用材料",
    date: "2026-03-29",
    updated: "2026-03-29",
    tags: ["Interface"],
    summary: "用边界、纹理和比例建立风格。",
    cover: null,
    readingTime: 4,
    locale: "zh-CN",
  },
];

describe("post detail template helpers", () => {
  it("formats ISO dates as the detail record stamp", () => {
    expect(formatDetailDate("2026-04-02")).toBe("2026.04.02");
  });

  it("keeps unknown dates readable instead of throwing", () => {
    expect(formatDetailDate("not-a-date")).toBe("not-a-date");
  });

  it("selects related posts by excluding the current slug and limiting results", () => {
    const posts: PostMeta[] = [
      { ...relatedPosts[0]!, slug: "hello-world", title: "current" },
      { ...relatedPosts[0]!, slug: "a", title: "A" },
      { ...relatedPosts[0]!, slug: "b", title: "B" },
      { ...relatedPosts[0]!, slug: "c", title: "C" },
    ];

    expect(
      selectRelatedPosts("hello-world", posts, 2).map((item) => item.slug),
    ).toEqual(["a", "b"]);
  });

  it("removes a duplicate leading h1 that matches the post title", () => {
    const html = '<h1 id="first">第一篇记录</h1><p>正文开始。</p>';

    expect(stripLeadingTitleHeading(html, "第一篇记录")).toBe(
      "<p>正文开始。</p>",
    );
  });

  it("keeps a leading h1 when it is not the same as the post title", () => {
    const html = '<h1 id="first">不同标题</h1><p>正文开始。</p>';

    expect(stripLeadingTitleHeading(html, "第一篇记录")).toBe(html);
  });
});

describe("PostDetailTemplate", () => {
  it("renders the industrial reading template with dynamic post metadata", () => {
    const { container, getByRole, getByText } = render(
      <PostDetailTemplate
        contentHtml={post.content}
        headings={headings}
        post={post}
        relatedPosts={relatedPosts}
      />,
    );

    expect(container.querySelector(".article-shell")).toBeInTheDocument();
    expect(container.querySelector(".detail-hero")).toBeInTheDocument();
    expect(container.querySelector(".detail-panel")).toBeInTheDocument();
    expect(container.querySelector(".reader-card")).toBeInTheDocument();
    expect(container.querySelector(".article-body")).toBeInTheDocument();
    expect(container.querySelector(".related-section")).toBeInTheDocument();
    expect(container.querySelector(".read-progress")).toBeInTheDocument();

    expect(
      getByRole("heading", { level: 1, name: "第一篇记录" }),
    ).toBeInTheDocument();
    expect(getByText("2026.04.02")).toBeInTheDocument();
    expect(getByText("6 min")).toBeInTheDocument();
    expect(getByText("手记")).toBeInTheDocument();
    expect(getByText("工具链")).toBeInTheDocument();
  });

  it("renders numbered table-of-contents links for extracted headings", () => {
    const { getByRole } = render(
      <PostDetailTemplate
        contentHtml={post.content}
        headings={headings}
        post={post}
        relatedPosts={relatedPosts}
      />,
    );

    expect(
      getByRole("link", { name: "01 这个博客会写什么？" }),
    ).toHaveAttribute("href", "#topic");
    expect(getByRole("link", { name: "02 技术栈" })).toHaveAttribute(
      "href",
      "#stack",
    );
  });

  it("renders related reading cards from dynamic posts", () => {
    const { getByRole, getByText } = render(
      <PostDetailTemplate
        contentHtml={post.content}
        headings={headings}
        post={post}
        relatedPosts={relatedPosts}
      />,
    );

    expect(getByRole("link", { name: /少用装饰，多用材料/ })).toHaveAttribute(
      "href",
      "/posts/interface-notes/",
    );
    expect(getByText("2026.03.29 / Interface")).toBeInTheDocument();
  });

  it("uses an uncategorized tag when a post has no tags", () => {
    const { getByText } = render(
      <PostDetailTemplate
        contentHtml={post.content}
        headings={headings}
        post={{ ...post, tags: [] }}
        relatedPosts={[]}
      />,
    );

    expect(getByText("未分类")).toBeInTheDocument();
    expect(getByText("暂无关联阅读")).toBeInTheDocument();
  });
});
