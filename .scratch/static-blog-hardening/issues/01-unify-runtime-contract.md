# Unify the runtime contract

Status: ready-for-agent

## Goal

Make Node 24 and pnpm 11.0.8 the single runtime contract used locally, in documentation, and in automation.

## Scope

- Keep Node on major version 24 so security patches can advance.
- Keep pnpm pinned to 11.0.8.
- Align `.nvmrc`, `package.json`, README, CI, and deployment.
- Prefer GitHub Actions reading the checked-in Node version instead of repeating literals.
- Correct or remove README commands that have no matching package script.

## Acceptance Criteria

- Runtime declarations do not contradict each other.
- A fresh contributor can identify the supported versions from README and executable config.
- CI uses the same Node declaration as local development.
- No dependency is installed in this ticket.

## Verification

- Run formatting checks for edited documentation/configuration.
- Run TypeScript or package metadata validation where applicable.
- Search the repository for stale Node and pnpm version declarations.
