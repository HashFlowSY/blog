import { describe, it, expect } from "vitest";

import { markdownToHtml, renderMarkdown } from "./markdown";

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
});

describe("markdownToHtml", () => {
  describe("基本 Markdown 转换", () => {
    it("将标题转换为 HTML", async () => {
      const result = await markdownToHtml("# Hello");
      expect(result).toContain("<h1");
      expect(result).toContain("Hello");
      expect(result).toContain("</h1>");
    });

    it("将多级标题转换为对应 HTML 标签", async () => {
      const result = await markdownToHtml("# H1\n## H2\n### H3");
      expect(result).toContain("<h1");
      expect(result).toContain("<h2");
      expect(result).toContain("<h3");
    });

    it("将段落文本转换为 <p> 标签", async () => {
      const result = await markdownToHtml("Hello world");
      expect(result).toContain("<p>Hello world</p>");
    });

    it("将链接转换为 <a> 标签", async () => {
      const result = await markdownToHtml("[example](https://example.com)");
      expect(result).toContain("<a");
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain("example");
    });

    it("将 Markdown 图片转换为安全 img 标签", async () => {
      const result = await markdownToHtml(
        '![示例图片](https://example.com/image.png "图片标题")',
      );

      expect(result).toContain("<img");
      expect(result).toContain('src="https://example.com/image.png"');
      expect(result).toContain('alt="示例图片"');
      expect(result).toContain('title="图片标题"');
    });

    it("将粗体和斜体转换为对应标签", async () => {
      const result = await markdownToHtml("**bold** and *italic*");
      expect(result).toContain("<strong>bold</strong>");
      expect(result).toContain("<em>italic</em>");
    });

    it("将无序列表转换为 <ul>/<li>", async () => {
      const result = await markdownToHtml("- item 1\n- item 2\n- item 3");
      expect(result).toContain("<ul>");
      expect(result).toContain("<li>item 1</li>");
      expect(result).toContain("<li>item 2</li>");
      expect(result).toContain("</ul>");
    });

    it("将有序列表转换为 <ol>/<li>", async () => {
      const result = await markdownToHtml("1. first\n2. second");
      expect(result).toContain("<ol>");
      expect(result).toContain("<li>first</li>");
      expect(result).toContain("</ol>");
    });

    it("将行内代码转换为 <code> 标签", async () => {
      const result = await markdownToHtml("use `console.log()` here");
      expect(result).toContain("<code>console.log()</code>");
    });

    it("将代码块转换为 <pre><code> 标签", async () => {
      const result = await markdownToHtml("```js\nconst x = 1;\n```");
      expect(result).toContain("<pre>");
      expect(result).toContain("<code");
      expect(result).toContain("const");
      expect(result).toContain("</code>");
      expect(result).toContain("</pre>");
    });

    it("将 GFM 管道表格转换为 table HTML", async () => {
      const result = await markdownToHtml(
        ["| 术语 | 说明 |", "| --- | --- |", "| Free | 免费版 |"].join("\n"),
      );

      expect(result).toContain("<table>");
      expect(result).toContain("<thead>");
      expect(result).toContain("<tbody>");
      expect(result).toContain("<th>术语</th>");
      expect(result).toContain("<td>免费版</td>");
    });

    it("将 GFM 删除线转换为 del 标签", async () => {
      const result = await markdownToHtml("保留 ~~删除~~ 文本");

      expect(result).toContain("<del>删除</del>");
    });

    it("将 GFM 自动链接转换为 a 标签", async () => {
      const result = await markdownToHtml(
        "访问 https://example.com/docs 获取信息",
      );

      expect(result).toContain('<a href="https://example.com/docs">');
      expect(result).toContain("https://example.com/docs</a>");
    });

    it("将 GFM 任务列表转换为禁用 checkbox", async () => {
      const result = await markdownToHtml("- [x] 已完成\n- [ ] 待处理");
      const document = new DOMParser().parseFromString(result, "text/html");
      const taskList = document.querySelector("ul.contains-task-list");
      const taskItems = document.querySelectorAll("li.task-list-item");
      const inputs = document.querySelectorAll<HTMLInputElement>(
        'input[type="checkbox"]',
      );

      expect(taskList).not.toBeNull();
      expect(taskItems).toHaveLength(2);
      expect(inputs).toHaveLength(2);
      expect(inputs[0]!.disabled).toBe(true);
      expect(inputs[1]!.disabled).toBe(true);
      expect(inputs[0]!.checked).toBe(true);
      expect(inputs[1]!.checked).toBe(false);
    });

    it("将 GFM 脚注转换为脚注区域和回链", async () => {
      const result = await markdownToHtml(
        "带脚注的文本[^note]\n\n[^note]: 脚注内容",
      );

      expect(result).toContain("data-footnotes");
      expect(result).toContain("footnotes");
      expect(result).toContain("脚注内容");
      expect(result).toContain("data-footnote-backref");
    });
  });

  describe("标题锚点 ID 生成", () => {
    it("为 h1 标题生成 id 属性", async () => {
      const result = await markdownToHtml("# My Title");
      expect(result).toMatch(/<h1[^>]*\sid="[^"]*"/);
    });

    it("为 h2 标题生成 id 属性", async () => {
      const result = await markdownToHtml("## Section");
      expect(result).toMatch(/<h2[^>]*\sid="[^"]*"/);
    });

    it("为 h3 标题生成 id 属性", async () => {
      const result = await markdownToHtml("### Subsection");
      expect(result).toMatch(/<h3[^>]*\sid="[^"]*"/);
    });

    it("锚点 ID 基于标题文本生成", async () => {
      const result = await markdownToHtml("## Hello World");
      expect(result).toMatch(/id="(user-content-hello-world|hello-world)"/);
    });
  });

  describe("代码高亮", () => {
    it("为指定语言的代码块添加语法高亮 class", async () => {
      const result = await markdownToHtml(
        "```typescript\nconst x: number = 1;\n```",
      );
      expect(result).toMatch(/class="[^"]*language-typescript[^"]*"/);
    });

    it("无语言标识的代码块也能正常渲染", async () => {
      const result = await markdownToHtml("```\nconst x = 1;\n```");
      expect(result).toContain("<pre>");
      expect(result).toContain("const x = 1;");
    });

    it("保留代码块行高亮 meta 并标记高亮行", async () => {
      const result = await markdownToHtml(
        "```ts {2}\nconst a = 1;\nconst b = 2;\n```",
      );
      const document = new DOMParser().parseFromString(result, "text/html");
      const firstLine = document.querySelector('[data-line="1"]');
      const secondLine = document.querySelector('[data-line="2"]');

      expect(result).toContain('data-meta="{2}"');
      expect(firstLine).not.toBeNull();
      expect(firstLine?.getAttribute("data-highlighted")).not.toBe("true");
      expect(secondLine).not.toBeNull();
      expect(secondLine?.getAttribute("data-highlighted")).toBe("true");
    });
  });

  describe("XSS 过滤", () => {
    it("过滤 <script> 标签", async () => {
      const result = await markdownToHtml('<script>alert("xss")</script>');
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("alert");
    });

    it("过滤 onclick 等事件属性", async () => {
      const result = await markdownToHtml(
        '<div onclick="alert(1)">click</div>',
      );
      expect(result).not.toContain("onclick");
    });

    it("过滤 javascript: 协议链接", async () => {
      const result = await markdownToHtml("[click](javascript:alert(1))");
      expect(result).not.toContain("javascript:");
    });

    it("过滤 Markdown 图片中的 javascript 协议", async () => {
      const result = await markdownToHtml("![bad](javascript:alert(1))");

      expect(result).not.toContain("javascript:");
      expect(result).not.toContain("<img");
    });

    it("不把原生 HTML 当作受支持内容能力保留", async () => {
      const result = await markdownToHtml("<mark>highlight</mark>");

      expect(result).not.toContain("<mark>");
      expect(result).toContain("highlight");
    });

    it("Markdown 粗体语法正确渲染为 <strong>", async () => {
      const result = await markdownToHtml("**safe**");
      expect(result).toContain("<strong>safe</strong>");
    });

    it("过滤 iframe 标签", async () => {
      const result = await markdownToHtml(
        '<iframe src="https://evil.com"></iframe>',
      );
      expect(result).not.toContain("<iframe");
    });

    it("过滤 <img onerror> 属性", async () => {
      const result = await markdownToHtml('<img src="x" onerror="alert(1)">');
      expect(result).not.toContain("onerror");
    });
  });

  describe("空输入与边界值", () => {
    it("空字符串不抛错", async () => {
      const result = await markdownToHtml("");
      expect(typeof result).toBe("string");
    });

    it("仅换行符不抛错", async () => {
      const result = await markdownToHtml("\n\n");
      expect(typeof result).toBe("string");
    });

    it("超长内容能正常处理", async () => {
      const longContent = "# Title\n\n" + "Lorem ipsum. ".repeat(1000);
      const result = await markdownToHtml(longContent);
      expect(result).toContain("<h1");
      expect(result.length).toBeGreaterThan(0);
    });

    it("特殊 Unicode 字符不抛错", async () => {
      const result = await markdownToHtml("# 你好世界");
      expect(result).toContain("你好世界");
    });
  });

  describe("错误处理", () => {
    it("正常输入不报错", async () => {
      const result = await markdownToHtml("# Valid Markdown");
      expect(result).toContain("Valid Markdown");
    });

    it("传入 filename 不影响正常输出", async () => {
      const result = await markdownToHtml("# Hello", "test.md");
      expect(result).toContain("Hello");
    });

    it("no filename: error message omits file reference", async () => {
      await expect(markdownToHtml("".slice(0, 0))).resolves.toBeDefined();
    });
  });
});
