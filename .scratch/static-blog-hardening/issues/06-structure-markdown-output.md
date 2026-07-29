# Return structured Markdown output

Status: ready-for-agent
Blocked by: 05

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
