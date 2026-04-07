import { describe, expect, it } from "vitest";

import rehypeCodeBlock from "./rehype-code-block";
import remarkCodeMeta from "./remark-code-meta";

async function process(markdown: string) {
  const { remark } = await import("remark");
  const remarkRehype = (await import("remark-rehype")).default;
  const rehypeStringify = (await import("rehype-stringify")).default;

  const file = await remark()
    .use(remarkCodeMeta)
    .use(remarkRehype)
    .use(rehypeCodeBlock)
    .use(rehypeStringify)
    .process(markdown);

  return String(file);
}

const MD_CODE = "```typescript\nconst x = 1;\nconst y = 2;\nconst z = 3;\n```";

describe("rehypeCodeBlock", () => {
  it("wraps pre>code in div.code-block with data-language", async () => {
    const html = await process(MD_CODE);
    expect(html).toContain('class="code-block"');
    expect(html).toContain('data-language="typescript"');
  });

  it("adds language label span in header", async () => {
    const html = await process(MD_CODE);
    expect(html).toContain('class="code-block-lang"');
    expect(html).toContain(">typescript<");
  });

  it("splits code content into line spans with data-line", async () => {
    const html = await process(MD_CODE);
    expect(html).toContain('data-line="1"');
    expect(html).toContain('data-line="2"');
    expect(html).toContain('data-line="3"');
  });

  it("highlights lines from meta attribute", async () => {
    const md =
      "```typescript {1,3}\nconst x = 1;\nconst y = 2;\nconst z = 3;\n```";
    const html = await process(md);
    expect(html).toContain('data-highlighted="true"');
  });

  it("works without language class", async () => {
    const md = "```\nsome code\nmore code\n```";
    const html = await process(md);
    expect(html).toContain('class="code-block"');
    expect(html).not.toContain("data-language");
    expect(html).toContain('data-line="1"');
    expect(html).toContain('data-line="2"');
  });

  it("handles empty code block", async () => {
    const md = "```js\n```";
    const html = await process(md);
    expect(html).toContain('class="code-block"');
    expect(html).toContain("<code");
    expect(html).not.toContain("data-line");
  });

  it("does not highlight when no meta is present", async () => {
    const html = await process(MD_CODE);
    expect(html).not.toContain("data-highlighted");
  });

  it("handles meta with no valid lines gracefully", async () => {
    const md = "```js {}\ncode\n```";
    const html = await process(md);
    expect(html).not.toContain("data-highlighted");
  });

  it("highlights a range of lines from meta", async () => {
    const md = "```js {2-4}\nline1\nline2\nline3\nline4\nline5\n```";
    const html = await process(md);
    expect(html).toContain('data-highlighted="true"');
    expect(html).toContain('data-line="2"');
    expect(html).toContain('data-line="3"');
    expect(html).toContain('data-line="4"');
    // line1 and line5 should not be highlighted
    const highlightedCount = (html.match(/data-highlighted/g) || []).length;
    expect(highlightedCount).toBe(3);
  });

  it("handles single line highlight", async () => {
    const md = "```js {3}\nline1\nline2\nline3\n```";
    const html = await process(md);
    const highlightedCount = (html.match(/data-highlighted/g) || []).length;
    expect(highlightedCount).toBe(1);
    expect(html).toContain('data-line="3"');
  });

  it("handles multiple comma-separated highlights", async () => {
    const md = "```js {1,3,5}\nline1\nline2\nline3\nline4\nline5\n```";
    const html = await process(md);
    const highlightedCount = (html.match(/data-highlighted/g) || []).length;
    expect(highlightedCount).toBe(3);
  });

  it("adds newline text nodes between line spans", async () => {
    const md = "```js\na\nb\n```";
    const html = await process(md);
    // There should be newline separators between line spans
    const spanCount = (html.match(/data-line/g) || []).length;
    expect(spanCount).toBe(2);
  });

  it("wraps pre in code-block div without data-language when no language", async () => {
    const md = "```\nsome code\n```";
    const html = await process(md);
    // Should have the wrapper div but no data-language attribute
    const wrapperMatch = html.match(/class="code-block"/g);
    expect(wrapperMatch).toBeTruthy();
    expect(html).not.toContain("data-language");
  });

  it("handles invalid range in meta gracefully", async () => {
    const md = "```js {5-2}\ncode\n```";
    const html = await process(md);
    // start > end range should be ignored
    expect(html).not.toContain("data-highlighted");
  });

  it("handles zero in meta gracefully", async () => {
    const md = "```js {0}\ncode\n```";
    const html = await process(md);
    // zero should be ignored (only > 0 accepted)
    expect(html).not.toContain("data-highlighted");
  });
});
