# Remove test-only production exports

Status: resolved

## Goal

Eliminate public exports retained only for tests without changing production
interfaces or related-reading behavior.

## Scope

- Remove `BASE_URL` and update tests to use `SITE_ORIGIN` and `siteUrl()`.
- Remove `selectRelatedPosts` and test through `selectRelatedReading()`.
- Inspect the two affected modules for equivalent test-only exports without
  expanding into a repository-wide refactor.

## Acceptance Criteria

- Production consumers retain their existing interfaces and behavior.

## Verification

- Run the affected site and post-detail component tests.

## Answer

Removed `BASE_URL`; site tests now use `SITE_ORIGIN` and `siteUrl()`. Removed
`selectRelatedPosts`; related-reading tests now assert through the production
`selectRelatedReading()` result. The affected modules were also checked for
equivalent test-only exports: `formatDetailDate` was internalized and is now
covered through rendered article behavior, while the remaining exports have
production consumers or are the required configuration interface.

Verified with `pnpm exec vitest run src/lib/site.spec.ts
src/components/post/post-detail-template.spec.tsx` (39 tests passed).

## Comments
