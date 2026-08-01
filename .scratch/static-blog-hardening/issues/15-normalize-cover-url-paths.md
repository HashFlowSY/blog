# Normalize cover URL paths

Status: resolved

## Goal

Validate Project Case cover references as canonical public URL pathnames before
mapping them safely to files in `public/`.

## Scope

- Extract a side-effect-free URL pathname module shared by content contracts and
  site URL construction.
- Reject query strings, fragments, encoded separators, non-canonical inputs,
  traversal encodings, and malformed percent encodings.
- Keep public-directory containment, realpath, symlink, and file checks.

## Acceptance Criteria

- URL decoding occurs before filesystem mapping.
- A literal `%2e%2e` directory cannot bypass validation.
- Tests cover encoded dot segments, encoded separators, and invalid percent
  encodings.

## Verification

- Run targeted URL-path, content-contract, and site unit tests.

## Answer

Added a side-effect-free URL path module shared by content contracts and site
URL composition. Cover values now must be canonical root-relative WHATWG URL
pathnames without query strings or fragments; they are decoded before file
mapping, then still pass containment, realpath, symlink, and file checks.
Encoded separators, malformed percent encodings, encoded dot traversal, and a
literal `%2e%2e` directory reached through `%25` encoding are rejected.

Verified with `pnpm exec vitest run src/lib/url-path.spec.ts
src/lib/content-contracts.spec.ts src/lib/site.spec.ts` (69 tests passed).

## Comments
