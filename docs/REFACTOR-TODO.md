# Blog Refactoring TODO

> Generated: 2026-04-05
> Status: P0 + P1 completed, P2 + P3 pending
> Workflow: Use ECC agents to propose each plan, user reviews before code changes

## Completed

### P0 — Critical Infrastructure

- [x] P0-1: Test infrastructure (Vitest + React Testing Library + jsdom, 80 tests)
- [x] P0-2: TypeScript strict mode (noUncheckedIndexedAccess, noPropertyAccessFromIndexSignature, exactOptionalPropertyTypes)
- [x] P0-3: ESLint strict config (import sorting, type imports, eqeqeq, no-console, no-explicit-any)
- [x] P0-4: CI pipeline (lint, typecheck, test, audit, build — 5 jobs on GitHub Actions)
- [ ] P0-5: Translation fix (skipped)

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

### P2 — Medium Priority

#### P2-1: Performance Optimization

- Add explicit `width`/`height` to all images (blog has `prose img` styles but no dimension enforcement)
- Review bundle size with `@next/bundle-analyzer`
- Consider dynamic imports for heavy components
- Add `loading="lazy"` to below-fold images
- Review font loading strategy (preload critical only)

#### P2-2: Accessibility (a11y)

- Add `aria-label` to interactive elements missing them
- Ensure keyboard navigation works for all interactive components
- Verify color contrast ratios for text tokens
- Add `role` and `aria-*` attributes where semantic HTML is insufficient
- Add skip-to-content link
- Verify reduced-motion behavior with `prefers-reduced-motion`

#### P2-3: SEO Enhancement

- Add JSON-LD structured data for blog posts (Article schema)
- Verify OpenGraph metadata completeness
- Add canonical URLs
- Consider generating OG images dynamically
- Add `robots` meta tag configuration per page

#### P2-4: RSS Feed

- Generate `/feed.xml` for blog posts
- Include post metadata (title, summary, date, tags, link)
- Support both zh-CN and en-US feeds

#### P2-5: Code Block Enhancements

- Add copy-to-clipboard button on code blocks
- Consider adding language label display
- Line highlighting support for specific lines

#### P2-6: Reading Time Estimation

- Calculate and display estimated reading time for posts
- Add to PostMeta interface and post-card display
- Store as derived field in content-loader or calculate on render

### P3 — Low Priority

#### P3-1: Search Functionality

- Client-side full-text search for posts
- Consider Fuse.js or Pagefind for static sites
- Search UI with instant results

#### P3-2: Pagination / Infinite Scroll

- Post list pagination when posts grow beyond 10+
- Consider infinite scroll or load-more button

#### P3-3: Table of Contents Enhancements

- Active heading highlighting on scroll (partially done with IntersectionObserver)
- Smooth scroll offset for fixed header
- Consider collapsible TOC on mobile

#### P3-4: Share Buttons

- Social sharing (Twitter, GitHub, clipboard link)
- Use Web Share API where available

#### P3-5: Animations / Transitions

- Page transition animations
- Post card hover effects
- Scroll-triggered animations (scrollytelling)

#### P3-6: Analytics Integration

- Privacy-first analytics (Plausible, Umami, or self-hosted)
- Track page views without cookies

## Project Context

### Tech Stack

- **Framework**: Next.js 16.2.2 (App Router, `output: 'export'` for GitHub Pages)
- **React**: 19.2.4, **TypeScript**: 5 (strict), **Tailwind CSS**: v4
- **i18n**: next-intl 4.9.0 (zh-CN / en-US)
- **Components**: shadcn/ui (base-nova style, @base-ui/react primitives)
- **Content**: gray-matter + remark + rehype pipeline, Zod v4 validation
- **Testing**: Vitest + React Testing Library + jsdom, 80 tests, 80% coverage threshold
- **Linting**: ESLint 9 flat config + Prettier 3 + eslint-config-prettier v10
- **Hooks**: husky + lint-staged (pre-commit: eslint --fix + prettier --write)
- **Dark Mode**: next-themes (class strategy, system default, localStorage persistence)
- **CI/CD**: GitHub Actions (lint, typecheck, test, audit, build)

### Key Architectural Decisions

- `createContentLoader` factory in `src/lib/content-loader.ts` — shared by posts and projects
- shadcn components in `src/components/ui/`, custom components in feature dirs
- `TagBadge` + `TagFilter` extracted to `src/components/tag/`
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
pnpm test          # Vitest (80 tests)
npx tsc --noEmit  # TypeScript
pnpm build         # Next.js production build (20 static pages)
```
