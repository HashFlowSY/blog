vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
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
  getAllPostsMeta: (_locale: string) => [
    {
      slug: "post-1",
      title: "Post 1",
      date: "2026-01-01",
      updated: "2026-01-01",
      tags: ["react"],
      summary: "First post",
      cover: null,
      readingTime: 0,
      locale: "zh-CN",
    },
  ],
}));

vi.mock("@/lib/projects", () => ({
  getFeaturedProjects: (_locale: string) => [
    {
      slug: "project-1",
      title: "Project 1",
      description: "A featured project",
      date: "2026-01-01",
      tags: ["rust"],
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

vi.mock("@/components/post/post-list", () => ({
  PostList: ({ posts }: { posts: unknown[] }) =>
    createElement(
      "div",
      { "data-testid": "post-list" },
      `Posts: ${posts.length}`,
    ),
}));

vi.mock("@/components/project/project-list", () => ({
  ProjectList: ({ projects }: { projects: unknown[] }) =>
    createElement(
      "div",
      { "data-testid": "project-list" },
      `Projects: ${projects.length}`,
    ),
}));

import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, it, expect, vi } from "vitest";

import { og } from "@/test-utils/metadata";

import HomePage, { generateMetadata } from "./page";

describe("HomePage", () => {
  it("renders hero greeting", async () => {
    await HomePage({ params: Promise.resolve({ locale: "zh-CN" }) });
    await renderHome();
    expect(document.body.textContent).toContain("greeting");
  });

  it("renders recent posts section", async () => {
    await renderHome();
    expect(screen.getByTestId("post-list")).toBeInTheDocument();
  });

  it("renders featured projects section", async () => {
    await renderHome();
    expect(screen.getByTestId("project-list")).toBeInTheDocument();
  });
});

describe("HomePage - A11y (L1: Section aria-labelledby)", () => {
  it("hero section has aria-labelledby='hero-heading'", async () => {
    const html = await renderHome();
    const heroSection = html.querySelector(
      'section[aria-labelledby="hero-heading"]',
    );
    expect(heroSection).toBeInTheDocument();
  });

  it("hero h1 has id='hero-heading'", async () => {
    const html = await renderHome();
    const heroHeading = html.querySelector('h1[id="hero-heading"]');
    expect(heroHeading).toBeInTheDocument();
  });

  it("recent posts section has aria-labelledby='recent-posts-heading'", async () => {
    const html = await renderHome();
    const section = html.querySelector(
      'section[aria-labelledby="recent-posts-heading"]',
    );
    expect(section).toBeInTheDocument();
  });

  it("recent posts h2 has id='recent-posts-heading'", async () => {
    const html = await renderHome();
    const heading = html.querySelector('h2[id="recent-posts-heading"]');
    expect(heading).toBeInTheDocument();
  });

  it("featured projects section has aria-labelledby='featured-projects-heading'", async () => {
    const html = await renderHome();
    const section = html.querySelector(
      'section[aria-labelledby="featured-projects-heading"]',
    );
    expect(section).toBeInTheDocument();
  });

  it("featured projects h2 has id='featured-projects-heading'", async () => {
    const html = await renderHome();
    const heading = html.querySelector('h2[id="featured-projects-heading"]');
    expect(heading).toBeInTheDocument();
  });
});

describe("HomePage generateMetadata", () => {
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
    expect(metadata.description).toBe("description");
  });

  it("returns openGraph with title and description", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    expect(metadata.openGraph?.title).toBe("title");
    expect(metadata.openGraph?.description).toBe("description");
  });

  it("returns openGraph type as website", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "zh-CN" }),
    });
    expect(og(metadata)?.type).toBe("website");
  });
});

describe("HomePage JSON-LD", () => {
  it("renders WebSite schema in script tag", async () => {
    await HomePage({ params: Promise.resolve({ locale: "zh-CN" }) });
    const html = await renderHome();
    const script = html.querySelector('script[type="application/ld+json"]');
    expect(script).toBeInTheDocument();
  });

  it("JSON-LD contains @type WebSite", async () => {
    await HomePage({ params: Promise.resolve({ locale: "zh-CN" }) });
    const html = await renderHome();
    const script = html.querySelector<HTMLScriptElement>(
      'script[type="application/ld+json"]',
    );
    expect(script).toBeTruthy();
    const jsonLd = JSON.parse(script!.textContent!);
    expect(jsonLd["@type"]).toBe("WebSite");
  });

  it("JSON-LD contains name from translation", async () => {
    await HomePage({ params: Promise.resolve({ locale: "zh-CN" }) });
    const html = await renderHome();
    const script = html.querySelector<HTMLScriptElement>(
      'script[type="application/ld+json"]',
    );
    expect(script).toBeTruthy();
    const jsonLd = JSON.parse(script!.textContent!);
    expect(jsonLd.name).toBe("siteName");
  });

  it("JSON-LD contains url pointing to siteUrl", async () => {
    await HomePage({ params: Promise.resolve({ locale: "zh-CN" }) });
    const html = await renderHome();
    const script = html.querySelector<HTMLScriptElement>(
      'script[type="application/ld+json"]',
    );
    expect(script).toBeTruthy();
    const jsonLd = JSON.parse(script!.textContent!);
    expect(jsonLd.url).toBe("https://example.com/");
  });
});

/**
 * Helper to render a server component and return the container.
 */
async function renderHome(): Promise<HTMLElement> {
  const element = await HomePage({
    params: Promise.resolve({ locale: "zh-CN" }),
  });
  const { container } = render(createElement("div", null, element));
  return container;
}
