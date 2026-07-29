# Rewrite E2E around stable invariants

Status: ready-for-agent
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
