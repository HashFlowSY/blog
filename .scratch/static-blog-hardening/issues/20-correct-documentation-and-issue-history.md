# Correct documentation and Issue history

Status: ready-for-agent

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

Pending implementation.

## Comments
