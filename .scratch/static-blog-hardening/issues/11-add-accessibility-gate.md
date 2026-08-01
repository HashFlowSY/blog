# Add accessibility enforcement

Status: resolved
Blocked by: 09, 10

## Goal

Detect serious accessibility regressions in generated pages while retaining tests for keyboard behavior automation cannot infer.

## Scope

- Add an established Playwright-compatible accessibility scanner.
- Scan home, post list/detail, project list/detail, and 404 pages.
- Fail on serious violations according to an explicitly documented threshold.
- Keep or add targeted keyboard focus, menu, skip-link, and copy-control tests.
- Document any narrowly justified suppressions close to the affected rule.

## Dependency Approval

Stop and request explicit user approval before installing the accessibility package or changing the lockfile.

## Acceptance Criteria

- Representative static pages are scanned in Chromium.
- Serious violations fail the release gate.
- Suppressions cannot silently apply site-wide without rationale.
- Keyboard-critical interactions remain independently tested.

## Verification

- Run the accessibility project against the static artifact.
- Run existing component and E2E accessibility tests.
- Run lint and typecheck.

## Answer

Installed and pinned `@axe-core/playwright@4.12.1` as a dev dependency. The
lockfile records the matching `axe-core@4.12.1` package and the existing
`playwright-core@1.59.1` peer without adding unrelated dependencies.

Added the Chromium-only `chromium-a11y` project. It matches only
`e2e/a11y.spec.ts`, writes failures under
`test-results/static-artifact/chromium-a11y/`, and is included by
`pnpm test:e2e:static`; the ordinary Chromium project ignores that spec and
WebKit remains smoke-only. The scan covers the home page, post list, stable
post fixture `2026-04-30`, project list, stable real project fixture
`personal-blog`, and the generated 404 document. The 404 test verifies HTTP 404
and byte-for-byte equality with `out/404.html` before scanning. Every scan uses
the one `/blog` static preview of the current `out/` build.

The gate keeps axe's full rule set and fails only when a violation has
`serious` or `critical` impact. Failure output includes the rule id, impact,
help text and URL, and every matched DOM target. No rule is excluded or
disabled, and no suppression was added. README documents the threshold,
commands, scan pages, output directories, and the required page-local policy
for any future narrowly justified suppression.

Retained and strengthened keyboard coverage: the skip link becomes visible on
Tab and moves focus to `main#content` on Enter; the mobile menu opens from the
keyboard and Escape closes it while returning focus to the menu button; a
navigation link is activated with Enter; and the existing isolated copy-control
fixture verifies Tab plus both Enter and Space produce clipboard feedback.
`main#content` is explicitly focusable for the skip-link target. The public
content was not changed to add a code block.

The first scan found real `color-contrast` serious violations in shared muted
text styles. Those foreground colors were darkened to meet the gate across the
home, archive, and detail pages; no threshold reduction was used.

Verified against the representative production artifact:

- `NODE_ENV=production NEXT_PUBLIC_SITE_URL=https://example.com BASE_PATH=/blog NEXT_PUBLIC_BASE_PATH=/blog pnpm build`
- `CI=1 pnpm test:e2e:static:a11y` — 10 passed
- `CI=1 pnpm test:e2e:static` — 39 passed
- `CI=1 pnpm test:e2e` — 21 passed
- `pnpm test` — 24 files, 188 tests passed
- `pnpm audit --audit-level moderate` — no known vulnerabilities
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm format:check`
- `git diff --check`

## Comments

### Follow-up: centralize accessibility text tokens

Extracted the repeated light-page contrast colors into semantic `:root`
variables (`--site-text-muted`, `--site-text-secondary`,
`--site-text-index`, `--site-text-accent`, and `--site-text-timeline`). The
resolved color values and selector behavior are unchanged, so future contrast
adjustments have one definition per text role.

Re-verified with the representative `/blog` build, `CI=1
pnpm test:e2e:static:a11y` (10 passed), `CI=1 pnpm test:e2e:static` (39 passed),
`pnpm test` (24 files, 188 tests), lint, non-incremental TypeScript,
`pnpm format:check`, and `git diff --check`.
