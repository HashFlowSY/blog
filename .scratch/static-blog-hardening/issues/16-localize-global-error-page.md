# Localize the global error page

Status: claimed

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

Pending implementation.

## Comments
