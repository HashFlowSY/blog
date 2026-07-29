# Define strict post and project contracts

Status: resolved
Blocked by: 02

## Goal

Express separate strict contracts for drafts and published entries without silently applying publication defaults.

## Scope

- Implement the post and project field rules in the specification.
- Reject unknown keys and wrong types for drafts and published entries.
- Validate real calendar dates and `updated >= date`.
- Require stable collection-scoped slugs and normalized unique tags.
- Remove post `cover` and public project `template`.
- Validate project cover paths and optional HTTPS external links.
- Represent validation errors as structured data suitable for aggregation.

## Acceptance Criteria

- Missing publication fields fail only published entries.
- Incomplete drafts remain loadable when their provided fields are valid.
- Omitting `draft`, `featured`, or other required state flags cannot silently select a public state.
- Schema tests cover unknown keys, invalid dates, duplicate/blank tags, invalid slugs, missing body, missing covers, and unsafe URLs.

## Verification

- Run focused schema tests.
- Run typecheck.
- Confirm current real content can be migrated without weakening the contract.

## Answer

Implemented `src/lib/content-contracts.ts` as an independent strict contract
module for Post and Project Case content. It separates explicit drafts from
published entries, rejects unknown frontmatter keys and publication defaults,
validates real calendar dates, normalized tags, stable slugs, Markdown bodies,
HTTPS URLs, covers under `public/`, and collection-scoped duplicate slugs.
Batch APIs return every valid entry plus structured `{ filePath, field, reason
}` errors for later Content Catalog aggregation. The legacy loader remains
unchanged because current template content is owned by issue 04.

Added 18 focused contract tests in `src/lib/content-contracts.spec.ts`,
including drafts, missing states, types, dates, tags, slugs, bodies, covers,
URLs, unknown fields, `cover`/`template` rejection, and duplicate slugs.

Verified successfully:

- `pnpm exec vitest run src/lib/content-contracts.spec.ts --reporter=verbose`
  — 18 passed
- `pnpm test` — 25 files and 279 tests passed
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm exec prettier --check src/lib/content-contracts.ts src/lib/content-contracts.spec.ts .scratch/static-blog-hardening/issues/03-define-strict-content-contracts.md`
- `git diff --check`

Migration check: both current Posts already meet the new Post fields. The real
`personal-blog` Project Case becomes valid after issue 04 removes its legacy
`template: false`; the two fictional Project Cases are the issue 04 removal or
migration targets. No contract rule needs to be weakened.
