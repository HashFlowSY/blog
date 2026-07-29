# Build the atomic Content Catalog

Status: ready-for-agent
Blocked by: 04

## Goal

Replace independent filesystem getters with one all-or-nothing content snapshot shared by every output consumer.

## Scope

- Discover, parse, validate, and index posts and real project cases.
- Aggregate every file and cross-file validation error before throwing.
- Detect duplicate slugs within each collection.
- Validate referenced local files without allowing path traversal outside `public/`.
- Expose collection and slug lookup APIs needed by routes, static params, feeds, sitemap, and metadata.
- Ensure development rebuilds see content changes.

## Acceptance Criteria

- No invalid published entry is skipped with a warning.
- A failing build reports all content errors with file path, field, and reason.
- All consumers observe the same content snapshot.
- Duplicate slugs and missing assets fail before route generation.
- Catalog tests use representative real filesystem fixtures for integration behavior; schema internals may retain focused unit tests.

## Verification

- Run catalog unit and filesystem integration tests.
- Run all content-related tests.
- Run typecheck and lint.
