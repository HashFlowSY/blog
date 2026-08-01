# Remove test-only production exports

Status: ready-for-agent

## Goal

Eliminate public exports retained only for tests without changing production
interfaces or related-reading behavior.

## Scope

- Remove `BASE_URL` and update tests to use `SITE_ORIGIN` and `siteUrl()`.
- Remove `selectRelatedPosts` and test through `selectRelatedReading()`.
- Inspect the two affected modules for equivalent test-only exports without
  expanding into a repository-wide refactor.

## Acceptance Criteria

- Production consumers retain their existing interfaces and behavior.

## Verification

- Run the affected site and post-detail component tests.

## Answer

Pending implementation.

## Comments
