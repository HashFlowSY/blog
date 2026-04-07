import { describe, expect, it } from "vitest";

import { buildRssXml, escapeXml, toRfc822 } from "./feed";

describe("escapeXml", () => {
  it("escapes ampersand", () => {
    expect(escapeXml("a & b")).toBe("a &amp; b");
  });

  it("escapes less-than and greater-than", () => {
    expect(escapeXml("a < b > c")).toBe("a &lt; b &gt; c");
  });

  it("escapes double quotes", () => {
    expect(escapeXml('say "hello"')).toBe("say &quot;hello&quot;");
  });

  it("escapes single quotes", () => {
    expect(escapeXml("it's")).toBe("it&apos;s");
  });

  it("escapes all special characters together", () => {
    expect(escapeXml('<a href="?x=1&y=2">it\'s</a>')).toBe(
      "&lt;a href=&quot;?x=1&amp;y=2&quot;&gt;it&apos;s&lt;/a&gt;",
    );
  });

  it("returns unchanged string when no special characters", () => {
    expect(escapeXml("hello world")).toBe("hello world");
  });
});

describe("toRfc822", () => {
  it("converts ISO date to RFC 822 format", () => {
    expect(toRfc822("2026-04-02")).toMatch(/02 Apr 2026/);
  });

  it("includes day of week", () => {
    expect(toRfc822("2026-04-02")).toMatch(/^[A-Za-z]{3},/);
  });

  it("handles end of year date", () => {
    expect(toRfc822("2026-12-31")).toMatch(/31 Dec 2026/);
  });

  it("handles start of year date", () => {
    expect(toRfc822("2026-01-01")).toMatch(/01 Jan 2026/);
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

  it("includes RFC 822 formatted dates in pubDate", () => {
    const xml = buildRssXml({
      ...baseConfig,
      items: [
        {
          title: "Post",
          link: "https://example.com/posts/p/",
          description: "Summary",
          pubDate: "2026-04-02",
          categories: [],
        },
      ],
    });
    expect(xml).toContain("<pubDate>");
    expect(xml).toMatch(/02 Apr 2026/);
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

  it("sets lastBuildDate to most recent item's pubDate", () => {
    const xml = buildRssXml({
      ...baseConfig,
      items: [
        {
          title: "Old Post",
          link: "https://example.com/posts/old/",
          description: "Old",
          pubDate: "2026-01-01",
          categories: [],
        },
        {
          title: "New Post",
          link: "https://example.com/posts/new/",
          description: "New",
          pubDate: "2026-04-15",
          categories: [],
        },
      ],
    });
    expect(xml).toContain("<lastBuildDate>");
    expect(xml).toMatch(/15 Apr 2026/);
  });

  it("uses current date when items array is empty", () => {
    const xml = buildRssXml(baseConfig);
    expect(xml).toContain("<lastBuildDate>");
    // lastBuildDate is formatted as "02 Apr 2026" (RFC 822)
    expect(xml).toMatch(/Apr 2026/);
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

  it("uses first item as latest when dates are descending", () => {
    const xml = buildRssXml({
      ...baseConfig,
      items: [
        {
          title: "Newest Post",
          link: "https://example.com/posts/new/",
          description: "New",
          pubDate: "2026-06-01",
          categories: [],
        },
        {
          title: "Older Post",
          link: "https://example.com/posts/old/",
          description: "Old",
          pubDate: "2026-01-01",
          categories: [],
        },
      ],
    });
    expect(xml).toContain("<lastBuildDate>");
    expect(xml).toMatch(/01 Jun 2026/);
  });
});
