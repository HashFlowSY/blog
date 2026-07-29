# Static Blog Reliability Hardening

Status: accepted

## Goal

Make the Chinese-only GitHub Pages site fail closed on invalid content and prove the exact static artifact that will be deployed. Remove historical abstractions and tests that increase apparent coverage without increasing production confidence.

## Context

The repository has accumulated assumptions from several iterations and agent harnesses:

- Unit tests and development-server E2E pass, but the deployable `out/` artifact is not exercised as the release truth.
- Invalid frontmatter is warned about and silently skipped.
- Content-wide invariants such as unique slugs and valid local assets are not enforced.
- Multilingual interfaces, unused exports, unused components, and stale test exclusions remain after the site became Chinese-only.
- CI and deployment repeat similar quality gates in separate workflows.
- Public pages contain placeholder contact information and two fictional project cases.

Relevant accepted decisions are recorded in `CONTEXT.md` and ADRs 0001–0005.

## Product Boundary

- Public language: Chinese only for at least the next 12 months.
- Delivery target: a static export deployed to GitHub Pages.
- Public project cases: real work only.
- Public contact channel: the existing HashFlowSY GitHub profile only.
- Out of scope: multilingual routing, server deployment, speculative deployment adapters, and public fictional project cases.

## Content Contract

### Published post

A published post must provide:

- non-empty `title`;
- explicit `slug`;
- valid `date`;
- at least one valid `tag`;
- non-empty `summary`;
- explicit `draft: false`;
- non-empty Markdown body.

`updated` is optional. When present, it must be a valid date and must not be earlier than `date`.

The unused post `cover` field is removed.

### Published project case

A published project case must provide:

- non-empty `title`;
- explicit `slug`;
- valid `date`;
- at least one valid `tag`;
- non-empty `description`;
- valid local `cover`;
- non-empty `role`;
- non-empty `duration`;
- non-empty `result`;
- explicit `featured`;
- explicit `draft: false`;
- non-empty Markdown body.

`source` and `demo` remain optional. When present, each must be an absolute HTTPS URL.

The public `template` state is removed because template cases are not public project evidence.

### Drafts

Drafts must explicitly declare `draft: true`. They may omit publication fields and body content, but:

- YAML must parse;
- unknown fields are rejected;
- every provided field must have the correct type and format.

### Shared invariants

- Schemas reject unknown frontmatter keys.
- A slug matches `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
- Slugs are unique within their own collection.
- Filenames never implicitly determine public URLs.
- Published slugs are treated as stable public identifiers.
- Dates use valid `YYYY-MM-DD` calendar values, not merely matching strings.
- Tags are trimmed, non-empty, and unique after trimming; display case is preserved.
- A project cover uses a root-relative path that resolves inside `public/` and exists.
- Validation scans every file, reports all errors with file path, field, and reason, and then fails the build.
- No published entry is silently skipped.

## Content Architecture

Create one atomic Content Catalog for each build:

1. Discover posts and project cases.
2. Parse frontmatter and body.
3. Apply draft or published contracts.
4. Validate cross-file invariants and referenced local assets.
5. Render Markdown into a structured result.
6. Index valid entries by slug.
7. Expose the same immutable snapshot to pages, static params, RSS, sitemap, and metadata.

The result is all-or-nothing. Development rebuilds the catalog when content changes instead of holding stale module-global data.

Markdown rendering returns structured data such as HTML and headings from the same syntax tree. Consumers must not parse serialized HTML with regular expressions to reconstruct headings or remove a duplicate title.

## Content and Legacy Cleanup

- Consolidate the two fictional project files into one neutral authoring template outside directories scanned by the Content Catalog.
- Remove the two fictional public project files.
- Remove public UI branches and statistics for template projects.
- Remove multilingual parameters, locale loader caches, and locale fields that have no public meaning.
- Remove unused production exports and components, including `ProjectBoard`, `getAllPosts`, and `getAdjacentPosts`, after confirming no production references remain.
- Remove stale i18n and script paths from coverage configuration.
- Centralize public site identity and GitHub contact information.
- Remove all `hello@example.com`, “later replace this”, and similar placeholder copy.
- Replace string-concatenated URL construction with validated URL composition.

## Runtime and URL Contract

- Node.js major version: 24.
- pnpm version: exactly 11.0.8.
- `.nvmrc`, `package.json`, README, and GitHub Actions use one authoritative runtime declaration.
- `NEXT_PUBLIC_SITE_URL` is an HTTPS origin only: no path, query, hash, or trailing slash.
- Local development may use an HTTP localhost origin.
- `BASE_PATH` is empty or a normalized root-relative path without a trailing slash.
- Repository paths belong in `BASE_PATH`, never in `NEXT_PUBLIC_SITE_URL`.

## CI and Release Contract

- PR validation and main-branch deployment call one authoritative quality gate.
- The existing `pnpm audit --audit-level moderate` policy remains a hard release gate.
- The release build uses representative deployment values, including a non-empty `/blog` base path.
- The generated `out/` site is served by a static server and tested before upload.
- Development-server E2E remains available for fast feedback but cannot satisfy the release gate.

### Static artifact checks

The full Chromium suite verifies:

- all main routes and navigation;
- post and real project detail routes;
- base-path-prefixed scripts, styles, images, and links;
- custom 404 content and generated `404.html`;
- canonical URLs and page metadata;
- RSS and sitemap URLs;
- responsive navigation and client enhancements;
- absence of placeholder contact content.

A smaller WebKit suite verifies:

- home;
- primary navigation;
- post detail;
- project detail;
- mobile layout and menu.

Tests assert stable behavior rather than exact content counts, ordering, or whichever entry happens to be first. Dedicated fixtures are used where a fixed scenario is necessary.

## Quality Additions

- Keep global statement, branch, function, and line coverage floors at 80%.
- Remove stale exclusions and apply higher branch expectations to content and URL modules.
- Add automated accessibility scanning on representative generated pages; serious violations fail the gate.
- Keep targeted keyboard interaction tests because automated scans are incomplete.
- Add Chromium/Linux visual snapshots only for stable desktop and mobile views.

## Dependency Boundary

This planning effort installs nothing. Implementation tickets that add a static preview server or accessibility scanner must request explicit approval before changing dependencies. Candidate packages must be pinned through pnpm and committed to the lockfile.

## Delivery Strategy

Work is delivered as small commits in four phases:

1. Content contract and cleanup.
2. Content and Markdown architecture.
3. Runtime, CI, and static artifact testing.
4. Accessibility, visual regression, and audit migration.

Every ticket must leave the branch lintable, type-safe, tested in proportion to its risk, and suitable for continuation by another agent.

## Success Criteria

- Invalid published content never produces a partial site.
- All content errors are reported in one run.
- Only real project cases appear publicly.
- No production code or test configuration retains speculative multilingual behavior.
- A release cannot pass without testing the generated site under `/blog`.
- Chromium, WebKit smoke, accessibility, and selected visual checks pass against the static artifact.
- Runtime and URL documentation agree with executable configuration.
- The obsolete root audit is replaced by current tracker items and removed with its disposable evidence.
