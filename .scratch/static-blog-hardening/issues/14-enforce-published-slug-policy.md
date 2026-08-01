# Enforce published slug policy

Status: resolved

## Goal

Preserve the two already-published date-only Post URLs while preventing new
published content from claiming date-only slugs.

## Scope

- Grandfather only `/posts/2026-04-30/` and `/posts/2026-05-02/`.
- Reject other pure `YYYY-MM-DD` slugs for published Posts and all Project Cases.
- Permit descriptive date-prefixed slugs.
- Update ADR 0003 with published-content and migration rules.

## Acceptance Criteria

- Existing published URLs remain unchanged.
- Drafts may omit publication fields and do not trigger this published policy.
- Contract tests cover grandfather, rejected new date-only slugs, and allowed
  descriptive date prefixes.

## Verification

- Run the targeted content-contract and content-catalog unit tests.

## Answer

Added a published-only grandfather allowlist for the two existing date-only
Post slugs. Drafts and Project Cases now reject date-only slugs, while
descriptive date-prefixed slugs remain valid. ADR 0003 now defines the
published-content scope, draft behavior, and the verified redirect/static alias
migration requirement.

Verified with `pnpm exec vitest run src/lib/content-contracts.spec.ts` (24
tests passed).

## Comments
