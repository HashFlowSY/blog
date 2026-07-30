import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Post } from "@/lib/content-catalog";

const { mockGetContentCatalog } = vi.hoisted(() => ({
  mockGetContentCatalog: vi.fn(),
}));

vi.mock("@/lib/content-catalog", () => ({
  getContentCatalog: mockGetContentCatalog,
}));

vi.mock("@/lib/markdown", () => ({}));

vi.mock("@/lib/site", () => ({
  SITE: {
    githubProfile: {
      label: "HashFlowSY",
      url: "https://github.com/HashFlowSY",
    },
  },
  siteUrl: (pathname: string) => new URL(pathname, "https://example.com"),
}));

import PostDetailPage from "./page";

const post: Post = {
  slug: "structured-post",
  title: "Structured Post",
  date: "2026-04-02",
  updated: "2026-04-02",
  tags: ["Testing"],
  summary: "A Post rendered by the Content Catalog.",
  readingTime: 4,
  renderedContent: {
    html: '<h2 id="first-section">First section</h2><h3 id="second-section">Second section</h3>',
    headings: [
      { id: "first-section", level: 2, text: "First section" },
      { id: "second-section", level: 3, text: "Second section" },
    ],
  },
};

describe("PostDetailPage", () => {
  beforeEach(() => {
    mockGetContentCatalog.mockResolvedValue({
      getPostBySlug: (slug: string) => (slug === post.slug ? post : null),
      posts: [post],
    });
  });

  it("uses the Catalog result without recovering headings from serialized HTML", async () => {
    const page = await PostDetailPage({
      params: Promise.resolve({ slug: post.slug }),
    });
    const { getByRole } = render(page);

    expect(getByRole("link", { name: "01 First section" })).toHaveAttribute(
      "href",
      "#first-section",
    );
    expect(getByRole("link", { name: "02 Second section" })).toHaveAttribute(
      "href",
      "#second-section",
    );
  });
});
