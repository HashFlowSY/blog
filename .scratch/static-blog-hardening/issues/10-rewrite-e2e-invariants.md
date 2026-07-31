# Rewrite E2E around stable invariants

Status: resolved
Blocked by: 09

## Goal

Make browser tests survive legitimate content additions while detecting failures in public behavior.

## Scope

- Remove assertions tied to exact current counts, ordering, or first-entry identity.
- Use dedicated fixtures only where a fixed relationship is necessary.
- Run the complete artifact suite in Chromium.
- Add a WebKit smoke project for home, primary navigation, one post, one real project, and mobile navigation/layout.
- Strengthen 404 assertions to check the intended 404 document and content rather than only the absence of a post title.

## Acceptance Criteria

- Adding a valid post does not break unrelated homepage tests.
- Reordering project dates does not change which detail test is exercised accidentally.
- Chromium covers full behavior and WebKit covers the accepted smoke set.
- Playwright failure artifacts identify browser and project.

## Verification

- Run Chromium and WebKit suites against the same static artifact.
- Add a temporary valid fixture in a test workspace to prove count independence.
- Run lint and typecheck.

## Answer

- Rewrote the existing E2E around semantic roles, stable visible copy, and the
  explicit published slugs `2026-04-30` and `personal-blog`. Archive tests no
  longer depend on exact article/project counts, date order, or whichever entry
  happens to be first. Navigation helpers now resolve routes relative to the
  configured base URL, so the same behavior tests run against development and
  static servers.
- Expanded the static config into two clearly separated projects: `chromium`
  runs the complete 27-test suite (including the artifact checks and isolated
  fixture test), while `webkit` runs only the three-test smoke file. Failure
  screenshots and traces are separated under
  `test-results/static-artifact/chromium/` and
  `test-results/static-artifact/webkit/`; the HTML report is written to
  `playwright-static-report/`.
- Added `e2e/fixture-independence.spec.ts`. It copies the project into a
  temporary workspace, injects a valid post, builds and serves that workspace,
  verifies the home page, primary navigation, stable post, and real Project
  Case behavior, and removes the workspace in `finally`. The checked-in
  content directory is never modified.
- Strengthened static 404 checks to compare the response body byte-for-byte
  with `out/404.html`, assert HTTP 404, expected heading/body marker, noindex,
  no canonical, absent post/project detail content, and `/blog`-prefixed
  resources/links. CI now explicitly installs Chromium and WebKit for the
  static gate. `playwright-static-report/**` is ignored by ESLint.

Verified in this run against the one representative `/blog` artifact built
with `NODE_ENV=production NEXT_PUBLIC_SITE_URL=https://example.com
BASE_PATH=/blog NEXT_PUBLIC_BASE_PATH=/blog pnpm build`:

- `CI=1 pnpm test:e2e:static` — 30 passed (Chromium full 27, WebKit smoke 3)
  using the same static server and existing `out/`.
- `CI=1 pnpm test:e2e:static:webkit` — 3 passed.
- `CI=1 pnpm test:e2e` — 22 passed.
- `pnpm test` — 24 files, 186 tests passed.
- `pnpm lint`, `pnpm exec tsc --noEmit --incremental false`,
  `pnpm exec prettier --check .`, and `git diff --check` passed.
- `--project=chromium --list` reports 27 tests and `--project=webkit --list`
  reports only the three smoke tests.
