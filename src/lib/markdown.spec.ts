import { describe, it, expect } from "vitest";

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
      expect(result).toMatch(
        /class="[^"]*language-typescript[^"]*"/,
      );
    });

    it("无语言标识的代码块也能正常渲染", async () => {
      const result = await markdownToHtml("```\nconst x = 1;\n```");
      expect(result).toContain("<pre>");
      expect(result).toContain("const x = 1;");
    });
  });

  describe("XSS 过滤", () => {
    it("过滤 <script> 标签", async () => {
      const result = await markdownToHtml(
        '<script>alert("xss")</script>',
      );
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
      const result = await markdownToHtml(
        '<img src="x" onerror="alert(1)">',
      );
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
  });
});
