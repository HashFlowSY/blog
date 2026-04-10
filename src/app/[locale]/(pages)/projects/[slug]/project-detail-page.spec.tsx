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

vi.mock("@/lib/projects", () => ({
  getProjectBySlug: vi.fn().mockResolvedValue({
    slug: "test-project",
    title: "Test Project",
    description: "A test project description",
    date: "2026-03-01",
    tags: ["rust", "web"],
    cover: null,
    source: "https://github.com/example/repo",
    demo: "https://example.com",
    featured: true,
    content: "<p>Project content here.</p>",
    locale: "zh-CN",
  }),
  getAllProjectsMeta: (_locale: string) => [
    {
      slug: "test-project",
      title: "Test Project",
      description: "A test project description",
      date: "2026-03-01",
      tags: ["rust", "web"],
      cover: null,
      source: "https://github.com/example/repo",
      demo: "https://example.com",
      featured: true,
      locale: "zh-CN",
    },
  ],
}));

vi.mock("@/lib/site", () => ({
  siteUrl: (path: string) => `https://example.com${path}`,
}));

vi.mock("@/components/tag", () => ({
  TagBadge: ({ tag }: { tag: string }) =>
    createElement("span", { "data-testid": "tag-badge" }, tag),
}));

import { createElement } from "react";
import { describe, it, expect, vi } from "vitest";

import { og, tw } from "@/test-utils/metadata";

import { generateMetadata } from "./page";

describe("ProjectDetailPage generateMetadata", () => {
  it("returns title from project", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN", slug: "test-project" }),
    });
    expect(metadata.title).toBe("Test Project");
  });

  it("returns description from project", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN", slug: "test-project" }),
    });
    expect(metadata.description).toBe("A test project description");
  });

  it("returns openGraph with title and description", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN", slug: "test-project" }),
    });
    expect(metadata.openGraph?.title).toBe("Test Project");
    expect(metadata.openGraph?.description).toBe("A test project description");
  });

  it("returns openGraph type as article", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN", slug: "test-project" }),
    });
    expect(og(metadata)?.type).toBe("article");
  });

  it("returns openGraph url", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN", slug: "test-project" }),
    });
    expect(metadata.openGraph?.url).toBe(
      "https://example.com/zh-CN/projects/test-project/",
    );
  });

  it("returns openGraph locale", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN", slug: "test-project" }),
    });
    expect(metadata.openGraph?.locale).toBe("zh_CN");
  });

  it("returns openGraph tags", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN", slug: "test-project" }),
    });
    expect(og(metadata)?.tags).toEqual(["rust", "web"]);
  });

  it("returns openGraph publishedTime from project date", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN", slug: "test-project" }),
    });
    expect(og(metadata)?.publishedTime).toBe("2026-03-01");
  });

  it("returns twitter card as summary_large_image", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN", slug: "test-project" }),
    });
    expect(tw(metadata)?.card).toBe("summary_large_image");
  });

  it("returns twitter title and description", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN", slug: "test-project" }),
    });
    expect(metadata.twitter?.title).toBe("Test Project");
    expect(metadata.twitter?.description).toBe("A test project description");
  });

  it("returns empty metadata when project not found", async () => {
    const { getProjectBySlug } = await import("@/lib/projects");
    vi.mocked(getProjectBySlug).mockResolvedValueOnce(null);
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN", slug: "nonexistent" }),
    });
    expect(metadata).toEqual({});
  });

  it("uses en-US locale in openGraph when locale is en-US", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "en-US", slug: "test-project" }),
    });
    expect(metadata.openGraph?.locale).toBe("en_US");
  });
});
