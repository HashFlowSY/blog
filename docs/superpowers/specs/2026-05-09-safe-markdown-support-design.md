# Safe Markdown Support Design

## Goal

Make the blog fully support safe static Markdown for posts and projects while preserving the current XSS-resistant rendering model.

## Scope

The content system will continue to read Markdown files from `content/posts/<locale>/` and `content/projects/<locale>/`. The supported authoring target is CommonMark plus GitHub Flavored Markdown for a static blog: headings, paragraphs, emphasis, links, images, blockquotes, ordered and unordered lists, tables, task lists, strikethrough, footnotes, autolinks, fenced code blocks, code syntax highlighting, code line highlighting, and heading anchors.

The implementation will not support MDX, embedded React components, arbitrary JavaScript, iframe embeds, or relying on raw HTML as content functionality.

## Architecture

`src/lib/content-loader.ts` remains the frontmatter and file loading boundary. It reads `.md` files, validates frontmatter with Zod, and passes Markdown bodies to `markdownToHtml`.

`src/lib/markdown.ts` remains the rendering boundary. It uses the existing unified pipeline:

1. `remark` parses Markdown.
2. `remark-gfm` enables GFM syntax.
3. `remark-code-meta` preserves fenced code metadata for line highlighting.
4. `remark-rehype` converts Markdown AST to HTML AST.
5. `rehype-slug` adds heading IDs.
6. `rehype-highlight` adds code syntax classes.
7. `rehype-code-block` wraps code blocks and marks highlighted lines.
8. `rehype-sanitize` enforces the HTML allowlist.
9. `rehype-stringify` emits HTML.

The sanitize schema will be expanded only for attributes required by supported safe Markdown output and existing code block behavior. Raw HTML remains filtered according to the sanitize schema and is not treated as a supported authoring surface.

## Rendering

Post and project detail pages will continue to render sanitized HTML through `dangerouslySetInnerHTML`. CSS will provide first-class styling for the supported static Markdown output:

- images and image paragraphs
- tables
- task lists and disabled checkboxes
- footnotes and backrefs
- strikethrough
- blockquotes
- code blocks and inline code

The table of contents continues to use rendered `h1`, `h2`, and `h3` headings. `h4` through `h6` are still rendered as content headings but are not part of the side navigation.

## Security

The renderer must continue to remove or neutralize:

- `<script>` content
- iframe embeds
- inline event handlers such as `onclick` and `onerror`
- `javascript:` URLs
- arbitrary custom HTML behavior

Image support is limited to normal Markdown image output. Sanitization must preserve safe `src`, `alt`, and title behavior from `rehype-sanitize` while preventing event-handler attributes and unsafe protocols.

## Tests

Tests will cover the supported syntax explicitly:

- CommonMark basics: headings, paragraphs, emphasis, links, lists, inline code, fenced code
- GFM: tables, task lists, strikethrough, footnotes, autolinks
- media: Markdown images with safe attributes
- code: language classes and existing line-highlight metadata
- safety: scripts, iframe, event handlers, unsafe protocols, and raw HTML expectations
- boundaries: empty input, Unicode content, long content

Existing content loader tests remain valid and should continue passing.

## Documentation

`README.md` will document the supported Markdown feature set and the intentional exclusions: no MDX, no React components, no arbitrary HTML or iframe embeds.

## Acceptance Criteria

- Posts and projects render safe static Markdown consistently.
- Markdown images, task lists, strikethrough, footnotes, autolinks, tables, and code blocks have tests and usable styling.
- Dangerous HTML and unsafe URLs remain filtered.
- The Markdown and content-loader test suites pass.
- The documentation accurately describes the supported and unsupported authoring features.
