# Tighten coverage thresholds

Status: resolved

## Goal

Protect the content and URL validation code with module-specific branch
coverage thresholds while retaining the existing global floor.

## Scope

- Keep global statements, branches, functions, and lines at 80%.
- Set branch thresholds of at least 85% for `content-catalog.ts` and
  `content-contracts.ts`.
- Set branch thresholds of at least 90% for `site.ts` and the new URL pathname
  module.
- Add behavior-focused tests before enabling thresholds.

## Acceptance Criteria

- Coverage thresholds are enforced by Vitest without assertion-only tests.

## Verification

- Run `pnpm test:coverage` after targeted test development.

## Answer

Added behavior-focused tests for missing collection directories, default catalog
access, deterministic same-day ordering, null Project Case lookups, non-object
frontmatter, and directory covers. Vitest now enforces global 80% thresholds,
85% branch coverage for the catalog and contracts, and 90% for site URLs and
the URL pathname module.

Verified with `pnpm test:coverage`: 209 tests passed; global branch coverage
was 84.85%, with `content-catalog.ts` at 85.36%, `content-contracts.ts` at
89.18%, `site.ts` at 98%, and `url-path.ts` at 100%.

## Comments
