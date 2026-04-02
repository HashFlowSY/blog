# ShangYang's Blog

A minimal, fast personal blog built with Next.js, deployed as a static site on GitHub Pages. Supports Chinese and English.

## Features

- **Static Export** — Pure HTML/CSS/JS output, no server required
- **Markdown Writing** — Write posts and projects in Markdown with frontmatter
- **i18n** — Chinese (zh-CN) / English (en-US), switchable in one click
- **Syntax Highlighting** — Code blocks with highlight.js, auto-detected language
- **XSS Safe** — All Markdown HTML sanitized via rehype-sanitize
- **SEO** — Sitemap, robots.txt, OpenGraph metadata, correct `<html lang>` per locale
- **Client-side Tag Filter** — Filter posts by tags without a backend
- **Table of Contents** — Auto-generated from headings with scroll-spy
- **CI/CD** — Auto-deploy on push to `main` via GitHub Actions

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| [Next.js 16](https://nextjs.org) | Framework (App Router, static export) |
| [TypeScript](https://www.typescriptlang.org) | Type safety |
| [Tailwind CSS 4](https://tailwindcss.com) | Styling |
| [next-intl](https://next-intl.dev) | Internationalization |
| [Zod](https://zod.dev) | Frontmatter validation |
| [remark / rehype](https://github.com/remarkjs/remark) | Markdown processing pipeline |
| [highlight.js](https://highlightjs.org) | Syntax highlighting |
| [pnpm](https://pnpm.io) | Package manager |

## Project Structure

```
content/
├── posts/                    # Blog posts (Markdown)
└── projects/                 # Project entries (Markdown)

src/
├── app/                      # Next.js App Router pages
│   ├── layout.tsx            # Root layout (<html>, <body>, fonts)
│   ├── [locale]/             # Locale-prefixed routes
│   │   ├── layout.tsx        # i18n provider, header, footer
│   │   └── (pages)/
│   │       ├── page.tsx      # Home
│   │       ├── about/        # About me
│   │       ├── posts/        # Blog posts (list + detail)
│   │       ├── projects/     # Projects (list + detail)
│   │       └── not-found.tsx # 404
│   ├── sitemap.ts
│   └── robots.ts
├── components/               # React components
├── i18n/                     # Locale routing & navigation
├── lib/                      # Data layer (posts, projects, markdown)
└── messages/                 # Translation files
    ├── zh-CN/common.json
    └── en-US/common.json
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

```markdown
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
```

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

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `title` | `string` | Yes | — | Post title |
| `slug` | `string` | No | Filename | URL path segment |
| `date` | `string` | No | `1970-01-01` | Publish date (YYYY-MM-DD) |
| `updated` | `string` | No | `date` | Last update date |
| `tags` | `string[]` | No | `[]` | Tag list |
| `summary` | `string` | No | `""` | Short description |
| `cover` | `string` | No | `null` | Cover image path |
| `draft` | `boolean` | No | `false` | Set `true` to skip in build |

#### Project

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `title` | `string` | Yes | — | Project name |
| `slug` | `string` | No | Filename | URL path segment |
| `date` | `string` | No | `1970-01-01` | Date (YYYY-MM-DD) |
| `tags` | `string[]` | No | `[]` | Technology tags |
| `description` | `string` | No | `""` | Brief description |
| `source` | `string` | No | `null` | Source code URL |
| `demo` | `string` | No | `null` | Live demo URL |
| `featured` | `boolean` | No | `false` | Show on homepage |
| `cover` | `string` | No | `null` | Cover image path |
| `draft` | `boolean` | No | `false` | Set `true` to skip in build |

## i18n

Translation files are at `src/messages/{locale}/common.json`. Both locales share the same key structure.

To add or modify a translation:

1. Edit `src/messages/zh-CN/common.json`
2. Edit `src/messages/en-US/common.json` (same keys, English values)
3. Use `t("namespace.key")` in components:
   - Server Components: `const t = await getTranslations({ locale, namespace: "postPage" })`
   - Client Components: `const t = useTranslations("postPage")`

## Deploy to GitHub Pages

### Automatic (Recommended)

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
3. Push to `main` — deployment starts automatically

### Manual

```bash
pnpm build
# Upload contents of out/ to GitHub Pages
```

### Custom Domain

Set `NEXT_PUBLIC_SITE_URL` in the workflow environment:

```yaml
- name: Build with Next.js
  run: pnpm build
  env:
      BASE_PATH: ${{ steps.base-path.outputs.base_path }}
      NEXT_PUBLIC_SITE_URL: https://your-domain.com
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BASE_PATH` | No | `""` | URL prefix for project pages (set by CI) |
| `NEXT_PUBLIC_SITE_URL` | No | `https://shangyang.github.io` | Base URL for sitemap/robots |

## License

Private repository. All rights reserved.
