# Share static E2E page access

Status: resolved

## Goal

Centralize the common static-artifact page access contract used by artifact,
accessibility, and visual E2E tests.

## Scope

- Share route-path generation, navigation without a response, expected status,
  network-idle waiting, and final pathname checks.
- Migrate static-artifact, a11y, and visual suites to the helper.
- Keep each suite responsible for its own title, axe, animation, image/font,
  and screenshot stabilization assertions.

## Acceptance Criteria

- WebKit remains a compact smoke suite.
- The helper does not broaden the visual matrix or generate new baselines.

## Verification

- Run focused static E2E projects and the final full static suite.

## Answer

Added `visitStaticPage`, a shared static-artifact navigation helper that owns
base-path route composition, null navigation responses, expected HTTP status,
network-idle waiting, and final pathname checks. Static-artifact, accessibility,
and visual suites use it for normal and 404 document navigation; their title,
axe, animation, font/image, and screenshot concerns remain local to each
suite. WebKit smoke was not expanded.

Verified after the representative `/blog` build with `CI=1
pnpm test:e2e:static`: 39 tests passed. Four Linux-only visual comparisons were
skipped on Darwin and are not recorded as locally verified.

## Comments
