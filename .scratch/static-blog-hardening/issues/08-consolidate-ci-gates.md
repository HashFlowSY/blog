# Consolidate CI and deployment gates

Status: ready-for-agent
Blocked by: 01, 02, 07

## Goal

Make PR validation and main deployment use one authoritative definition of quality.

## Scope

- Extract or restructure shared quality jobs so lint, typecheck, unit coverage, audit, and prerequisite checks are declared once.
- Preserve `pnpm audit --audit-level moderate` as a hard gate.
- Prevent deployment from starting until the shared gate succeeds.
- Avoid repeating dependency installation and the same test suite unnecessarily on one main-branch push.
- Preserve useful failure artifacts.

## Acceptance Criteria

- PRs and main use the same quality commands and versions.
- Main does not independently execute two divergent copies of the quality gate.
- Moderate and higher audit findings still block deployment.
- Workflow concurrency and permissions remain least-privileged for each job.

## Verification

- Validate workflow syntax.
- Review triggers, dependencies, permissions, environment propagation, and artifact names.
- Run the same commands locally where the environment permits.
