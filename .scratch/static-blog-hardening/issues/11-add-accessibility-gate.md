# Add accessibility enforcement

Status: ready-for-agent
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
