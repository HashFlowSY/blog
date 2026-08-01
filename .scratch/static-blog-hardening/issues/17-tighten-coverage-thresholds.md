# Tighten coverage thresholds

Status: ready-for-agent

## Goal

Protect the content and URL validation code with module-specific branch
coverage thresholds while retaining the existing global floor.

## Scope

- Keep global statements, branches, functions, and lines at 80%.
- Set branch thresholds of at least 85% for `content-catalog.ts` and
  `content-contracts.ts`.
- Set branch thresholds of at least 90% for `site.ts` and the new URL pathname
  module.
- Add behavior-focused tests before enabling thresholds.

## Acceptance Criteria

- Coverage thresholds are enforced by Vitest without assertion-only tests.

## Verification

- Run `pnpm test:coverage` after targeted test development.

## Answer

Pending implementation.

## Comments
