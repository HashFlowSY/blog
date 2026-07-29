# Build the atomic Content Catalog

Status: resolved

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

## Answer

Implemented `src/lib/content-catalog.ts` as the single build-time Content
Catalog. It discovers the Chinese Posts and Project Cases, parses every file,
uses the strict Issue 03 contracts, aggregates stable structured errors, and
only renders, sorts, freezes, and indexes published content after every file
validates. It exposes published collections, slug lookups and lists, featured
Project Cases, Post tags, and Post adjacency from one immutable snapshot.

The catalog uses fresh reads in development so edits, additions, and deletions
are visible on the next request. Production callers share one cached validated
snapshot and retry a build after a failed cache fill. Pages, static params,
metadata, RSS, and sitemap now use this Catalog directly; legacy loader exports
remain without production callers for Issue 07.

Added real temporary-filesystem integration tests for successful snapshots,
malformed YAML, strict multi-field and multi-file errors, missing/invalid and
duplicate slugs, cover absence/absolute-path/path-traversal/symlink escape, Draft handling,
error formatting, immutability, and development/production cache behavior.

Verified successfully:

- `pnpm exec vitest run src/lib/content-catalog.spec.ts --reporter=verbose` —
  8 passed
- focused content tests — 6 files, 145 passed
- `pnpm test` — 26 files, 287 passed
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- scoped `pnpm exec prettier --check ...`
- `NEXT_PUBLIC_SITE_URL=https://example.com BASE_PATH=/blog
NEXT_PUBLIC_BASE_PATH=/blog pnpm build` — passed; emitted only
  `2026-04-30`, `2026-05-02`, and `personal-blog` content routes
- `git diff --check`

The successful production build emitted one non-failing Turbopack file-tracing
warning for the deliberate build-time filesystem reads.
