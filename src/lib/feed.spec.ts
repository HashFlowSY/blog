import { describe, expect, it } from "vitest";

import { buildRssXml, escapeXml } from "./feed";

describe("escapeXml", () => {
  it("escapes all special characters together", () => {
    expect(escapeXml('<a href="?x=1&y=2">it\'s</a>')).toBe(
      "&lt;a href=&quot;?x=1&amp;y=2&quot;&gt;it&apos;s&lt;/a&gt;",
    );
  });

  it("returns unchanged string when no special characters", () => {
    expect(escapeXml("hello world")).toBe("hello world");
  });
});

describe("buildRssXml", () => {
  const baseConfig = {
    title: "Test Blog",
    link: "https://example.com",
    description: "A test blog feed",
    language: "zh-CN",
    items: [] as Array<{
      title: string;
      link: string;
      description: string;
      pubDate: string;
      categories: string[];
    }>,
  };

  it("generates valid XML declaration and RSS 2.0 envelope", () => {
    const xml = buildRssXml(baseConfig);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain("<channel>");
    expect(xml).toContain("</channel>");
    expect(xml).toContain("</rss>");
  });

  it("includes channel metadata", () => {
    const xml = buildRssXml(baseConfig);
    expect(xml).toContain("<title>Test Blog</title>");
    expect(xml).toContain("<link>https://example.com</link>");
    expect(xml).toContain("<description>A test blog feed</description>");
    expect(xml).toContain("<language>zh-CN</language>");
  });

  it("creates item elements for each post", () => {
    const xml = buildRssXml({
      ...baseConfig,
      items: [
        {
          title: "First Post",
          link: "https://example.com/posts/first/",
          description: "First post summary",
          pubDate: "2026-04-01",
          categories: ["typescript"],
        },
        {
          title: "Second Post",
          link: "https://example.com/posts/second/",
          description: "Second post summary",
          pubDate: "2026-04-02",
          categories: ["react"],
        },
      ],
    });
    expect(xml).toContain("<item>");
    expect(xml).toContain("<title>First Post</title>");
    expect(xml).toContain("<link>https://example.com/posts/first/</link>");
    expect(xml).toContain("<description>First post summary</description>");
    expect(xml).toContain("<title>Second Post</title>");
    expect(xml).toContain("<link>https://example.com/posts/second/</link>");
  });

  it("produces valid channel with no items when empty", () => {
    const xml = buildRssXml(baseConfig);
    expect(xml).toContain("<channel>");
    expect(xml).toContain("</channel>");
    expect(xml).not.toContain("<item>");
  });

  it("escapes XML special characters in title and description", () => {
    const xml = buildRssXml({
      ...baseConfig,
      items: [
        {
          title: "Using <script> & 'quotes'",
          link: "https://example.com/posts/p/",
          description: 'A & B > C "test"',
          pubDate: "2026-04-01",
          categories: [],
        },
      ],
    });
    expect(xml).toContain("&lt;script&gt;");
    expect(xml).toContain("&amp;");
    expect(xml).toContain("&apos;");
    expect(xml).toContain("&quot;");
  });

  it("omits category elements when post has no tags", () => {
    const xml = buildRssXml({
      ...baseConfig,
      items: [
        {
          title: "Post",
          link: "https://example.com/posts/p/",
          description: "Summary",
          pubDate: "2026-04-01",
          categories: [],
        },
      ],
    });
    expect(xml).not.toContain("<category>");
  });

  it("creates multiple category elements for multiple tags", () => {
    const xml = buildRssXml({
      ...baseConfig,
      items: [
        {
          title: "Post",
          link: "https://example.com/posts/p/",
          description: "Summary",
          pubDate: "2026-04-01",
          categories: ["typescript", "react", "nextjs"],
        },
      ],
    });
    expect(xml).toContain("<category>typescript</category>");
    expect(xml).toContain("<category>react</category>");
    expect(xml).toContain("<category>nextjs</category>");
  });

  it("single post produces exactly one item", () => {
    const xml = buildRssXml({
      ...baseConfig,
      items: [
        {
          title: "Only Post",
          link: "https://example.com/posts/only/",
          description: "Only",
          pubDate: "2026-04-01",
          categories: ["test"],
        },
      ],
    });
    const itemMatches = xml.match(/<item>/g);
    expect(itemMatches).toHaveLength(1);
  });
});
