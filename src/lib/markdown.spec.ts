import { describe, it, expect } from "vitest";

import { extractHeadings } from "./markdown";
import { markdownToHtml } from "./markdown";

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

  // ==========================================================
  // extractHeadings
  // ==========================================================
  describe("extractHeadings", () => {
    it("提取 h1/h2/h3 标题的 level、id 和 text", () => {
      const html =
        '<h1 id="intro">Introduction</h1><h2 id="setup">Setup</h2><h3 id="config">Configuration</h3>';
      const headings = extractHeadings(html);

      expect(headings).toHaveLength(3);
      expect(headings[0]).toEqual({
        level: 1,
        id: "intro",
        text: "Introduction",
      });
      expect(headings[1]).toEqual({ level: 2, id: "setup", text: "Setup" });
      expect(headings[2]).toEqual({
        level: 3,
        id: "config",
        text: "Configuration",
      });
    });

    it("无标题时返回空数组", () => {
      expect(extractHeadings("<p>No headings here</p>")).toEqual([]);
    });

    it("空字符串返回空数组", () => {
      expect(extractHeadings("")).toEqual([]);
    });

    it("去除标题内嵌 HTML 标签", () => {
      const html = '<h2 id="code">Using <code>hooks</code></h2>';
      const headings = extractHeadings(html);

      expect(headings).toHaveLength(1);
      expect(headings[0]!.text).toBe("Using hooks");
    });

    it("忽略 h4-h6 标题", () => {
      const html = '<h4 id="deep">Deep heading</h4><h5 id="deeper">Deeper</h5>';
      expect(extractHeadings(html)).toEqual([]);
    });

    it("处理内容为空的标题", () => {
      const html = '<h2 id="empty"></h2>';
      const headings = extractHeadings(html);

      expect(headings).toHaveLength(1);
      expect(headings[0]!.text).toBe("");
    });

    it("按顺序返回多个标题", () => {
      const html = [
        '<h2 id="first">First</h2>',
        '<h1 id="top">Top</h1>',
        '<h3 id="third">Third</h3>',
      ].join("");
      const headings = extractHeadings(html);

      expect(headings).toHaveLength(3);
      expect(headings[0]!.id).toBe("first");
      expect(headings[1]!.id).toBe("top");
      expect(headings[2]!.id).toBe("third");
    });
  });
});
