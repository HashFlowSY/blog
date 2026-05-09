# Safe Markdown Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make posts and projects fully support safe static Markdown: CommonMark plus GFM authoring features, with sanitized HTML output and matching article styles.

**Architecture:** Keep the current content loader and unified Markdown pipeline. Extend tests around `markdownToHtml`, tighten the sanitize schema only where supported Markdown output needs attributes, add CSS for newly supported rendered elements, and document the supported authoring contract.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, `remark`, `remark-gfm`, `remark-rehype`, `rehype-highlight`, `rehype-slug`, `rehype-sanitize`, `rehype-stringify`.

---

## File Structure

- Modify `src/lib/markdown.spec.ts`: behavior tests for full safe static Markdown support.
- Modify `src/lib/markdown.ts`: Markdown pipeline and sanitize schema adjustments.
- Modify `src/app/globals.css`: article/prose styles for images, task lists, footnotes, strikethrough, and safer table/image overflow.
- Modify `README.md`: document supported Markdown features and explicit exclusions.

## Current Context

The repository already has uncommitted user changes on `main` in Markdown-related files. Do not revert them. Work with the current file contents and keep edits narrowly scoped. If using an isolated worktree, carry or recreate only the changes needed by this plan.

The current Markdown pipeline in `src/lib/markdown.ts` already imports `remark-gfm`, runs it before `remarkCodeMeta`, and allows code block attributes plus table alignment attributes. Existing tests already cover basic Markdown and GFM tables.

## Task 1: Expand Markdown Renderer Behavior Tests

**Files:**

- Modify: `src/lib/markdown.spec.ts`

- [ ] **Step 1: Add failing tests for safe static Markdown support**

Add these tests inside `describe("markdownToHtml", () => { ... })`. Put GFM syntax tests near the existing basic Markdown conversion tests, image tests near link tests, code metadata tests near code highlighting tests, and raw HTML safety tests inside the XSS section.

```ts
it("将 Markdown 图片转换为安全 img 标签", async () => {
  const result = await markdownToHtml(
    '![示例图片](https://example.com/image.png "图片标题")',
  );

  expect(result).toContain("<img");
  expect(result).toContain('src="https://example.com/image.png"');
  expect(result).toContain('alt="示例图片"');
  expect(result).toContain('title="图片标题"');
});

it("将 GFM 删除线转换为 del 标签", async () => {
  const result = await markdownToHtml("保留 ~~删除~~ 文本");

  expect(result).toContain("<del>删除</del>");
});

it("将 GFM 自动链接转换为 a 标签", async () => {
  const result = await markdownToHtml("访问 https://example.com/docs 获取信息");

  expect(result).toContain('<a href="https://example.com/docs">');
  expect(result).toContain("https://example.com/docs</a>");
});

it("将 GFM 任务列表转换为禁用 checkbox", async () => {
  const result = await markdownToHtml("- [x] 已完成\n- [ ] 待处理");

  expect(result).toContain('class="contains-task-list"');
  expect(result).toContain('class="task-list-item"');
  expect(result).toContain('<input type="checkbox" checked disabled>');
  expect(result).toContain('<input type="checkbox" disabled>');
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
```

Add this test inside `describe("代码高亮", () => { ... })`:

````ts
it("保留代码块行高亮 meta 并标记高亮行", async () => {
  const result = await markdownToHtml(
    "```ts {2}\nconst a = 1;\nconst b = 2;\n```",
  );

  expect(result).toContain('data-meta="{2}"');
  expect(result).toContain('data-line="1"');
  expect(result).toContain('data-line="2"');
  expect(result).toContain('data-highlighted="true"');
});
````

Add these tests inside `describe("XSS 过滤", () => { ... })`:

```ts
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
```

- [ ] **Step 2: Run tests and verify at least one new test fails**

Run:

```bash
pnpm vitest run src/lib/markdown.spec.ts
```

Expected before implementation: at least one new assertion fails if the current sanitize schema strips required GFM attributes such as task-list classes or footnote attributes. If all tests already pass, record that the renderer behavior is already present and continue to Task 2 to make the behavior explicit and robust.

- [ ] **Step 3: Commit test changes after red verification**

Do not commit if production code was changed in this task. If committing is appropriate in the active workflow, run:

```bash
git add src/lib/markdown.spec.ts
git commit -m "test: cover safe markdown rendering"
```

If the working tree contains unrelated user changes, skip the commit and report that the task is complete without committing because unrelated changes are present.

## Task 2: Harden Markdown Pipeline and Sanitizer

**Files:**

- Modify: `src/lib/markdown.ts`
- Test: `src/lib/markdown.spec.ts`

- [ ] **Step 1: Update sanitize schema for supported safe Markdown output**

In `src/lib/markdown.ts`, ensure the sanitize schema permits only attributes needed by supported Markdown output:

```ts
const sanitizeSchema: typeof defaultSchema = {
  ...defaultSchema,
  attributes: {
    ...baseAttrs,
    a: [
      ...(baseAttrs["a"] || []),
      ["data-footnote-ref"],
      ["data-footnote-backref"],
      ["aria-describedby"],
      ["aria-label"],
      ["className"],
    ],
    code: [...(baseAttrs["code"] || []), ["className"], ["data-meta"]],
    div: [...(baseAttrs["div"] || []), ["className"], ["data-language"]],
    h2: [...(baseAttrs["h2"] || []), ["className"]],
    input: [
      ...(baseAttrs["input"] || []),
      ["type", "checkbox"],
      ["checked"],
      ["disabled"],
    ],
    li: [...(baseAttrs["li"] || []), ["className"]],
    section: [
      ...(baseAttrs["section"] || []),
      ["className"],
      ["data-footnotes"],
    ],
    span: [
      ...(baseAttrs["span"] || []),
      ["className"],
      ["data-line"],
      ["data-highlighted"],
    ],
    td: [...(baseAttrs["td"] || []), ["align"]],
    th: [...(baseAttrs["th"] || []), ["align"]],
    ul: [...(baseAttrs["ul"] || []), ["className"]],
    pre: [...(baseAttrs["pre"] || []), ["className"]],
  },
};
```

Keep the pipeline order:

```ts
const result = await remark()
  .use(remarkGfm)
  .use(remarkCodeMeta)
  .use(remarkRehype)
  .use(rehypeSlug)
  .use(rehypeHighlight)
  .use(rehypeCodeBlock)
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeStringify)
  .process(markdown);
```

- [ ] **Step 2: Run renderer tests**

Run:

```bash
pnpm vitest run src/lib/markdown.spec.ts src/lib/remark-code-meta.spec.ts src/lib/rehype-code-block.spec.ts
```

Expected: all tests pass.

- [ ] **Step 3: Refactor only if needed**

If TypeScript or lint complains about long inline arrays, extract a local helper:

```ts
function attrsFor(tag: string) {
  return baseAttrs[tag] || [];
}
```

Then replace repeated `baseAttrs["tag"] || []` reads with `attrsFor("tag")`. Do not change behavior.

- [ ] **Step 4: Commit renderer changes**

If committing is appropriate in the active workflow, run:

```bash
git add src/lib/markdown.ts src/lib/markdown.spec.ts
git commit -m "feat: support safe static markdown syntax"
```

If unrelated user changes are present in these files, skip the commit and report the reason.

## Task 3: Add Article Styles for Supported Markdown Elements

**Files:**

- Modify: `src/app/globals.css`

- [ ] **Step 1: Add styles for Markdown images, task lists, footnotes, and strikethrough**

Add these rules near the existing `.prose` rules. If equivalent selectors already exist, merge without duplicating:

```css
.prose img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 1.6em auto;
  border: 1px solid var(--border);
  background: var(--panel);
}
.prose del {
  color: var(--muted);
  text-decoration-color: var(--accent);
}
.prose .contains-task-list {
  padding-left: 0;
  list-style: none;
}
.prose .task-list-item {
  display: flex;
  gap: 0.55em;
  align-items: flex-start;
}
.prose .task-list-item input[type="checkbox"] {
  flex: 0 0 auto;
  width: 1em;
  height: 1em;
  margin-top: 0.42em;
  accent-color: var(--accent);
}
.prose .footnotes {
  margin-top: 2.4em;
  padding-top: 1.2em;
  border-top: 1px solid var(--border);
  color: var(--muted);
  font-size: 0.9em;
}
.prose .footnotes ol {
  margin-bottom: 0;
}
.prose .data-footnote-backref {
  margin-left: 0.25em;
  text-decoration: none;
}
```

Add these article-specific overrides near the existing `.article-body` rules. Merge with existing table/code rules without duplicating:

```css
.article-body img {
  border-color: var(--quiet-border);
}
.article-body .footnotes {
  border-top-color: var(--quiet-border);
}
.article-body .task-list-item {
  margin-top: 10px;
}
```

- [ ] **Step 2: Run formatting or lint check for CSS**

Run:

```bash
pnpm prettier --check src/app/globals.css
```

Expected: pass. If it fails due formatting, run:

```bash
pnpm prettier --write src/app/globals.css
```

Then rerun the check.

- [ ] **Step 3: Commit style changes**

If committing is appropriate in the active workflow, run:

```bash
git add src/app/globals.css
git commit -m "style: support rendered markdown elements"
```

If unrelated user changes are present in `src/app/globals.css`, skip the commit and report the reason.

## Task 4: Document Supported Markdown Contract

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Add Markdown support documentation**

In `README.md`, add this section after the content authoring examples and before `### Frontmatter Reference`:

`````md
### Markdown Support

Posts and project entries use safe static Markdown. Supported authoring features:

- CommonMark headings, paragraphs, emphasis, links, blockquotes, ordered lists, unordered lists, inline code, and fenced code blocks
- GitHub Flavored Markdown tables, task lists, strikethrough, footnotes, and autolink literals
- Markdown images with sanitized `src`, `alt`, and `title`
- Automatic heading anchors for `h1` through `h6`
- Syntax highlighting for fenced code blocks
- Line highlighting with fenced code metadata such as ` ```ts {1,3-5} `

Intentional exclusions:

- No MDX files
- No embedded React components
- No arbitrary raw HTML as a supported content feature
- No iframe or script embeds
`````

If the four-backtick inline example is awkward in Markdown, rewrite that bullet as:

```md
- Line highlighting with fenced code metadata such as `{1,3-5}` after the language name
```

- [ ] **Step 2: Run documentation formatting check**

Run:

```bash
pnpm prettier --check README.md
```

Expected: pass. If it fails due formatting, run:

```bash
pnpm prettier --write README.md
```

Then rerun the check.

- [ ] **Step 3: Commit documentation changes**

If committing is appropriate in the active workflow, run:

```bash
git add README.md
git commit -m "docs: describe markdown support"
```

If unrelated user changes are present, skip the commit and report the reason.

## Task 5: Final Verification

**Files:**

- Verify: `src/lib/markdown.ts`
- Verify: `src/lib/markdown.spec.ts`
- Verify: `src/lib/content-loader.spec.ts`
- Verify: `src/lib/remark-code-meta.spec.ts`
- Verify: `src/lib/rehype-code-block.spec.ts`
- Verify: `README.md`
- Verify: `src/app/globals.css`

- [ ] **Step 1: Run targeted tests**

Run:

```bash
pnpm vitest run src/lib/markdown.spec.ts src/lib/content-loader.spec.ts src/lib/remark-code-meta.spec.ts src/lib/rehype-code-block.spec.ts
```

Expected: all tests pass.

- [ ] **Step 2: Run lint**

Run:

```bash
pnpm lint
```

Expected: pass.

- [ ] **Step 3: Run full unit test suite if targeted tests and lint pass**

Run:

```bash
pnpm test
```

Expected: pass.

- [ ] **Step 4: Inspect final diff**

Run:

```bash
git diff -- src/lib/markdown.ts src/lib/markdown.spec.ts src/app/globals.css README.md
```

Expected: diff is limited to safe Markdown support, styles, and docs. No unrelated component or content changes.
