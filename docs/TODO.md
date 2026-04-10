# Project TODO

Comprehensive review generated on 2026-04-10. Findings organized by priority.

---

## HIGH

- [x] **H-1: Fix `getAdjacentPosts` bug for non-existent slug** -- `findIndex` returns `-1`, and `-1 < posts.length - 1` is `true`, so `next` returns `posts[0]` instead of `null`. Add early return for `index === -1`.
  - `src/lib/posts.ts:130-135`
  - `src/lib/posts.spec.ts:492-503` (test documents bug but does not assert on `next`)

- [x] **H-2: Localize "Table of Contents" in `PostToc`** -- hardcoded English string in an i18n project. Use `useTranslations` with existing `postPage.toc` key.
  - `src/components/post/post-toc.tsx:53`

- [x] **H-3: Localize hardcoded strings in `ShareButtons`** -- "Share", "X", "Copy link", "Copied!" are hardcoded English.
  - `src/components/share/share-buttons.tsx:57,76,89`

- [x] **H-4: Localize hardcoded strings in `CodeBlockEnhancer`** -- "Copy code", "Copy", "Copied!" are hardcoded English.
  - `src/components/post/code-block.tsx:28,34,42,47`

- [x] **H-5: Localize "min read" in `PostCard`** -- hardcoded English string.
  - `src/components/post/post-card.tsx:18`

- [x] **H-6: Remove or adopt dead `useCopyToClipboard` hook** -- the hook is never imported. Clipboard logic is implemented inline in `code-block.tsx` and `share-buttons.tsx`.
  - `src/hooks/use-copy-to-clipboard.ts`

- [x] **H-7: Make content locale-aware** -- same posts are served for all locales (zh-CN, en-US), causing duplicate content SEO issues. Consider per-locale content directories (`content/posts/zh-CN/`, `content/posts/en-US/`) or a `locale` frontmatter field.
  - `src/lib/posts.ts`, `content/posts/`

---

## MEDIUM

- [ ] **M-1: Fix English translation file** -- `aboutPage.exp1` and `aboutPage.exp2` in `en-US/common.json` contain Chinese text identical to the Chinese locale file.
  - `src/messages/en-US/common.json:61-70`

- [ ] **M-2: Localize hardcoded "HashFlow" in hero section** -- use `tHero("siteName")` instead of literal string.
  - `src/app/[locale]/(pages)/page.tsx:69`

- [ ] **M-3: Extract shared feed route factory** -- `feed.xml/route.ts` and `en-US/feed.xml/route.ts` are near-identical, differing only in locale/language/URL path. Create a `createFeedRoute(locale)` utility.
  - `src/app/feed.xml/route.ts`
  - `src/app/en-US/feed.xml/route.ts`

- [ ] **M-4: Deduplicate Fuse.js result-mapping in `use-search.ts`** -- two identical mapping blocks at lines 79-90 and 107-117. Extract a `mapFuseResults` helper.
  - `src/hooks/use-search.ts:79-90,107-117`

- [ ] **M-5: Add module-level cache in `content-loader.ts`** -- `getAllMeta()` calls `fs.readdirSync` and parses every file on each invocation. During build, the same files are parsed repeatedly across `generateStaticParams` for multiple pages and locales.
  - `src/lib/content-loader.ts:148-168`

- [ ] **M-6: Build slug-to-filename index in content-loader** -- `getBySlug()` does a linear scan of all files, parsing each until a match is found. A slug-to-path map built once would make this O(1).
  - `src/lib/content-loader.ts:195-211`

- [ ] **M-7: Refactor `CodeBlockEnhancer` to use React instead of DOM mutation** -- uses `document.createElement`, `innerHTML`, and `appendChild`, bypassing React reconciliation. Move copy-button logic into the rehype pipeline or use React state/JSX.
  - `src/components/post/code-block.tsx`

- [ ] **M-8: Improve type safety in content-loader casts** -- `as Record<string, unknown>` casts at lines 131, 137, 162-163, 187-188 bypass Zod type safety. Constrain the generic to require `slugField`/`sortField`/`draftField` fields in the schema type.
  - `src/lib/content-loader.ts`

- [ ] **M-9: Validate fetch response in `use-search.ts`** -- `r.json() as Promise<SearchIndexEntry[]>` asserts shape without runtime validation. Add a Zod parse.
  - `src/hooks/use-search.ts:72`

- [ ] **M-10: Add user feedback for clipboard failures** -- clipboard operations in `code-block.tsx`, `share-buttons.tsx`, and `use-copy-to-clipboard.ts` silently swallow errors with empty `catch` blocks. Show an error tooltip or fallback message.
  - `src/components/post/code-block.tsx:52`
  - `src/components/share/share-buttons.tsx:18,29`
  - `src/hooks/use-copy-to-clipboard.ts:16`

- [ ] **M-11: Fix `AnalyticsProvider` cleanup when both providers are configured** -- if both `plausibleDomain` and `umamiWebsiteId` are set, only the Umami cleanup function is returned, leaking the Plausible script node.
  - `src/components/analytics/analytics-provider.tsx:41-54`

- [ ] **M-12: Reuse content-loader in `generate-search-index.ts`** -- the script manually duplicates file reading, frontmatter parsing, draft filtering, and slug resolution that `content-loader.ts` already handles. Import from `posts.ts` instead.
  - `src/scripts/generate-search-index.ts`

- [ ] **M-13: Add test for `markdownToHtml` error path** -- the `catch` block at lines 49-53 is never exercised. Mock a remark plugin to throw and verify the error message includes the filename.
  - `src/lib/markdown.ts:49-53`

- [ ] **M-14: Decouple header tests from CSS class names** -- assertions like `expect(homeLinks[0]!.className).toContain("font-medium")` are brittle. Prefer testing visible behavior or data attributes.
  - `src/components/layout/header.spec.tsx`

- [ ] **M-15: Run E2E tests against static export** -- Playwright `webServer` currently runs `pnpm dev`. Since production is a static export, E2E should validate against a static file server (e.g., `npx serve out`).
  - `playwright.config.ts:29`

---

## LOW

- [ ] **L-1: Localize locale toggle label in header** -- `{locale === "zh-CN" ? "EN" : "中文"}` is hardcoded instead of using i18n translations.
  - `src/components/layout/header.tsx:97`

- [ ] **L-2: Move experience data out of translation files** -- career experience entries in `aboutPage.exp1`/`exp2` are stored as translation strings. Consider structured content (YAML/JSON data file or markdown collection) for scalability.
  - `src/messages/zh-CN/common.json`

- [ ] **L-3: Adopt `@tailwindcss/typography` for prose styles** -- all markdown content styles (`.prose h1`, `.prose pre`, `.prose code`, etc.) are hand-written in `globals.css`. The plugin provides a more comprehensive and maintained set of prose styles.
  - `src/app/globals.css:92-310`

- [ ] **L-4: Remove unused sidebar/chart CSS tokens** -- `--sidebar-*` and `--chart-*` custom properties are generated by shadcn/ui theme but not used in any component.
  - `src/app/globals.css`

- [ ] **L-5: Simplify `Promise.all` wrapping single promise** -- `await Promise.all([getTranslations(...)])` in home page `generateMetadata` is unnecessary. Use `await getTranslations(...)` directly.
  - `src/app/[locale]/(pages)/page.tsx:24-26`

- [ ] **L-6: Deduplicate content truncation magic number `2000`** -- `DEFAULT_MAX_LENGTH = 2000` in `strip-html.ts` and `CONTENT_MAX_LENGTH = 2000` in `generate-search-index.ts` are defined independently. Extract to a shared constants module.
  - `src/lib/search/strip-html.ts:1`
  - `src/scripts/generate-search-index.ts:19`

- [ ] **L-7: Fix `null` vs `undefined` inconsistency in updatedLabel checks** -- `PostList` uses `!== null` while `PostListClient` uses `!== undefined`. Both should use `!== undefined` since the prop type is `string | undefined`.
  - `src/components/post/post-list.tsx:19`
  - `src/app/[locale]/(pages)/posts/post-list-client.tsx:80`

- [ ] **L-8: Respect `prefers-reduced-motion` in `SkipLink`** -- `PostToc` checks the media query before scrolling, but `SkipLink` calls `scrollIntoView` with `behavior: "smooth"` unconditionally.
  - `src/components/layout/skip-link.tsx:26`

- [ ] **L-9: Use `cn()` utility in `search-bar.tsx`** -- `className={\`relative ${className ?? ""}\`}`bypasses the project's`cn()` utility used everywhere else.
  - `src/components/search/search-bar.tsx:107`

- [ ] **L-10: Remove unused `AppConfig` interface in `global.d.ts`** -- declared but never imported or referenced.
  - `src/global.d.ts`

---

## SECURITY

- [ ] **S-1: Add security headers if deploying behind a CDN** -- no CSP, X-Frame-Options, HSTS, or other security headers. Not possible on GitHub Pages directly, but can be configured at the CDN/proxy level.
- [ ] **S-2: Add SRI hashes for analytics scripts** -- Plausible and Umami scripts are loaded without `integrity` attributes.
  - `src/components/analytics/analytics-provider.tsx:29-54`
- [ ] **S-3: Fix language in `en-US/feed.xml/route.ts`** -- language is set to `"zh-CN"` (copy-paste error).
  - `src/app/en-US/feed.xml/route.ts:12`
