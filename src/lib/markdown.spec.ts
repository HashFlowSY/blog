import { describe, expect, it } from "vitest";

import { renderMarkdown } from "./markdown";

async function renderHtml(markdown: string): Promise<string> {
  return (await renderMarkdown(markdown)).html;
}

describe("renderMarkdown", () => {
  it("returns final HTML and its table-of-contents headings together", async () => {
    const rendered = await renderMarkdown("## Setup\n\n### Confirm");
    const document = new DOMParser().parseFromString(
      rendered.html,
      "text/html",
    );
    const htmlHeadings = Array.from(
      document.querySelectorAll<HTMLHeadingElement>("h1, h2, h3"),
    ).map((heading) => ({
      id: heading.id,
      level: Number(heading.tagName.slice(1)),
      text: heading.textContent ?? "",
    }));

    expect(rendered.html).toContain("<h2");
    expect(rendered.headings).toEqual([
      { id: expect.any(String), level: 2, text: "Setup" },
      { id: expect.any(String), level: 3, text: "Confirm" },
    ]);
    expect(rendered.headings).toEqual(htmlHeadings);
  });

  it("removes a leading body h1 that semantically matches the frontmatter title", async () => {
    const rendered = await renderMarkdown(
      "# **Café** [guide](https://example.com)\n\n## Setup",
      { title: "Café guide" },
    );

    expect(rendered.html).not.toContain("<h1");
    expect(rendered.headings).toEqual([
      { id: expect.any(String), level: 2, text: "Setup" },
    ]);
  });

  it("collects readable heading text from inline formatting and decoded entities", async () => {
    const rendered = await renderMarkdown(
      "## **粗体** *斜体* [链接](https://example.com) `code` &amp; 中英文 Mixed",
    );

    expect(rendered.headings).toEqual([
      {
        id: expect.any(String),
        level: 2,
        text: "粗体 斜体 链接 code & 中英文 Mixed",
      },
    ]);
    expect(rendered.html).toContain("<strong>粗体</strong>");
    expect(rendered.html).toContain("<em>斜体</em>");
    expect(rendered.html).toContain('<a href="https://example.com">链接</a>');
    expect(rendered.html).toContain("<code>code</code>");
  });

  it("gives duplicate headings stable distinct IDs that match final HTML", async () => {
    const markdown = "## Repeat\n\n## Repeat";
    const first = await renderMarkdown(markdown);
    const second = await renderMarkdown(markdown);
    const document = new DOMParser().parseFromString(first.html, "text/html");

    expect(first.headings).toHaveLength(2);
    expect(first.headings[0]?.id).not.toBe(first.headings[1]?.id);
    expect(second.headings).toEqual(first.headings);
    expect(
      Array.from(document.querySelectorAll<HTMLHeadingElement>("h2")).map(
        (heading) => heading.id,
      ),
    ).toEqual(first.headings.map((heading) => heading.id));
  });

  it("removes a formatted, linked, inline-code, entity-bearing leading h1", async () => {
    const rendered = await renderMarkdown(
      "# **C++** &amp; [`Code`](https://example.com)\n\n## Setup",
      { title: "C++ & Code" },
    );

    expect(rendered.html).not.toContain("<h1");
    expect(rendered.headings).toEqual([
      { id: expect.any(String), level: 2, text: "Setup" },
    ]);
  });

  it("keeps a different leading h1 and lets it enter the headings", async () => {
    const rendered = await renderMarkdown("# Different title", {
      title: "Frontmatter title",
    });

    expect(rendered.html).toContain("<h1");
    expect(rendered.headings).toEqual([
      { id: expect.any(String), level: 1, text: "Different title" },
    ]);
  });

  it("does not let a removed h1 affect a following duplicate heading ID", async () => {
    const withRemovedTitle = await renderMarkdown("# Repeat\n\n## Repeat", {
      title: "Repeat",
    });
    const onlyVisibleHeading = await renderMarkdown("## Repeat");

    expect(withRemovedTitle.headings).toEqual([
      { id: onlyVisibleHeading.headings[0]?.id, level: 2, text: "Repeat" },
    ]);
    expect(withRemovedTitle.html).not.toContain("<h1");
  });

  it("renders h4 through h6 without including them in the article table of contents", async () => {
    const rendered = await renderMarkdown(
      "### Included\n\n#### Four\n\n##### Five\n\n###### Six",
    );

    expect(rendered.headings).toEqual([
      { id: expect.any(String), level: 3, text: "Included" },
    ]);
    expect(rendered.html).toContain("<h4");
    expect(rendered.html).toContain("<h5");
    expect(rendered.html).toContain("<h6");
  });

  it("renders CommonMark paragraphs, lists, links, images, and code", async () => {
    const html = await renderHtml(
      [
        "Hello world",
        "",
        "[example](https://example.com)",
        "",
        '![示例图片](https://example.com/image.png "图片标题")',
        "",
        "**bold** and *italic* with `console.log()`",
        "",
        "- item 1",
        "- item 2",
        "",
        "1. first",
        "2. second",
      ].join("\n"),
    );

    expect(html).toContain("<p>Hello world</p>");
    expect(html).toContain('<a href="https://example.com">example</a>');
    expect(html).toContain('src="https://example.com/image.png"');
    expect(html).toContain('alt="示例图片"');
    expect(html).toContain('title="图片标题"');
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<code>console.log()</code>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<ol>");
  });

  it("renders GitHub Flavored Markdown tables, strikethrough, and autolinks", async () => {
    const html = await renderHtml(
      [
        "| 术语 | 说明 |",
        "| --- | --- |",
        "| Free | 免费版 |",
        "",
        "保留 ~~删除~~ 文本",
        "",
        "访问 https://example.com/docs 获取信息",
      ].join("\n"),
    );

    expect(html).toContain("<table>");
    expect(html).toContain("<th>术语</th>");
    expect(html).toContain("<td>免费版</td>");
    expect(html).toContain("<del>删除</del>");
    expect(html).toContain('<a href="https://example.com/docs">');
  });

  it("renders task lists and footnotes using the supported safe attributes", async () => {
    const html = await renderHtml(
      "- [x] 已完成\n- [ ] 待处理\n\n带脚注的文本[^note]\n\n[^note]: 脚注内容",
    );
    const document = new DOMParser().parseFromString(html, "text/html");
    const inputs = document.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"]',
    );

    expect(document.querySelector("ul.contains-task-list")).not.toBeNull();
    expect(document.querySelectorAll("li.task-list-item")).toHaveLength(2);
    expect(inputs).toHaveLength(2);
    expect(inputs[0]?.disabled).toBe(true);
    expect(inputs[0]?.checked).toBe(true);
    expect(inputs[1]?.checked).toBe(false);
    expect(html).toContain("data-footnotes");
    expect(html).toContain("data-footnote-backref");
    expect(html).toContain("脚注内容");
  });

  it("renders highlighted code blocks and preserves supported line metadata", async () => {
    const html = await renderHtml("```ts {2}\nconst a = 1;\nconst b = 2;\n```");
    const document = new DOMParser().parseFromString(html, "text/html");

    expect(html).toMatch(/class="[^"]*language-ts[^"]*"/);
    expect(html).toContain('data-meta="{2}"');
    expect(document.querySelector('[data-line="1"]')).not.toBeNull();
    expect(
      document
        .querySelector('[data-line="2"]')
        ?.getAttribute("data-highlighted"),
    ).toBe("true");
  });

  it("removes unsafe raw HTML, event handlers, javascript URLs, and invalid images", async () => {
    const html = await renderHtml(
      [
        '<script>alert("xss")</script>',
        '<div onclick="alert(1)">click</div>',
        "[click](javascript:alert(1))",
        "![bad](javascript:alert(1))",
        '<iframe src="https://evil.com"></iframe>',
        '<img src="x" onerror="alert(1)">',
      ].join("\n\n"),
    );

    expect(html).not.toContain("<script>");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("<img");
  });

  it("returns immutable structured output for empty and Unicode Markdown", async () => {
    const empty = await renderMarkdown("\n\n");
    const unicode = await renderMarkdown("# 你好世界");

    expect(empty.html).toBe("");
    expect(empty.headings).toEqual([]);
    expect(unicode.html).toContain("你好世界");
    expect(Object.isFrozen(unicode)).toBe(true);
    expect(Object.isFrozen(unicode.headings)).toBe(true);
    expect(Object.isFrozen(unicode.headings[0])).toBe(true);
  });

  it("accepts a filename option without changing valid output", async () => {
    const rendered = await renderMarkdown("# Valid Markdown", {
      filename: "test.md",
    });

    expect(rendered.html).toContain("Valid Markdown");
  });
});
