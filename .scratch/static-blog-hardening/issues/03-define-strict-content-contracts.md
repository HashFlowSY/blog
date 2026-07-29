# Define strict post and project contracts

Status: ready-for-agent
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
