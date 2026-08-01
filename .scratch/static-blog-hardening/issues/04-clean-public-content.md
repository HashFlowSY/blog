# Remove public template cases and placeholder content

Status: resolved

## Goal

Make the checked-in content comply with the accepted public boundary before the Content Catalog makes validation atomic.

## Scope

- Consolidate the two fictional project cases into one neutral authoring template outside scanned content directories.
- Remove the two fictional public project Markdown files.
- Remove template-specific project statistics, labels, notices, and branches.
- Update the remaining real project and posts to satisfy explicit field contracts.
- Remove email CTAs and placeholder replacement text.
- Keep only the centralized GitHub contact.

## Acceptance Criteria

- Only real project cases are discoverable under public project content.
- The authoring template contains prompts or placeholders, not invented outcomes presented as facts.
- No production UI contains a public template branch.
- All current published content satisfies the strict contract.

## Verification

- Run content contract tests.
- Search for the removed template titles, `template`, placeholder result strings, placeholder email, and replacement notes.
- Run affected component and route tests.

## Answer

Deleted the public fictional Project Cases
`content/projects/zh-CN/ai-knowledge-workbench.md` and
`content/projects/zh-CN/automation-delivery-console.md`. Their reusable
authoring structure now lives in the non-public
`templates/project-case.md`, which defaults to `draft: true` and contains only
fact-finding prompts for background, role, constraints, solution, decisions,
validation, evidence, and retrospective.

Removed `template: false` from `personal-blog` without changing its slug.
Removed the public `template` field, its schema default, template-only UI
branches, labels, statistics, notice, replacement text, placeholder result
fallbacks, and associated assertions. The remaining project data presents
only neutral Project Case copy and the remaining project's supplied facts.

Verified:

- `pnpm exec vitest run src/lib/content-contracts.spec.ts src/lib/projects.spec.ts src/components/project/project-card.spec.tsx --reporter=verbose` — 42 passed
- Strict contract test directly parses the checked-in Posts and Project Cases with no errors.
- `pnpm exec playwright test e2e/search.spec.ts --project=chromium` — 2 passed
- `pnpm test` — 25 files, 279 tests passed
- `pnpm lint`, `pnpm exec tsc --noEmit`, and Prettier checks passed
- `NEXT_PUBLIC_SITE_URL=https://example.com BASE_PATH=/blog NEXT_PUBLIC_BASE_PATH=/blog pnpm build` passed and generated only the `personal-blog` project route.
- Source, public content, and static-artifact searches found no deleted case titles/slugs, public template labels or branches, replacement notes, placeholder email, or `mailto:` CTA.
