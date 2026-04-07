# Blog Refactoring TODO

> Generated: 2026-04-05
> Last updated: 2026-04-07
> Status: **All P0–P3 completed**
> Workflow: Use ECC agents to propose each plan, user reviews before code changes

## Completed

### P0 — Critical Infrastructure

- [x] P0-1: Test infrastructure (Vitest + React Testing Library + jsdom, 80 tests)
- [x] P0-2: TypeScript strict mode (noUncheckedIndexedAccess, noPropertyAccessFromIndexSignature, exactOptionalPropertyTypes)
- [x] P0-3: ESLint strict config (import sorting, type imports, eqeqeq, no-console, no-explicit-any)
- [x] P0-4: CI pipeline (lint, typecheck, test, audit, build — 5 jobs on GitHub Actions)
- [x] P0-5: Translation fix (skipped)
- [x] P2-1: Performance Optimization (skipped — no actionable items for tiny static blog with no images)
- [x] P2-2: Accessibility (a11y) — skip links, mobile menu a11y, aria-labels, progress bars
- [x] P2-3: SEO Enhancement — metadataBase, canonical, hreflang, OG, Twitter, JSON-LD, noindex 404
- [x] P2-4: RSS Feed — /feed.xml (zh-CN) + /en-US/feed.xml with autodiscovery
- [x] P2-5: Code Block Enhancements — copy-to-clipboard, language labels, line highlighting, syntax theme CSS
- [x] P2-6: Reading Time Estimation — word-count-based estimation, displayed in post cards and detail pages
- [x] P3-1: Client-Side Full-Text Search — Fuse.js fuzzy search, build-time index, lazy-loaded hook, SearchBar with ARIA combobox
- [x] P3-3: TOC Enhancements — Collapsible TOC on mobile (ChevronDown toggle, aria-expanded), active heading highlighting, smooth scroll offset
- [x] P3-4: Share Buttons — Web Share API, Twitter/X intent, clipboard link copy, placed after post content
- [x] P3-5: Animations / Transitions — FadeIn scroll-reveal component (IntersectionObserver), enhanced card hover effects (lift + shadow), staggered delays on list items
- [x] P3-6: Analytics Integration — Privacy-first analytics provider (Plausible / Umami), env-var config, safe cleanup, added to locale layout

### P1 — Code Quality

- [x] P1-1: extractHeadings utility extraction + PostToc re-export from shared module
- [x] P1-2: ContentLoader factory abstraction (posts.ts + projects.ts → content-loader.ts)
- [x] P1-3: Shadcn/UI initialization (button, card, badge, separator, navigation-menu)
- [x] P1-4: TagBadge / TagFilter component extraction (5 consumer files updated)
- [x] P1-5: i18n type safety (AppConfig augmentation, HomePage namespace fix)
- [x] P1-6: Dark mode (next-themes class strategy, sun/moon toggle)
- [x] P1-7: Error boundaries (global-error.tsx + [locale]/error.tsx, unstable_retry)
- [x] P1-8: Prettier + pre-commit hooks (husky + lint-staged + eslint-config-prettier)

## Pending

### P3 — Low Priority

#### P3-2: Pagination / Infinite Scroll (SKIPPED — YAGNI)

Blog currently has only 2 posts. Revisit when post count exceeds 10.

## Project Context

### Tech Stack

- **Framework**: Next.js 16.2.2 (App Router, `output: 'export'` for GitHub Pages)
- **React**: 19.2.4, **TypeScript**: 5 (strict), **Tailwind CSS**: v4
- **i18n**: next-intl 4.9.0 (zh-CN / en-US)
- **Components**: shadcn/ui (base-nova style, @base-ui/react primitives)
- **Content**: gray-matter + remark + rehype pipeline, Zod v4 validation
- **Testing**: Vitest + React Testing Library + jsdom, 421 tests, 80% coverage threshold
- **Linting**: ESLint 9 flat config + Prettier 3 + eslint-config-prettier v10
- **Hooks**: husky + lint-staged (pre-commit: eslint --fix + prettier --write)
- **Dark Mode**: next-themes (class strategy, system default, localStorage persistence)
- **CI/CD**: GitHub Actions (lint, typecheck, test, audit, build)

### Key Architectural Decisions

- `createContentLoader` factory in `src/lib/content-loader.ts` — shared by posts and projects
- shadcn components in `src/components/ui/`, custom components in feature dirs
- `TagBadge` + `TagFilter` extracted to `src/components/tag/`
- `ShareButtons` in `src/components/share/`
- `FadeIn` scroll-reveal in `src/components/motion/`
- `AnalyticsProvider` (Plausible/Umami) in `src/components/analytics/`
- `ThemeProvider` in `src/components/theme/theme-provider.tsx`
- i18n type safety via `src/global.d.ts` AppConfig augmentation
- CSS variables defined in `globals.css` :root + .dark class blocks (no @media prefers-color-scheme)
- `unstable_retry` (v16 API) used in error.tsx files

### Key File Locations

- Config: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `.prettierrc`, `vitest.config.ts`
- i18n: `src/i18n/` (routing, request, navigation, types), `src/messages/{zh-CN,en-US}/common.json`
- Content: `src/lib/content-loader.ts`, `src/lib/posts.ts`, `src/lib/projects.ts`, `src/lib/markdown.ts`
- Layout: `src/app/layout.tsx`, `src/app/[locale]/layout.tsx`
- Components: `src/components/{layout,post,project,tag,theme,ui,motion,about}/`

### Rules

- Read `docs/` specs before any code change (per CLAUDE.md)
- Use ECC agents to propose plans, user reviews before code changes
- `eslint-config-prettier` must be LAST in eslint.config.mjs
- `noUncheckedIndexedAccess` requires `!` assertions or proper narrowing
- `exactOptionalPropertyTypes` — use `!== undefined` not `!== null` for optional props
- `noPropertyAccessFromIndexSignature` — use `obj["key"]` not `obj.key` for index signatures
- `perfectionist/sort-imports` requires newlinesBetween: 1 between import groups (builtin, external, internal, parent, sibling, index, type)
- `config-protection` hook blocks modifications to `.prettierrc` and `eslint.config.mjs` — user must edit manually

### Verification Commands

```bash
pnpm lint          # ESLint
pnpm format:check  # Prettier
pnpm test          # Vitest (421 tests)
npx tsc --noEmit  # TypeScript
pnpm generate:search  # Generate search index (prebuild runs this automatically)
pnpm build         # Next.js production build
```

### Uncommitted Work (as of 2026-04-07)

All P0–P3 changes are implemented but **not yet committed**. The working tree includes ~35 modified files and ~30 new files covering:

- P0: Test infrastructure, TypeScript strict, ESLint, CI
- P1: Code quality improvements, shadcn/ui, dark mode, error boundaries, Prettier
- P2-2: Skip links, mobile menu a11y, aria-labels
- P2-3: SEO (metadataBase, canonical, hreflang, OG, Twitter, JSON-LD, noindex 404)
- P2-4: RSS feed (/feed.xml + /en-US/feed.xml)
- P2-5: Code block enhancements (copy, language labels, line highlighting, syntax CSS)
- P2-6: Reading time estimation
- P3-1: Client-side full-text search (Fuse.js, build-time index, SearchBar, useSearch hook)
- P3-3: Collapsible TOC on mobile
- P3-4: Share buttons (Web Share API, Twitter/X, clipboard link)
- P3-5: FadeIn animations, enhanced card hover effects
- P3-6: Analytics provider (Plausible/Umami)

**Verification status**: 421 tests pass, TypeScript clean, lint clean. Build has a pre-existing Google Fonts CSS resolution issue unrelated to these changes.
