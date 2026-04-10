vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

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

vi.mock("@/lib/posts", () => ({
  getPostBySlug: vi.fn().mockResolvedValue({
    slug: "test-post",
    title: "Test Post",
    date: "2026-01-01",
    updated: "2026-01-01",
    tags: ["typescript"],
    summary: "A test post summary",
    cover: null,
    content:
      '<h1 id="intro">Introduction</h1><p>Content here.</p><h2 id="details">Details</h2><p>More details.</p>',
    readingTime: 1,
    locale: "zh-CN",
  }),
  getAllPostsMeta: (_locale: string) => [
    {
      slug: "test-post",
      title: "Test Post",
      date: "2026-01-01",
      updated: "2026-01-01",
      tags: ["typescript"],
      summary: "A test post summary",
      cover: null,
      readingTime: 1,
      locale: "zh-CN",
    },
    {
      slug: "other-post",
      title: "Other Post",
      date: "2026-01-02",
      updated: "2026-01-02",
      tags: ["react"],
      summary: "Another post",
      cover: null,
      readingTime: 1,
      locale: "zh-CN",
    },
  ],
  getAdjacentPosts: (_slug: string, _locale: string) => ({
    prev: { slug: "prev-post", title: "Previous Post" },
    next: { slug: "next-post", title: "Next Post" },
  }),
}));

vi.mock("@/lib/site", () => ({
  siteUrl: (path: string) => `https://example.com${path}`,
}));

vi.mock("@/lib/markdown", () => ({
  extractHeadings: () => [
    { level: 1, id: "intro", text: "Introduction" },
    { level: 2, id: "details", text: "Details" },
  ],
}));

vi.mock("@/components/post/post-toc", () => ({
  PostToc: () => createElement("nav", { "data-testid": "post-toc" }, "TOC"),
}));

vi.mock("@/components/tag", () => ({
  TagBadge: ({ tag }: { tag: string }) =>
    createElement("span", { "data-testid": "tag-badge" }, tag),
}));

import { render } from "@testing-library/react";
import { createElement } from "react";
import { describe, it, expect, vi } from "vitest";

import { og, tw } from "@/test-utils/metadata";

import PostDetailPage, { generateMetadata } from "./page";

describe("PostDetailPage", () => {
  it("renders post title", async () => {
    const html = await renderPost();
    const h1 = html.querySelector("h1");
    expect(h1).toHaveTextContent("Test Post");
  });

  it("renders post content", async () => {
    const html = await renderPost();
    expect(html.textContent).toContain("Content here.");
  });

  it("renders post date", async () => {
    const html = await renderPost();
    expect(html.textContent).toContain("2026-01-01");
  });

  it("renders previous and next navigation links", async () => {
    const html = await renderPost();
    expect(html.textContent).toContain("Previous Post");
    expect(html.textContent).toContain("Next Post");
  });
});

describe("PostDetailPage - A11y (M4: Post navigation aria-label)", () => {
  it("prev/next nav has aria-label='Post navigation'", async () => {
    const html = await renderPost();
    const navs = html.querySelectorAll("nav");
    const postNav = Array.from(navs).find(
      (n) => n.getAttribute("aria-label") === "Post navigation",
    );
    expect(postNav).toBeInTheDocument();
  });
});

describe("PostDetailPage generateMetadata", () => {
  it("returns title from post", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN", slug: "test-post" }),
    });
    expect(metadata.title).toBe("Test Post");
  });

  it("returns description from post summary", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN", slug: "test-post" }),
    });
    expect(metadata.description).toBe("A test post summary");
  });

  it("returns alternates.canonical with full URL", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN", slug: "test-post" }),
    });
    expect(metadata.alternates?.canonical).toBe(
      "https://example.com/zh-CN/posts/test-post/",
    );
  });

  it("returns openGraph with title and description", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN", slug: "test-post" }),
    });
    expect(metadata.openGraph?.title).toBe("Test Post");
    expect(metadata.openGraph?.description).toBe("A test post summary");
  });

  it("returns openGraph type as article", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN", slug: "test-post" }),
    });
    expect(og(metadata)?.type).toBe("article");
  });

  it("returns openGraph publishedTime and modifiedTime", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN", slug: "test-post" }),
    });
    expect(og(metadata)?.publishedTime).toBe("2026-01-01");
    expect(og(metadata)?.modifiedTime).toBe("2026-01-01");
  });

  it("returns openGraph tags", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN", slug: "test-post" }),
    });
    expect(og(metadata)?.tags).toEqual(["typescript"]);
  });

  it("returns openGraph url", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN", slug: "test-post" }),
    });
    expect(metadata.openGraph?.url).toBe(
      "https://example.com/zh-CN/posts/test-post/",
    );
  });

  it("returns openGraph locale", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN", slug: "test-post" }),
    });
    expect(metadata.openGraph?.locale).toBe("zh_CN");
  });

  it("returns twitter card as summary_large_image", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN", slug: "test-post" }),
    });
    expect(tw(metadata)?.card).toBe("summary_large_image");
  });

  it("returns twitter title and description", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN", slug: "test-post" }),
    });
    expect(metadata.twitter?.title).toBe("Test Post");
    expect(metadata.twitter?.description).toBe("A test post summary");
  });

  it("returns empty metadata when post not found", async () => {
    const { getPostBySlug } = await import("@/lib/posts");
    vi.mocked(getPostBySlug).mockResolvedValueOnce(null);
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN", slug: "nonexistent" }),
    });
    expect(metadata).toEqual({});
  });
});

describe("PostDetailPage JSON-LD", () => {
  it("renders BlogPosting schema in script tag", async () => {
    const html = await renderPost();
    const script = html.querySelector('script[type="application/ld+json"]');
    expect(script).toBeInTheDocument();
  });

  it("JSON-LD contains @type BlogPosting", async () => {
    const html = await renderPost();
    const script = html.querySelector<HTMLScriptElement>(
      'script[type="application/ld+json"]',
    );
    expect(script).toBeTruthy();
    const jsonLd = JSON.parse(script!.textContent!);
    expect(jsonLd["@type"]).toBe("BlogPosting");
  });

  it("JSON-LD contains headline from post title", async () => {
    const html = await renderPost();
    const script = html.querySelector<HTMLScriptElement>(
      'script[type="application/ld+json"]',
    );
    expect(script).toBeTruthy();
    const jsonLd = JSON.parse(script!.textContent!);
    expect(jsonLd.headline).toBe("Test Post");
  });

  it("JSON-LD contains datePublished", async () => {
    const html = await renderPost();
    const script = html.querySelector<HTMLScriptElement>(
      'script[type="application/ld+json"]',
    );
    expect(script).toBeTruthy();
    const jsonLd = JSON.parse(script!.textContent!);
    expect(jsonLd.datePublished).toBe("2026-01-01");
  });

  it("JSON-LD contains dateModified", async () => {
    const html = await renderPost();
    const script = html.querySelector<HTMLScriptElement>(
      'script[type="application/ld+json"]',
    );
    expect(script).toBeTruthy();
    const jsonLd = JSON.parse(script!.textContent!);
    expect(jsonLd.dateModified).toBe("2026-01-01");
  });

  it("JSON-LD contains keywords from tags", async () => {
    const html = await renderPost();
    const script = html.querySelector<HTMLScriptElement>(
      'script[type="application/ld+json"]',
    );
    expect(script).toBeTruthy();
    const jsonLd = JSON.parse(script!.textContent!);
    expect(jsonLd.keywords).toBe("typescript");
  });
});

/**
 * Helper to render a server component and return the container.
 */
async function renderPost(): Promise<HTMLElement> {
  const element = await PostDetailPage({
    params: Promise.resolve({ locale: "zh-CN", slug: "test-post" }),
  });
  const { container } = render(createElement("div", null, element));
  return container;
}
