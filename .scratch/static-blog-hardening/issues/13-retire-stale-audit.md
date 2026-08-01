# Retire the stale site audit and complete verification

Status: resolved
Blocked by: 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12

## Goal

Remove obsolete audit material only after current actionable findings are represented in the tracker and the hardening effort is verified end to end.

## Scope

- Confirm still-valid product findings have tracker coverage.
- Remove root `site-audit.md`.
- Remove its disposable ignored screenshot evidence after resolving exact paths.
- Update README to describe current content, runtime, preview, tests, and deployment behavior.
- Verify ADR and glossary language against the final implementation.
- Close or update the hardening map.

## Acceptance Criteria

- No stale audit is presented as current repository truth.
- The valid “add more real project evidence” finding remains tracked as a human-owned follow-up.
- README commands exist and match the release harness.
- All hardening acceptance criteria are verified.
- The final worktree contains no accidental caches or generated reports.

## Verification

- Run formatting, lint, typecheck, unit coverage, audit, production build, Chromium, WebKit smoke, accessibility, and visual regression.
- Inspect `git status` and review every deletion.
- Append final results to this ticket and mark the map complete.

## Answer

### Audit retirement

- Deleted the obsolete tracked root report `site-audit.md`.
- Deleted only the seven ignored screenshots explicitly referenced by that
  report: `audit-evidence/01-home.jpg`, `02-projects.jpg`,
  `03-project-detail.jpg`, `04-posts.jpg`, `05-post-detail.jpg`,
  `06-about.jpg`, and `07-about-mobile.jpg`. They were all untracked JPEGs
  matched by the removed `/audit-evidence/**/*.jpg` ignore rule; the empty
  `audit-evidence/` directory was then removed.
- Removed only the two audit-specific `.gitignore` patterns for
  `audit-evidence` JPG and PNG files. The unrelated `qa-evidence/` and
  `implementation-homepage-*.png` patterns remain.
- Repository-wide reference checks confirmed that no production or test code
  used the retired report or screenshots. The remaining `site-audit.md`
  references are this retirement ticket and the migrated follow-up below.

### Current findings and documentation

- The still-valid finding is that one self-referential Project Case is not
  enough real project evidence. It remains owned by
  `.scratch/site-experience/issues/01-add-real-project-evidence.md`, whose
  status is `ready-for-human`; no duplicate issue was created.
- The other audit conclusions describe superseded implementation or an
  accepted product boundary: Project Cases now require and display role,
  duration, result, and cover information; the About page uses the current
  professional profile; writing topics are informational rather than filters;
  and GitHub is the accepted single public contact channel.
- README now matches the Node 24 / pnpm 11.0.8 contract, strict Post and
  Project Case contracts, Template Case and Draft terminology, production
  build requirements, static preview behavior, executable test commands, and
  the GitHub Pages quality/deployment sequence.
- `CONTEXT.md` and ADRs 0001-0005 already use the final Post, Project Case,
  Template Case, and Draft meanings. No conflicting ADR or context change was
  needed.

### Verification

| Command                                                                                                               | Actual result                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm format:check`                                                                                                   | Passed in the final gate after formatting the changed README and Issue Markdown with the repository Prettier.                                                                      |
| `pnpm lint`                                                                                                           | Passed.                                                                                                                                                                            |
| `pnpm exec tsc --noEmit --incremental false`                                                                          | Passed.                                                                                                                                                                            |
| `pnpm test:coverage`                                                                                                  | Passed: 24 test files and 188 tests; global coverage was 93.19% statements, 82.19% branches, 97.15% functions, and 95.00% lines.                                                   |
| `pnpm audit --audit-level moderate`                                                                                   | Passed: no known vulnerabilities.                                                                                                                                                  |
| `NODE_ENV=production NEXT_PUBLIC_SITE_URL=https://example.com BASE_PATH=/blog NEXT_PUBLIC_BASE_PATH=/blog pnpm build` | Passed and generated the 12 static routes under the representative `/blog` configuration.                                                                                          |
| `CI=1 pnpm test:e2e:static`                                                                                           | Passed: 39 tests passed. The four Linux-only visual tests were explicitly skipped on Darwin; ordinary static Chromium, `chromium-a11y`, and the reduced WebKit smoke suite passed. |

### Linux visual verification

Visual comparisons ran in the already-local
`mcr.microsoft.com/playwright:v1.59.1-noble` image with
`--pull=never --platform linux/amd64 --network none`. The container reported
`Linux` and `x86_64`, used Node 24.14.1, Playwright 1.59.1, and a read-only
pnpm 11.0.8/store copied into an anonymous `--rm` work volume. Its frozen,
offline install used 594 packages with zero downloads and no lifecycle scripts.

The just-built representative `out/` artifact was mounted read-only into that
Linux workspace for browser rendering. `CI=1 pnpm test:e2e:static:visual`
passed all four strict Linux Chromium comparisons twice (4 passed in 15.5s,
then 4 passed in 14.9s), then once more after the final full-gate rebuild (4
passed in 15.3s). No Darwin or ARM baseline was generated or accepted, and the
anonymous container and its generated reports were removed.

An independent Linux `next build` was intentionally not claimed: the offline
cache lacks `@next/swc-linux-x64-gnu`, so Next correctly stopped before a
network download. The required representative production build above passed
on the current host; the Linux result records the browser visual verification
only.

### Follow-up production-build documentation correction

A post-resolution review found that the generic README build command could
inherit the `http://localhost:3000` development value from `.env.local`.
Issue 13 was reopened and claimed to correct that inconsistency. The Build
section now states that localhost is for `pnpm dev` only and provides the
explicit HTTPS production command that overrides the local values.

`pnpm format:check` passed after this correction.
A temporary `.env.local` exactly matching the documented localhost development
configuration was added only for this verification and then removed.
`NODE_ENV=production NEXT_PUBLIC_SITE_URL=https://example.com BASE_PATH=
NEXT_PUBLIC_BASE_PATH= pnpm build` passed while Next loaded both `.env.local`
and `.env`, generating all 12 static routes. This proves that the documented
HTTPS values override the localhost development setting and is the root-path
counterpart to the existing `/blog` GitHub Pages representative build command
above.

### Final hygiene

The host-generated `coverage/`, `out/`, `.next/`,
`playwright-static-report/`, and `test-results/static-artifact/` directories
were removed after verification. A final inventory also found only ignored,
untracked Playwright report metadata in `playwright-report/` and `test-results/`;
both exact directories were removed after confirming they contained no tracked
files. The generated `next-env.d.ts` declaration and `tsconfig.tsbuildinfo`
incremental cache were also removed after confirming that neither was tracked.

`git diff --check` passed. Final `git status --short` contained only the
intended `.gitignore`, README, Issue 13, and hardening map updates plus the
`site-audit.md` deletion; it contained no generated artifacts.
