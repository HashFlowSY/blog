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
validates. It exposes `projectCases`, `projectCaseSlugs`,
`featuredProjectCases`, and `getProjectCaseBySlug`, alongside the published
Post collection, tag, slug, and adjacency queries.

The Catalog owns its output types instead of importing legacy loader types or
exposing `locale`. Its Published contracts express the validated guarantees:
Posts do not expose `cover`; Project Cases have required `cover`, `role`,
`duration`, and `result`; and both collections use non-empty tags. Production
components consume those guarantees directly, while `source` and `demo` remain
nullable because they are genuinely optional.

Development reads a fresh snapshot on every request, so edits, additions, and
deletions are visible immediately. Production callers share one validated
snapshot. If the first production fill rejects, its cached rejection is cleared
and a corrected filesystem can be rebuilt successfully on the next call.
Pages, static params, metadata, RSS, and sitemap use this Catalog directly;
legacy loader exports remain without production callers for Issue 07.

Added real temporary-filesystem integration coverage for successful snapshots,
malformed YAML, strict multi-field and multi-file errors, missing/invalid and
duplicate slugs, cover absence/absolute-path/path-traversal/symlink escape,
Draft handling, stable error formatting, immutability, development/production
cache behavior, and failed-production-cache retry after content repair.

Default production directories are statically scoped beneath `process.cwd()`.
The test-only configurable root and untrusted cover filesystem paths use Next's
`turbopackIgnore` annotation, retaining real filesystem validation without
tracing the entire project.

Verified successfully:

- `pnpm exec vitest run src/lib/content-catalog.spec.ts --reporter=verbose` —
  11 passed
- `pnpm exec vitest run src/lib/content-contracts.spec.ts src/lib/content-catalog.spec.ts --reporter=verbose` — 31 passed
- `pnpm test` — 26 files, 289 passed
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- scoped `pnpm exec prettier --check ...`
- `NEXT_PUBLIC_SITE_URL=https://example.com BASE_PATH=/blog NEXT_PUBLIC_BASE_PATH=/blog pnpm build` — passed without a Turbopack tracing warning; emitted only `2026-04-30`, `2026-05-02`, and `personal-blog` content routes
- `git diff --check`

Implemented in commits `b6d8e0e feat: build atomic content catalog` and
`c701f09 fix: harden content catalog contracts`.
