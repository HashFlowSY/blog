# Normalize cover URL paths

Status: claimed

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

Pending implementation.

## Comments
