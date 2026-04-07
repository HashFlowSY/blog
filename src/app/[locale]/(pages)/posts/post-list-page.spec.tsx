vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("@/lib/posts", () => ({
  getAllPostsMeta: () => [
    {
      slug: "post-1",
      title: "Post 1",
      date: "2026-01-01",
      updated: "2026-01-01",
      tags: ["react"],
      summary: "First post",
      cover: null,
    },
  ],
  getAllTags: () => ["react"],
}));

vi.mock("@/lib/site", () => ({
  siteUrl: (path: string) => `https://example.com${path}`,
}));

vi.mock("./post-list-client", () => ({
  PostListClient: () =>
    import("react").then((mod) =>
      mod.createElement("div", {
        "data-testid": "post-list-client",
      }),
    ),
}));

import { describe, it, expect, vi } from "vitest";

import { og, tw } from "@/test-utils/metadata";

import { generateMetadata } from "./page";

describe("PostsPage generateMetadata", () => {
  it("returns translated title", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    expect(metadata.title).toBe("title");
  });

  it("returns translated description", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    expect(metadata.description).toBe("allPosts");
  });

  it("returns openGraph with title and description", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    expect(metadata.openGraph?.title).toBe("title");
    expect(metadata.openGraph?.description).toBe("allPosts");
  });

  it("returns openGraph type as website", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    expect(og(metadata)?.type).toBe("website");
  });

  it("returns openGraph url", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    expect(metadata.openGraph?.url).toBe("https://example.com/zh-CN/posts/");
  });

  it("returns openGraph locale", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    expect(metadata.openGraph?.locale).toBe("zh_CN");
  });

  it("returns twitter card as summary_large_image", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    expect(tw(metadata)?.card).toBe("summary_large_image");
  });

  it("returns twitter title and description", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    expect(metadata.twitter?.title).toBe("title");
    expect(metadata.twitter?.description).toBe("allPosts");
  });

  it("uses en-US locale in openGraph when locale is en-US", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "en-US" }),
    });
    expect(metadata.openGraph?.locale).toBe("en_US");
  });
});
