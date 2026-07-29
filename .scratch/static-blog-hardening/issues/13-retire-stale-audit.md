# Retire the stale site audit and complete verification

Status: ready-for-agent
Blocked by: 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12

## Goal

Remove obsolete audit material only after current actionable findings are represented in the tracker and the hardening effort is verified end to end.

## Scope

- Confirm still-valid product findings have tracker coverage.
- Remove root `site-audit.md`.
- Remove its disposable ignored screenshot evidence after resolving exact paths.
- Update README to describe current content, runtime, preview, tests, and deployment behavior.
- Verify ADR and glossary language against the final implementation.
- Close or update the hardening map.

## Acceptance Criteria

- No stale audit is presented as current repository truth.
- The valid “add more real project evidence” finding remains tracked as a human-owned follow-up.
- README commands exist and match the release harness.
- All hardening acceptance criteria are verified.
- The final worktree contains no accidental caches or generated reports.

## Verification

- Run formatting, lint, typecheck, unit coverage, audit, production build, Chromium, WebKit smoke, accessibility, and visual regression.
- Inspect `git status` and review every deletion.
- Append final results to this ticket and mark the map complete.
