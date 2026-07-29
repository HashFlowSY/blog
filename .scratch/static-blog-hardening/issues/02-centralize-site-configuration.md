# Centralize site configuration and URL validation

Status: ready-for-agent
Blocked by: 01

## Goal

Create one validated source for public site identity, GitHub contact, origin, and base path.

## Scope

- Use the existing `https://github.com/HashFlowSY` profile as the only contact channel.
- Remove duplicated contact literals from components.
- Validate release origins and base paths according to the specification.
- Compose canonical, RSS, sitemap, robots, and asset URLs with URL-aware helpers.
- Delete the test that treats a path without a leading slash as a valid malformed URL.

## Acceptance Criteria

- Placeholder email addresses and replacement notes no longer render.
- Release configuration rejects origins with a path, query, hash, trailing slash, non-HTTPS scheme, or invalid base path.
- HTTP localhost remains valid for local development.
- URL tests cover root and `/blog` deployments without double prefixes or double slashes.

## Verification

- Run the site configuration unit tests.
- Run repository searches for `hello@example.com`, placeholder contact copy, and direct GitHub contact literals.
- Run lint and typecheck.
