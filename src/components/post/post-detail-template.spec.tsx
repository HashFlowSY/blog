import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  PostDetailTemplate,
  formatDetailDate,
  selectRelatedReading,
  selectRelatedPosts,
} from "./post-detail-template";

import type { Post, PostMeta } from "@/lib/content-catalog";

const post: Post = {
  slug: "hello-world",
  title: "第一篇记录",
  date: "2026-04-02",
  updated: "2026-04-02",
  tags: ["手记", "工具链"],
  summary: "这是一篇用于验证中文博客内容管线的开场记录。",
  readingTime: 6,
  renderedContent: {
    html: '<p>欢迎来到这个被重新整理过的中文个人站。</p><h2 id="topic">这个博客会写什么？</h2><p>这里会记录 Web 开发。</p>',
    headings: [
      { id: "topic", level: 2, text: "这个博客会写什么？" },
      { id: "stack", level: 2, text: "技术栈" },
    ],
  },
};

const catalogPost: Post = {
  slug: "catalog-post",
  title: "Catalog post",
  date: "2026-04-02",
  updated: "2026-04-02",
  tags: ["Testing"],
  summary: "A Post returned by the Content Catalog.",
  readingTime: 4,
  renderedContent: {
    html: '<p>Intro</p><h2 id="catalog-section">Catalog section</h2>',
    headings: [{ id: "catalog-section", level: 2, text: "Catalog section" }],
  },
};

const relatedPosts: PostMeta[] = [
  {
    slug: "interface-notes",
    title: "少用装饰，多用材料",
    date: "2026-03-29",
    updated: "2026-03-29",
    tags: ["Interface"],
    summary: "用边界、纹理和比例建立风格。",
    readingTime: 4,
  },
];

function makePostMeta(overrides: Partial<PostMeta>): PostMeta {
  return {
    slug: "example",
    title: "Example",
    date: "2026-01-01",
    updated: "2026-01-01",
    tags: ["Testing"],
    summary: "Example summary",
    readingTime: 4,
    ...overrides,
  };
}

describe("post detail template helpers", () => {
  it("formats ISO dates as the detail record stamp", () => {
    expect(formatDetailDate("2026-04-02")).toBe("2026.04.02");
  });

  it("keeps unknown dates readable instead of throwing", () => {
    expect(formatDetailDate("not-a-date")).toBe("not-a-date");
  });

  it("selects related posts by shared tags first, then date proximity", () => {
    const posts: PostMeta[] = [
      makePostMeta({
        slug: "hello-world",
        date: "2026-04-10",
        tags: ["AI", "Design"],
      }),
      makePostMeta({
        slug: "unrelated-latest",
        date: "2026-06-01",
        tags: ["Archive"],
      }),
      makePostMeta({
        slug: "one-shared-later",
        date: "2026-05-01",
        tags: ["Design"],
      }),
      makePostMeta({
        slug: "two-shared-far",
        date: "2025-01-01",
        tags: ["AI", "Design"],
      }),
      makePostMeta({
        slug: "one-shared-close",
        date: "2026-04-11",
        tags: ["AI"],
      }),
    ];

    expect(
      selectRelatedPosts("hello-world", posts, 3).map((item) => item.slug),
    ).toEqual(["two-shared-far", "one-shared-close", "one-shared-later"]);
  });

  it("falls back to latest posts when no post shares tags", () => {
    const posts: PostMeta[] = [
      makePostMeta({
        slug: "hello-world",
        date: "2026-04-10",
        tags: ["AI"],
      }),
      makePostMeta({
        slug: "latest",
        date: "2026-05-01",
        tags: ["Archive"],
      }),
      makePostMeta({
        slug: "older",
        date: "2026-01-01",
        tags: ["Design"],
      }),
    ];

    expect(selectRelatedReading("hello-world", posts, 2)).toMatchObject({
      title: "最新文章",
      posts: [{ slug: "latest" }, { slug: "older" }],
    });
  });
});

describe("PostDetailTemplate", () => {
  it("renders the Content Catalog's structured Markdown result directly", () => {
    const { getByText } = render(
      <PostDetailTemplate post={catalogPost} relatedPosts={[]} />,
    );

    expect(getByText("Catalog section")).toBeInTheDocument();
  });

  it("renders the portfolio reading template with dynamic post metadata", () => {
    const { container, getByRole, getByText } = render(
      <PostDetailTemplate
        post={post}
        relatedPosts={relatedPosts}
        relatedTitle="关联阅读"
      />,
    );

    expect(container.querySelector(".article-shell")).toBeInTheDocument();
    expect(container.querySelector(".detail-hero")).toBeInTheDocument();
    expect(
      container.querySelector(".portfolio-article-meta"),
    ).toBeInTheDocument();
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

  it("renders numbered table-of-contents links for Catalog headings", () => {
    const { getByRole } = render(
      <PostDetailTemplate
        post={post}
        relatedPosts={relatedPosts}
        relatedTitle="关联阅读"
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
        post={post}
        relatedPosts={relatedPosts}
        relatedTitle="关联阅读"
      />,
    );

    expect(getByRole("link", { name: /少用装饰，多用材料/ })).toHaveAttribute(
      "href",
      "/posts/interface-notes/",
    );
    expect(getByText("2026.03.29 / Interface")).toBeInTheDocument();
  });

  it("omits the table of contents for short articles", () => {
    const { queryByLabelText } = render(
      <PostDetailTemplate
        post={{
          ...post,
          renderedContent: { ...post.renderedContent, headings: [] },
        }}
        relatedPosts={[]}
      />,
    );

    expect(queryByLabelText("文章目录")).not.toBeInTheDocument();
  });

  it("renders a latest-posts heading for fallback recommendations", () => {
    const { getByRole } = render(
      <PostDetailTemplate
        post={post}
        relatedPosts={relatedPosts}
        relatedTitle="最新文章"
      />,
    );

    expect(getByRole("heading", { name: "最新文章" })).toBeInTheDocument();
  });
});
