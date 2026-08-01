# Use explicit stable slugs

Every published Post and Project Case declares an explicit slug that is unique
within its own content collection and uses a stable lowercase kebab-case URL
format. Drafts may omit publication fields, including `slug`; any slug they do
provide must still satisfy the content contract.

A date may appear as a descriptive prefix, such as
`2026-06-01-release-notes`, but cannot be the entire slug. The only exceptions
are the already-published Post slugs `2026-04-30` and `2026-05-02`, which are
an exact grandfathered allowlist. No Draft, new Post, or Project Case may claim
another date-only `YYYY-MM-DD` slug.

Filenames are only for local organization and never implicitly determine public
URLs. Published slugs are stable public identifiers: do not change one unless a
permanent redirect or static alias page has been verified. Without a verified
permanent redirect or static alias page, a published slug must remain unchanged.
