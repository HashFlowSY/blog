# Consolidate CI and deployment gates

Status: resolved
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

## Answer

- Added `.github/workflows/quality.yml` as the single reusable Quality Gate. It installs once with Node from `.nvmrc` and pnpm 11.0.8, then runs frozen install, lint, non-incremental TypeScript, coverage, `pnpm audit --audit-level moderate`, Chromium installation, and the current development-server E2E suite.
- `ci.yml` is now PR-only and invokes that gate once. `deploy.yml` is the only main-push/manual workflow and runs `deployment-config -> quality-gate -> build -> deploy`, so a main push has one authoritative quality run and neither build nor deploy runs after a failed, cancelled, or skipped gate.
- The deploy workflow retains the repository-derived Pages base path, required `NEXT_PUBLIC_SITE_URL` failure, build environment variables, non-empty-base-path asset check, Pages artifact upload, and Pages deployment. The isolated build job performs its own frozen install but no duplicate test suite.
- The reusable gate and its caller jobs have only `contents: read`. `pages: write` and `id-token: write` are limited to the deploy job. PR validation uses `ci-pr-<PR number>` with cancellation; Pages runs serialize under `pages-<repository>` without cancelling an active deployment. `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` remains set in the reusable gate and deploy workflow.
- E2E reports upload only when the E2E step fails, use caller-provided stable names (`ci-playwright-report` or `deploy-playwright-report`), retain for seven days, and cannot replace the original E2E failure.
- The earlier high-severity audit blocker was remediated by the separate, authorized `94dc920` security commit. This Issue keeps `pnpm audit --audit-level moderate` as an uncompromised hard gate and makes no dependency, lockfile, or pnpm-patch change. The audit now reports no known vulnerabilities.
- Local validation passed: `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm lint`, `pnpm exec tsc --noEmit --incremental false`, `pnpm exec vitest run --coverage --no-cache` (24 files, 186 tests), `pnpm audit --audit-level moderate`, `pnpm test:e2e` (22 tests), and `NODE_ENV=production NEXT_PUBLIC_SITE_URL=https://example.com BASE_PATH=/blog NEXT_PUBLIC_BASE_PATH=/blog pnpm build` after moving existing `.next` and `out` aside and restoring them. `git diff --check` passed.
- Prettier parsed the workflow YAML. No local `actionlint` was installed, and no GitHub Actions run was triggered, so reusable-workflow execution, artifact upload, concurrency, and Pages deployment are statically reviewed but await a remote run.

## Comments

- 2026-07-30: Validation stopped at `pnpm audit --audit-level moderate`. The command exited 0 after one retryable registry `ECONNRESET`, but reported `1 vulnerabilities found` at high severity (`1 ignored`). The existing `pnpm-workspace.yaml` suppresses `GHSA-mh99-v99m-4gvg`; the lockfile still resolves `minimatch@3.1.5` to `brace-expansion@1.1.16`. This is CVE-2026-14257, a high-severity brace-expansion denial of service affecting versions through 5.0.7. Per this issue's stop rule, the audit result is not accepted as a passing gate. No dependency, lockfile, or audit suppression was changed.
