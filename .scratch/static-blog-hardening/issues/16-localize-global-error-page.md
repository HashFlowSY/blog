# Localize the global error page

Status: resolved

## Goal

Make the global error boundary Chinese-only and ensure its home action remains
inside the application for root and `/blog` deployments.

## Scope

- Localize `lang`, title, description, and actions.
- Retain error logging and retry behavior.
- Use a correct-href link for the home action rather than a hard-coded client
  redirect.
- Add component coverage and remove the stale coverage exclusion.

## Acceptance Criteria

- The link resolves through the production base-path URL interface.
- The component tests cover localized content, logging, retry, and the home
  href.

## Verification

- Run the global-error component test and targeted coverage run.

## Answer

Localized the global error document, title, description, retry action, and
home action to Chinese. The error is still logged and retry still calls
`unstable_retry`. The home action is now a plain anchor whose href comes from
`siteUrl("/")`, so root and `/blog` deployments navigate inside the generated
application without relying on client routing. The stale Vitest coverage
exclusion was removed.

Verified with `pnpm exec vitest run src/app/global-error.spec.tsx` (4 tests
passed).

## Comments
