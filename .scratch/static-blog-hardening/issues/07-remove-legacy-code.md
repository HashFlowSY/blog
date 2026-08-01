# Remove unreachable legacy code

Status: resolved

## Goal

Remove historical abstractions and tests that no longer belong to the Chinese-only static site.

## Scope

- Remove locale parameters, locale fields, and per-locale loader caches with no production meaning.
- Remove unused exports after replacing their consumers with the Content Catalog.
- Remove the unused `ProjectBoard` component and its isolated tests.
- Remove stale i18n, script, and nonexistent-path coverage exclusions.
- Recheck production reachability before deleting each target.

## Acceptance Criteria

- Production code contains no speculative multilingual surface.
- Every retained exported content API has a production consumer or a documented public purpose.
- Coverage no longer benefits from tests of production-unreachable components.
- Global coverage still satisfies the accepted 80% thresholds.

## Verification

- Search for locale and removed symbol references.
- Run the complete unit test suite with coverage.
- Run lint and typecheck.

## Answer

Removed the unreachable `posts`, `projects`, and `content-loader` modules and
their dedicated tests; the HTML-only `markdownToHtml` compatibility wrapper;
the test-only Catalog adjacency query; `ProjectBoard` and its isolated test;
the orphaned metadata test helper; and stale i18n, scripts, config, and
test-helper coverage exclusions. The E2E helpers now use one `SITE_COPY`
object with no locale parameter or locale map. `ProjectList`, `ProjectCard`,
the Content Catalog, and the structured `renderMarkdown` API remain.

Before deletion, imports, App Router routes, static params, feed, sitemap, and
the static-export build path were checked. All production consumers use
`getContentCatalog()`; every legacy target was referenced only by its own
tests, another legacy target, or stale documentation. The retained Catalog
collections and slug lookups have production route consumers, while its
builder and reader compose the production snapshot. `locale` searches now
find only `String.prototype.localeCompare` sorting calls.

Verified:

- `pnpm exec vitest run --coverage --no-cache` — 24 files, 186 tests passed;
  statements 93.19%, branches 82.19%, functions 97.15%, lines 95.00%.
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm format:check`
- `NODE_ENV=production NEXT_PUBLIC_SITE_URL=https://example.com BASE_PATH=/blog NEXT_PUBLIC_BASE_PATH=/blog pnpm build`
- `git diff --check`

### Follow-up verification

Removed the previously overlooked unmatched `src/**/loading.tsx`,
`src/**/error.tsx`, and `src/**/middleware.ts` coverage exclusions. A fresh
source-file search found no matching files. Re-ran the complete coverage suite
(24 files, 186 tests; statements 93.19%, branches 82.19%, functions 97.15%,
lines 95.00%), lint, non-incremental typecheck, format check, and the `/blog`
production build successfully.

### Public content follow-up

Replaced the obsolete “generic Markdown content pipeline” claim in the public
Personal Blog Project Case with the current atomic Content Catalog. Confirmed
the obsolete phrase and `createContentLoader` no longer appear in public
content, then re-ran the complete coverage suite (24 files, 186 tests;
statements 93.19%, branches 82.19%, functions 97.15%, lines 95.00%), lint,
non-incremental typecheck, format check, and the `/blog` production build.
