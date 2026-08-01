# Return structured Markdown output

Status: resolved

## Goal

Generate HTML and table-of-contents data from one Markdown syntax-tree pipeline.

## Scope

- Replace the string-only renderer with a typed rendered-content result.
- Collect heading level, stable ID, and display text during processing.
- Handle headings containing formatting, links, inline code, entities, and duplicate text.
- Remove regex-based heading extraction.
- Remove regex-based duplicate leading-H1 stripping by defining title behavior in the transform or content contract.
- Preserve sanitization, code metadata, syntax highlighting, and existing safe-protocol behavior.

## Acceptance Criteria

- Rendered HTML and headings originate from the same tree.
- Table-of-contents text does not expose encoded entities or markup.
- Duplicate headings receive stable distinct IDs matching rendered HTML.
- No consumer parses serialized HTML to recover document structure.

## Verification

- Add focused Markdown fixture tests for nested inline content, entities, repeated headings, and leading titles.
- Run Markdown, post-detail, catalog, and security-related sanitization tests.
- Run typecheck and lint.

## Answer

- Added immutable `RenderedMarkdown` and `MarkdownHeading` results. HTML and headings are collected from the same sanitized HAST before serialization.
- Added an MDAST transform that removes only a first H1 whose semantic text matches the frontmatter title, before slug generation; formatted, linked, inline-code, and entity-bearing titles are covered.
- Catalog Posts and Project Cases now retain `renderedContent`; Post and Project detail routes consume it directly. Removed serialized-HTML heading extraction and leading-H1 stripping.
- Added renderer, Catalog, Post detail route, and Project detail route coverage for matching IDs, duplicate IDs, readable inline heading text, entities, H1 behavior, h4–h6, and deep immutability.
- Verification passed: targeted Markdown, Catalog, Post detail, Project detail, Content Contract, legacy loader, Posts, and Projects tests; `pnpm test` (28 files, 292 tests); `pnpm lint`; `pnpm exec tsc --noEmit`; modified-file Prettier check; `git diff --check`; and `NEXT_PUBLIC_SITE_URL=https://example.com BASE_PATH=/blog NEXT_PUBLIC_BASE_PATH=/blog pnpm build`.
- Production-code searches found no `extractHeadings`, `stripLeadingTitleHeading`, serialized-heading HTML regex, or DOM parsing. The production build generated only Posts `2026-04-30`, `2026-05-02`, and Project Case `personal-blog`.
