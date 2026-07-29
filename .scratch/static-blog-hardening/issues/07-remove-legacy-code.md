# Remove unreachable legacy code

Status: ready-for-agent
Blocked by: 05, 06

## Goal

Remove historical abstractions and tests that no longer belong to the Chinese-only static site.

## Scope

- Remove locale parameters, locale fields, and per-locale loader caches with no production meaning.
- Remove unused exports after replacing their consumers with the Content Catalog.
- Remove the unused `ProjectBoard` component and its isolated tests.
- Remove stale i18n, script, and nonexistent-path coverage exclusions.
- Recheck production reachability before deleting each target.

## Acceptance Criteria

- Production code contains no speculative multilingual surface.
- Every retained exported content API has a production consumer or a documented public purpose.
- Coverage no longer benefits from tests of production-unreachable components.
- Global coverage still satisfies the accepted 80% thresholds.

## Verification

- Search for locale and removed symbol references.
- Run the complete unit test suite with coverage.
- Run lint and typecheck.
