# Blog

A minimal, fast personal blog built with Next.js 16, deployed as a static site on GitHub Pages. Supports Chinese and English.

## Features

- **Static Export** — Pure HTML/CSS/JS, no server required
- **Markdown Writing** — Posts and projects with Zod-validated frontmatter
- **i18n** — Chinese (zh-CN) / English (en-US), one-click switch
- **Syntax Highlighting** — Code blocks with language labels, copy button, line highlighting
- **Full-Text Search** — Client-side fuzzy search (Fuse.js), keyboard accessible
- **Table of Contents** — Auto-generated from headings, collapsible on mobile, scroll-spy active state
- **Share Buttons** — Web Share API, Twitter/X, clipboard link copy
- **Dark Mode** — System-aware with manual toggle (next-themes)
- **Scroll Animations** — FadeIn scroll-reveal, enhanced card hover effects
- **SEO** — Sitemap, robots.txt, canonical URLs, hreflang, OG, Twitter, JSON-LD, noindex 404
- **RSS Feed** — `/feed.xml` (zh-CN) + `/en-US/feed.xml` with autodiscovery
- **Reading Time** — Word-count-based estimation on post cards and detail pages
- **Analytics** — Privacy-first (Plausible / Umami), cookie-free, configurable via env vars
- **XSS Safe** — All Markdown HTML sanitized via rehype-sanitize
- **CI/CD** — Auto-deploy on push to `main` via GitHub Actions

## Tech Stack

| Technology                                                | Purpose                               |
| --------------------------------------------------------- | ------------------------------------- |
| [Next.js 16](https://nextjs.org)                          | Framework (App Router, static export) |
| [React 19](https://react.dev)                             | UI library                            |
| [TypeScript 5](https://www.typescriptlang.org)            | Type safety (strict mode)             |
| [Tailwind CSS 4](https://tailwindcss.com)                 | Styling                               |
| [shadcn/ui](https://ui.shadcn.com)                        | Component primitives (@base-ui/react) |
| [next-intl](https://next-intl.dev)                        | Internationalization                  |
| [next-themes](https://github.com/pacocoursey/next-themes) | Dark mode                             |
| [Fuse.js](https://www.fusejs.io)                          | Client-side fuzzy search              |
| [Lucide React](https://lucide.dev)                        | Icons                                 |
| [Zod 4](https://zod.dev)                                  | Frontmatter validation                |
| [remark / rehype](https://github.com/remarkjs/remark)     | Markdown processing pipeline          |
| [highlight.js](https://highlightjs.org)                   | Syntax highlighting                   |
| [Vitest](https://vitest.dev)                              | Unit testing (421 tests)              |
| [ESLint 9](https://eslint.org)                            | Linting (flat config)                 |
| [Prettier 3](https://prettier.io)                         | Code formatting                       |
| [husky](https://typicode.github.io/husky)                 | Git hooks                             |
| [pnpm 10](https://pnpm.io)                                | Package manager                       |

## Project Structure

```
content/
├── posts/                    # Blog posts (Markdown)
└── projects/                 # Project entries (Markdown)

src/
├── app/
│   ├── layout.tsx            # Root layout (html, body, fonts)
│   ├── globals.css           # Global styles + design tokens
│   ├── not-found.tsx         # 404 page
│   ├── sitemap.ts            # Auto-generated sitemap
│   ├── robots.ts             # robots.txt
│   ├── feed.xml/             # RSS feed (zh-CN)
│   ├── en-US/feed.xml/       # RSS feed (en-US)
│   └── [locale]/             # Locale-prefixed routes
│       ├── layout.tsx        # i18n provider, header, footer, analytics
│       └── (pages)/
│           ├── page.tsx      # Home
│           ├── about/        # About me
│           ├── posts/        # Blog posts (list + detail)
│           └── projects/     # Projects (list + detail)
├── components/
│   ├── analytics/            # Plausible / Umami provider
│   ├── layout/               # Header, footer, skip-link
│   ├── motion/               # FadeIn scroll-reveal
│   ├── post/                 # Post card, post list, TOC, code block
│   ├── project/              # Project card, project list
│   ├── search/               # SearchBar, useSearch hook
│   ├── share/                # Share buttons
│   ├── tag/                  # TagBadge, TagFilter
│   ├── theme/                # ThemeProvider, toggle
│   └── ui/                   # shadcn/ui base components
├── hooks/                    # Custom React hooks
├── i18n/                     # Locale routing & navigation
├── lib/                      # Data layer, utilities
│   ├── content-loader.ts     # Shared content loader factory
│   ├── posts.ts              # Post loading & queries
│   ├── projects.ts           # Project loading & queries
│   ├── markdown.ts           # Markdown → HTML pipeline
│   ├── site.ts               # Site URL config
│   ├── feed.ts               # RSS XML builder
│   └── search/               # Search index builder & types
├── messages/
│   ├── zh-CN/common.json     # Chinese translations
│   └── en-US/common.json     # English translations
├── scripts/
│   └── generate-search-index.ts  # Prebuild search index
└── test-utils/               # Shared test helpers
```

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 10

### Install

```bash
git clone <repo-url> && cd blog
pnpm install
```

### Environment Variables

Create `.env.local` for local development:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
BASE_PATH=
```

See [Environment Variables](#environment-variables) for the full list.

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
pnpm build
```

Static output is generated in the `out/` directory.

### Preview Build Output

```bash
pnpm preview
# or serve out/ with any static file server
npx serve out
```

## Writing Content

### Blog Post

Create a Markdown file in `content/posts/`:

````markdown
---
title: "My New Post"
slug: "my-new-post"
date: "2026-04-02"
updated: "2026-04-03"
tags: ["nextjs", "tutorial"]
summary: "A short description of the post."
draft: false
---

Your Markdown content here. Code blocks get syntax highlighting:

```typescript
console.log("Hello, World!");
```
````

### Project Entry

Create a Markdown file in `content/projects/`:

```markdown
---
title: "My Project"
slug: "my-project"
date: "2026-04-02"
tags: ["react", "typescript"]
description: "A brief project description."
source: "https://github.com/user/repo"
demo: "https://demo.example.com"
featured: true
draft: false
---

Detailed project description in Markdown.
```

### Frontmatter Reference

#### Post

| Field     | Type       | Required | Default      | Description                 |
| --------- | ---------- | -------- | ------------ | --------------------------- |
| `title`   | `string`   | Yes      | —            | Post title                  |
| `slug`    | `string`   | No       | Filename     | URL path segment            |
| `date`    | `string`   | No       | `1970-01-01` | Publish date (YYYY-MM-DD)   |
| `updated` | `string`   | No       | `date`       | Last update date            |
| `tags`    | `string[]` | No       | `[]`         | Tag list                    |
| `summary` | `string`   | No       | `""`         | Short description           |
| `cover`   | `string`   | No       | `null`       | Cover image path            |
| `draft`   | `boolean`  | No       | `false`      | Set `true` to skip in build |

#### Project

| Field         | Type       | Required | Default      | Description                 |
| ------------- | ---------- | -------- | ------------ | --------------------------- |
| `title`       | `string`   | Yes      | —            | Project name                |
| `slug`        | `string`   | No       | Filename     | URL path segment            |
| `date`        | `string`   | No       | `1970-01-01` | Date (YYYY-MM-DD)           |
| `tags`        | `string[]` | No       | `[]`         | Technology tags             |
| `description` | `string`   | No       | `""`         | Brief description           |
| `source`      | `string`   | No       | `null`       | Source code URL             |
| `demo`        | `string`   | No       | `null`       | Live demo URL               |
| `featured`    | `boolean`  | No       | `false`      | Show on homepage            |
| `cover`       | `string`   | No       | `null`       | Cover image path            |
| `draft`       | `boolean`  | No       | `false`      | Set `true` to skip in build |

## i18n

Translation files are at `src/messages/{locale}/common.json`. Both locales share the same key structure.

To add or modify a translation:

1. Edit `src/messages/zh-CN/common.json`
2. Edit `src/messages/en-US/common.json` (same keys, English values)
3. Use `t("namespace.key")` in components:
   - Server Components: `const t = await getTranslations({ locale, namespace: "postPage" })`
   - Client Components: `const t = useTranslations("postPage")`

## Deployment

### GitHub Pages (Automatic)

The included GitHub Actions workflow (`deploy.yml`) handles everything:

1. Push to `main` triggers the workflow
2. `BASE_PATH` is auto-detected:
   - `username.github.io` → empty (root)
   - `username.github.io/repo-name` → `/repo-name`
3. `pnpm build` generates static files in `out/`
4. Deployed to GitHub Pages

**Setup:**

1. Go to repo **Settings → Pages → Source**
2. Select **GitHub Actions** as the source
3. Go to **Settings → Secrets and variables → Actions → Variables**
4. Add `NEXT_PUBLIC_SITE_URL` to **Repository variables**(e.g. `https://username.github.io`)
5. Push to `main` — deployment starts automatically

### Custom Domain

Set `NEXT_PUBLIC_SITE_URL` to your domain in GitHub Variables, and configure DNS accordingly.

## Environment Variables

| Variable                       | Required | Description                                      |
| ------------------------------ | -------- | ------------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL`         | Yes      | Base URL for sitemap, robots, RSS, canonical, OG |
| `BASE_PATH`                    | Yes      | URL prefix for project pages (auto-set by CI)    |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | No       | Plausible Analytics domain (enables Plausible)   |
| `NEXT_PUBLIC_UMAMI_ID`         | No       | Umami Analytics website ID (enables Umami)       |

### NEXT_PUBLIC_SITE_URL

The base URL of your site. Used to generate sitemap, robots.txt, RSS feed URLs, canonical links, and Open Graph metadata.

**Local development:**

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**GitHub Pages (default address):**

```
# Settings → Secrets and variables → Actions → Variables
Name:  NEXT_PUBLIC_SITE_URL
Value: https://username.github.io
```

**GitHub Pages (custom domain):**

```
Name:  NEXT_PUBLIC_SITE_URL
Value: https://your-domain.com
```

### BASE_PATH

The URL prefix for GitHub Pages project sites. Automatically computed by `deploy.yml`, no manual configuration needed.

- `username.github.io` → `BASE_PATH=` (empty)
- `username.github.io/repo-name` → `BASE_PATH=/repo-name`

### NEXT_PUBLIC_PLAUSIBLE_DOMAIN

Enable [Plausible Analytics](https://plausible.io/) by setting this to your registered site domain. No cookie, GDPR-friendly. Requires a Plausible account (self-hosted or cloud).

```
Name:  NEXT_PUBLIC_PLAUSIBLE_DOMAIN
Value: your-domain.com
```

Leave empty to disable.

### NEXT_PUBLIC_UMAMI_ID

Enable [Umami Analytics](https://umami.is/) by setting this to your website ID from the Umami dashboard. No cookie, can be self-hosted.

```
Name:  NEXT_PUBLIC_UMAMI_ID
Value: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Leave empty to disable.

> **Note:** `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` and `NEXT_PUBLIC_UMAMI_ID` are mutually exclusive. If both are set, only Plausible is used.

### Local Development

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
BASE_PATH=
# Optional — analytics (leave empty to disable)
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=
NEXT_PUBLIC_UMAMI_ID=
```

## Scripts

| Command                | Description                                            |
| ---------------------- | ------------------------------------------------------ |
| `pnpm dev`             | Start development server                               |
| `pnpm build`           | Production build to `out/`                             |
| `pnpm preview`         | Preview production build                               |
| `pnpm lint`            | Run ESLint                                             |
| `pnpm lint:fix`        | Run ESLint with auto-fix                               |
| `pnpm format:check`    | Check Prettier formatting                              |
| `pnpm test`            | Run unit tests (421 tests)                             |
| `pnpm test:watch`      | Run tests in watch mode                                |
| `pnpm test:coverage`   | Run tests with coverage report                         |
| `pnpm generate:search` | Generate search index (runs automatically on prebuild) |

## License

Private repository. All rights reserved.
