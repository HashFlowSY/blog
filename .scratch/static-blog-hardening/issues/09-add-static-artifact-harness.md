# Test the generated static artifact

Status: resolved
Blocked by: 08

## Goal

Build, serve, and verify the actual `out/` artifact under a representative GitHub Pages project path before upload.

## Scope

- Build with an HTTPS origin and non-empty `/blog` base path.
- Serve the generated files with static-host behavior suitable for trailing-slash routes and `404.html`.
- Point Playwright at the static server rather than `next dev` for release tests.
- Verify generated assets, metadata, RSS, sitemap, and 404 files before deployment.
- Add a documented and pinned preview command.

## Dependency Approval

If a new static-server package is required, stop and request explicit user approval before changing `package.json` or the lockfile. Do not rely on an unpinned `npx` download.

## Acceptance Criteria

- The release harness never starts `next dev`.
- Tests access pages through `/blog`.
- Broken unprefixed assets or links cause failure.
- The exact tested `out/` directory is the directory uploaded for deployment.

## Verification

- Run the production build and static artifact suite.
- Inspect generated `404.html`, feed, sitemap, and representative canonical tags.
- Confirm the worktree contains only intended source, snapshot, and lockfile changes.

## Answer

Implemented a Node 24 standard-library static server in
`scripts/serve-static.mts`; no dependency was added. `pnpm preview:static`
only reads an already-complete `out/` directory, mounts it at `/blog` by
default, resolves trailing-slash directories, returns generated `404.html` for
unknown paths, sets static MIME types, and shuts down with Playwright's web
server lifecycle.

Added `playwright.static.config.ts` and `pnpm test:e2e:static`. The focused
Chromium suite tests the exported artifact at the public server boundary:
representative page and detail routes, `/blog` resource and link prefixes,
resource status and MIME types, canonical URLs, feed, sitemap, robots, custom
404 output, and placeholder contact/template content. The existing
`playwright.config.ts` and `pnpm test:e2e` remain development-server tests.

The deployment build now builds once, runs the static Chromium suite in that
same job, uploads a separate `deploy-static-artifact-playwright-report` on
failure, and only then uploads that unchanged `./out` directory to Pages.

Verified with:

- `NODE_ENV=production NEXT_PUBLIC_SITE_URL=https://example.com BASE_PATH=/blog NEXT_PUBLIC_BASE_PATH=/blog pnpm build`
- `CI=1 pnpm test:e2e:static` — 3 passed
- SHA-256 manifests of `out/` before and after tests — identical
- `pnpm format:check`, `pnpm lint`, and `pnpm exec tsc --noEmit --incremental false`
- `pnpm exec vitest run --coverage --no-cache` — 24 files / 186 tests passed
- `pnpm audit --audit-level moderate` — no known vulnerabilities
- `CI=1 pnpm test:e2e` — 22 development-server tests passed

The generated homepage, post and Project Case canonical URLs, feed, sitemap,
robots, 404 document, and `/blog` asset/link prefixes were inspected directly.
No static-server or development-server process remained after verification.

## Comments

### Follow-up: complete page metadata and reference candidates

The static suite now asserts the title, description, and indexability of each
representative published page, verifies every detail page's title and
description against its rendered semantic content, and confirms the generated
404 is noindex. This keeps metadata regressions at the exported-artifact
boundary rather than only testing canonical URLs.

`href`, `src`, and every `srcset` candidate are now collected in one DOM
traversal. The suite rejects protocol-relative URLs, document-relative local
paths when deployed below `/blog`, malformed URLs, and every same-origin URL
that omits or repeats the configured base path. This includes image candidates
that the browser did not choose to load.

Verified with the representative production `/blog` build, `CI=1 pnpm
test:e2e:static` (3 passed), `pnpm format:check`, `pnpm lint`, `pnpm exec tsc
--noEmit --incremental false`, `pnpm exec vitest run --coverage --no-cache`
(24 files / 186 tests), and `CI=1 pnpm test:e2e` (22 passed).

### Follow-up correction

Moved canonical metadata out of the root layout so it cannot be inherited by
unrelated pages. The homepage, Post archive, Project Case archive, and About
page now each declare their own canonical URL; the generated noindex 404
document has no canonical URL.

The static suite now validates every RSS `<link>`, sitemap `<loc>`, and robots
sitemap URL for the configured public origin and base path. It also rejects
same-origin absolute `href` and `src` values that omit or duplicate the base
path. `e2e/static-artifact-config.ts` supplies one URL/base-path parser for
both the Playwright configuration and the suite.

Verified again with the representative `/blog` build, `CI=1 pnpm
test:e2e:static` (3 passed), `pnpm format:check`, `pnpm lint`, `pnpm exec tsc
--noEmit --incremental false`, `pnpm exec vitest run --coverage --no-cache`
(24 files / 186 tests), `pnpm audit --audit-level moderate`, and `CI=1 pnpm
test:e2e` (22 passed). Direct artifact inspection confirmed unique canonical
URLs for the homepage, archives, About, Post and Project Case details; no
canonical URL in `404.html`; and `/blog` prefixes in feed, sitemap, and robots.

### Follow-up: production-origin resources stay inside the static preview

Critical `image`, `script`, `stylesheet`, and `font` requests addressed to the
configured public origin are now intercepted and fulfilled from the matching
path on the local static preview server. The resource observer records both
local-preview and public-origin response events, so mapped HTTP 404 responses
and network failures enter the same release-gate failure checks without
contacting the production host.

The static suite includes a deterministic regression case for a production
absolute image: an existing artifact returns 200 with an image MIME type, while
a nonexistent artifact returns 404 and is recorded as a critical resource.
The fresh representative `/blog` build passed `CI=1 pnpm test:e2e:static`
(4 passed), formatting, lint, TypeScript, Vitest (24 files / 186 tests), and
the 22-test development-server Playwright suite.
