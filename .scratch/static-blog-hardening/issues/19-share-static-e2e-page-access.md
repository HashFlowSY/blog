# Share static E2E page access

Status: ready-for-agent

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

Pending implementation.

## Comments
