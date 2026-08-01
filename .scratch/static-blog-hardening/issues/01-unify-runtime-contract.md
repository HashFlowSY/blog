# Unify the runtime contract

Status: resolved

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

## Answer

- Kept `.nvmrc` on Node 24 and constrained `package.json` to the Node 24 major line (`24.x`), allowing security patch releases within that major.
- Kept pnpm pinned to `11.0.8` in package metadata, documentation, and every workflow setup step.
- Updated every GitHub Actions `setup-node` invocation to read `.nvmrc`, eliminating duplicated Node literals in CI and deployment.
- Updated README prerequisites to Node 24.x and pnpm 11.0.8, and removed the unsupported preview/`serve` instructions instead of adding a dependency.

Verification completed:

- `pnpm format:check`
- `pnpm tsc --noEmit`
- Repository search for stale runtime declarations
