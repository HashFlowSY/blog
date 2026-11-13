import { expect, it } from "vitest";

import { readMarkdownSource } from "./frontmatter";

const file = "content/posts/zh-CN/sample.md";

it("reads YAML 1.2 from UTF-8 with BOM and keeps the source body position", () => {
  const bytes = Buffer.from(
    "\uFEFF---\r\ndate: 2026-04-30\r\ndraft: false\r\n---\r\n\r\n正文\r\n",
  );
  expect(readMarkdownSource(file, bytes)).toEqual({
    filePath: file,
    frontmatter: { date: "2026-04-30", draft: false },
    body: "\r\n正文\r\n",
    bodyLine: 5,
  });
});

it.each([
  ["---js\ndraft: true\n---\n", "line 1: Expected YAML frontmatter"],
  ["---\ndraft: true\n", "line 1: Expected YAML frontmatter"],
  ["---\n[a, b]\n---\n", "line 2: YAML frontmatter must be a mapping"],
  [
    "---\ndraft: true\ndraft: false\n---\n",
    "line 3, column 1: Invalid YAML frontmatter",
  ],
])("rejects invalid frontmatter %s with its position", (source, error) => {
  expect(() => readMarkdownSource(file, Buffer.from(source))).toThrow(error);
});
