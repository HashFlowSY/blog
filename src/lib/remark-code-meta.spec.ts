import { describe, expect, it } from "vitest";

import remarkCodeMeta from "./remark-code-meta";

async function process(markdown: string) {
  const { remark } = await import("remark");
  const remarkRehype = (await import("remark-rehype")).default;
  const rehypeStringify = (await import("rehype-stringify")).default;

  const file = await remark()
    .use(remarkCodeMeta)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(markdown);

  return String(file);
}

describe("remarkCodeMeta", () => {
  it("preserves meta string as data-meta on code elements", async () => {
    const html = await process("```typescript {1,3-5}\nconst x = 1;\n```");
    expect(html).toContain('data-meta="{1,3-5}"');
  });

  it("does not add data-meta when no meta is present", async () => {
    const html = await process("```typescript\nconst x = 1;\n```");
    expect(html).not.toContain("data-meta");
  });

  it("does not affect inline code", async () => {
    const html = await process("Some `code` here");
    expect(html).toContain("<code>");
    expect(html).not.toContain("data-meta");
  });

  it("handles showLineNumbers meta string", async () => {
    const html = await process(
      "```js showLineNumbers\nconsole.log('hi');\n```",
    );
    expect(html).toContain('data-meta="showLineNumbers"');
  });
});
