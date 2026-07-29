# Centralize site configuration and URL validation

Status: resolved
Blocked by: 01

## Goal

Create one validated source for public site identity, GitHub contact, origin, and base path.

## Scope

- Use the existing `https://github.com/HashFlowSY` profile as the only contact channel.
- Remove duplicated contact literals from components.
- Validate release origins and base paths according to the specification.
- Compose canonical, RSS, sitemap, robots, and asset URLs with URL-aware helpers.
- Delete the test that treats a path without a leading slash as a valid malformed URL.

## Acceptance Criteria

- Placeholder email addresses and replacement notes no longer render.
- Release configuration rejects origins with a path, query, hash, trailing slash, non-HTTPS scheme, or invalid base path.
- HTTP localhost remains valid for local development.
- URL tests cover root and `/blog` deployments without double prefixes or double slashes.

## Verification

- Run the site configuration unit tests.
- Run repository searches for `hello@example.com`, placeholder contact copy, and direct GitHub contact literals.
- Run lint and typecheck.

## Answer

- Centralized the public site identity and the HashFlowSY GitHub profile in `src/lib/site.ts`, then replaced duplicated identity and contact literals across the layout, pages, RSS, and contact bands.
- Replaced placeholder email contact copy with the existing GitHub profile as the only rendered contact channel.
- Validated `NEXT_PUBLIC_SITE_URL` as an HTTPS origin (with HTTP localhost allowed only for local development) and validated matching, normalized base paths. `siteUrl` and `assetPath` now compose paths with URL-aware helpers without double prefixes or double slashes.
- Routed `next.config.ts` through the validated base path and documented the environment-variable contract in the README.

Verification completed:

- `node_modules/.bin/vitest run src/lib/site.spec.ts` — 28 tests passed.
- `node_modules/.bin/vitest run` — 24 files / 259 tests passed.
- `node_modules/.bin/eslint .`
- `node_modules/.bin/tsc --noEmit`
- `node_modules/.bin/prettier --check` on all changed TypeScript/TSX/Markdown files.
- Repository searches found no placeholder contact copy in `src`, `e2e`, `content`, or `README.md`; no direct HashFlowSY contact URL remains in `src/app` or `src/components`.
