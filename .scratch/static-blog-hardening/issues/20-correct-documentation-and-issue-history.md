# Correct documentation and Issue history

Status: resolved

## Goal

Remove unimplemented social metadata claims and correct hardening tracker
history without expanding product scope.

## Scope

- Remove unsupported OG/Twitter statements from README and `personal-blog.md`.
- State that canonical URLs, RSS, and sitemap URLs are written at build time and
  require rebuilding for each final origin/base path.
- Move Issue 12 comments to the final second-level section without changing its
  historical text.
- Do not implement OG/Twitter metadata or create visual baselines.

## Acceptance Criteria

- Documentation matches the executable static build behavior.
- Issue 12 retains its complete comment history and ends with `## Comments`.

## Verification

- Run formatting checks and inspect documentation/Issue diffs.

## Answer

Removed unsupported OG/Twitter metadata claims from README and the public
Personal Blog Project Case. Both now state that canonical URLs, RSS URLs, and
sitemap URLs are written during the build and require a rebuild for each final
origin/base-path deployment target. Issue 12's existing Comments section was
moved unchanged to the final second-level section.

Fresh verification passed: `pnpm format:check`, `pnpm lint`,
`pnpm exec tsc --noEmit --incremental false`, `pnpm test:coverage` (208 tests),
`pnpm audit --audit-level moderate`, the production `/blog` build, static E2E
(39 passed), and `git diff --check`. The final review against
`origin/main...HEAD` found zero Standards findings and zero Spec findings.
Darwin skips four Linux-only visual comparisons; GitHub Actions/Linux remains
the required remote verification for those checks.

## Comments

### Accepted final-review exception

A later review identified `normalizeRootRelativePathname` as a production
export whose only external consumer is its focused unit test. The maintainer
explicitly accepted this P3 judgement item on 2026-08-01. It has no observed
runtime effect, does not block delivery, and will remain unchanged unless a
future refactor provides a concrete reason to revisit the boundary.
