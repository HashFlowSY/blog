// @vitest-environment node

import { visit } from "unist-util-visit";
import { expect, it } from "vitest";

import { compileMarkdownDocuments } from "./compile";

import type { Element, Root } from "hast";

const filePath = "content/posts/zh-CN/sample.md";

async function compile(
  body: string,
  basePath = "/blog",
  title = "示例 guide & API",
) {
  const documents = await compileMarkdownDocuments(
    [{ filePath, bodyLine: 8, title, body }],
    { basePath },
  );
  const result = documents.get(filePath);
  if (!result) throw new Error("Missing compiled sample.");
  return result;
}

function elements(tree: Root | Element, tagName?: string) {
  const found: Element[] = [];
  visit(tree, "element", (node) => {
    if (tagName === undefined || node.tagName === tagName) found.push(node);
  });
  return found;
}

it("uses one immutable document for headings, links, search and reading stats", async () => {
  const result = await compile(
    [
      "# **示例** [guide](/posts/other/) &amp; `API`",
      "",
      "## 示例",
      "",
      "使用 **Shiki** 阅读[说明](/posts/example/?topic=API#public)，查看 `codeToHast`。[^tip]",
      "",
      "```ts",
      "const snippet = '<script>literal</script>';",
      "```",
      "",
      "[^tip]: 保留空行。",
      "",
      "<script>unsafeMarker()</script>",
    ].join("\n"),
  );

  expect(result.outline).toEqual([
    { id: "user-content-示例", text: "示例", level: 2 },
  ]);
  expect(result.readingStats).toEqual({
    cjkCharacters: 14,
    otherWords: 2,
    minutes: 1,
  });
  expect(result.searchBlocks).toEqual([
    "示例",
    "使用 Shiki 阅读说明，查看 codeToHast。",
    "const snippet = '<script>literal</script>';",
    "保留空行。",
  ]);
  expect(elements(result.tree, "a")[0]?.properties["href"]).toBe(
    "/blog/posts/example/?topic=API#public",
  );
  expect(Object.isFrozen(result.tree.children)).toBe(true);
  expect(Object.isFrozen(result.outline[0])).toBe(true);
  expect(Object.isFrozen(result.readingStats)).toBe(true);
});

it("binds public heading links and every rendered footnote reference to unique targets", async () => {
  const { tree, outline } = await compile(
    [
      "# 独立标题",
      "",
      "## 中文",
      "",
      "## **中文**",
      "",
      "#### 更深",
      "",
      "[第二个](#%E4%B8%AD%E6%96%87-1) 甲[^x] 乙[^x] 丙[^x-2]",
      "",
      "[^x]: 一。",
      "",
      "[^x-2]: 二，其中引用一[^x]。",
      "",
      "[^unused]: 不显示。",
    ].join("\n"),
  );
  const nodes = elements(tree);
  const idList = nodes
    .map((node) => node.properties["id"])
    .filter((id): id is string => typeof id === "string");
  expect(new Set(idList).size).toBe(idList.length);
  expect(outline.map(({ id }) => id)).toEqual([
    "user-content-独立标题",
    "user-content-中文",
    "user-content-中文-1",
  ]);
  expect(idList).toContain("user-content-更深");
  const links = elements(tree, "a");
  const references = links.filter(
    ({ properties }) => "dataFootnoteRef" in properties,
  );
  const returns = links.filter(
    ({ properties }) => "dataFootnoteBackref" in properties,
  );
  expect(references).toHaveLength(4);
  expect(elements(tree, "li")).toHaveLength(2);
  expect(links[0]?.properties["href"]).toBe("#user-content-中文-1");
  expect(returns.map(({ properties }) => properties["href"]).sort()).toEqual(
    references.map(({ properties }) => `#${properties["id"]}`).sort(),
  );
  for (const { properties } of references) {
    expect(idList).toContain(String(properties["href"]).slice(1));
    expect(properties["ariaDescribedBy"]).toEqual([
      "user-content-footnote:label",
    ]);
  }
  expect(idList).toContain("user-content-footnote:label");
});

it("keeps safe image and list semantics and applies only the configured root path", async () => {
  const markdown = [
    "[本地](/posts/abc/?q=api#user-content-abc) [相对](../abc/) [外站](//example.com/a) [邮件](mailto:hi@example.com)",
    "",
    "![预览][cover] ![非法](javascript:alert%281%29)",
    "",
    '[cover]: /assets/photo.jpg "项目题注"',
    "",
    "3. 三",
    "4. 四",
    "",
    "- [x] 已完成",
    "- [ ] 待处理",
    "",
    '[非法](javascript:alert%281%29) <iframe src="https://example.com"></iframe>',
  ].join("\n");
  const [{ tree }, root] = await Promise.all([
    compile(markdown),
    compile(markdown, ""),
  ]);
  expect(elements(tree, "img").map(({ properties }) => properties)).toEqual([
    { src: "/blog/assets/photo.jpg", alt: "预览", title: "项目题注" },
  ]);
  expect(elements(root.tree, "img")[0]?.properties["src"]).toBe(
    "/assets/photo.jpg",
  );
  expect(
    elements(tree, "a").map(({ properties }) => properties["href"]),
  ).toEqual([
    "/blog/posts/abc/?q=api#user-content-abc",
    "../abc/",
    "//example.com/a",
    "mailto:hi@example.com",
    undefined,
  ]);
  expect(elements(tree, "ol")[0]?.properties["start"]).toBe(3);
  expect(elements(tree, "input").map(({ properties }) => properties)).toEqual([
    { ariaLabel: "已完成", checked: true, disabled: true, type: "checkbox" },
    { ariaLabel: "待处理", checked: false, disabled: true, type: "checkbox" },
  ]);
  expect(elements(tree, "iframe")).toEqual([]);
});

it("collects list items and table rows in order and counts mixed prose with separate units", async () => {
  const { tree, searchBlocks } = await compile(
    [
      "- 第一",
      "  - 下一层",
      "- 之后",
      "",
      "| **术语** | 说明 |",
      "| :--- | ---: |",
      "| TypeScript | 分词 |",
    ].join("\n"),
  );
  expect(searchBlocks).toEqual([
    "第一",
    "下一层",
    "之后",
    "术语 说明",
    "TypeScript 分词",
  ]);
  expect(elements(tree, "table")[0]?.properties["className"]).toEqual([
    "markdown-glossary",
  ]);
  expect(elements(tree, "th").map(({ properties }) => properties)).toEqual([
    { align: "left", scope: "col" },
    { align: "right", scope: "col" },
  ]);

  const { readingStats } = await compile(
    "𠀀".repeat(500) + "。" + " Word".repeat(199) + " 123",
  );
  expect(readingStats).toEqual({
    cjkCharacters: 500,
    otherWords: 200,
    minutes: 2,
  });
});

it("uses Shiki line boundaries and preserves the source of typed and plain code", async () => {
  const code = ["", "/* open", "\tclose */  ", "const value = 1;", ""].join(
    "\n",
  );
  const { tree, readingStats } = await compile(
    [
      "```ts {2, 4-5}",
      code,
      "```",
      "",
      "```",
      "  no language",
      "```",
      "",
      "```txt",
      "literal",
      "```",
      "",
      "    indented",
      "",
      "```text",
      "```",
    ].join("\n"),
  );
  const blocks = elements(tree, "pre");
  expect(blocks.map((node) => node.data?.codeFrame)).toEqual([
    { label: "ts", source: code },
    { label: "纯文本", source: "  no language" },
    { label: "txt", source: "literal" },
    { label: "纯文本", source: "indented" },
    { label: "text", source: "" },
  ]);
  const typed = blocks[0];
  if (!typed) throw new Error("Missing typed code.");
  const lines = elements(typed, "span")
    .map(({ properties }) => {
      const classes = properties["class"];
      return Array.isArray(classes) ? classes : [classes];
    })
    .filter((classes) => classes.includes("line"));
  expect(lines).toEqual([
    ["line"],
    ["line", "highlighted"],
    ["line"],
    ["line", "highlighted"],
    ["line", "highlighted"],
  ]);
  expect(readingStats).toEqual({ cjkCharacters: 0, otherWords: 0, minutes: 0 });
});

it.each([
  ["```unknown-language\nvalue\n```", "Unknown code language"],
  ["```ansi\nvalue\n```", "Unknown code language"],
  ["```ts {2-1}\na\nb\n```", "Invalid line highlight"],
  ["```ts {1-9007199254740992}\na\n```", "Invalid line highlight"],
  ["```ts {1} extra\na\n```", "Invalid line highlight"],
  ["```ts {1}\n```", "Invalid line highlight"],
  ["[未知](#missing)", "Unknown Markdown target"],
  ["[非法](#%ZZ)", "Invalid Markdown fragment"],
])("rejects %s at the source position", async (body, reason) => {
  await expect(compile("\n" + body)).rejects.toThrow(
    `${filePath}:9:1: ${reason}`,
  );
});
