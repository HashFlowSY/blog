# Blog

An industrial-wasteland style Chinese personal blog built with Next.js 16 and deployed as a static site on GitHub Pages.

## Features

- **Static Export** — Pure HTML/CSS/JS, no server required
- **Industrial UI** — Scraplog-inspired dark grid, archive panels, workbench project cards, and shelter-style about page
- **Markdown Writing** — Posts and projects with Zod-validated frontmatter
- **Chinese-Only Routes** — Root, posts, projects, about, RSS, sitemap, and content all target Chinese
- **Syntax Highlighting** — Code blocks with language labels, copy button, line highlighting
- **Archive Filters** — Tag filters for posts and projects
- **Article Detail Template** — Shared reading page template for every post
- **SEO** — Sitemap, robots.txt, canonical URLs, OG, Twitter, noindex 404
- **RSS Feed** — `/feed.xml` with autodiscovery
- **Reading Time** — Word-count-based estimation on post cards and detail pages
- **XSS Safe** — All Markdown HTML sanitized via rehype-sanitize
- **CI/CD** — Auto-deploy on push to `main` via GitHub Actions

## Tech Stack

| Technology                                            | Purpose                               |
| ----------------------------------------------------- | ------------------------------------- |
| [Next.js 16](https://nextjs.org)                      | Framework (App Router, static export) |
| [React 19](https://react.dev)                         | UI library                            |
| [TypeScript 5](https://www.typescriptlang.org)        | Type safety (strict mode)             |
| [Tailwind CSS 4](https://tailwindcss.com)             | Styling                               |
| [Zod 4](https://zod.dev)                              | Frontmatter validation                |
| [remark / rehype](https://github.com/remarkjs/remark) | Markdown processing pipeline          |
| [highlight.js](https://highlightjs.org)               | Syntax highlighting                   |
| [Vitest](https://vitest.dev)                          | Unit testing                          |
| [Playwright](https://playwright.dev)                  | End-to-end testing                    |
| [ESLint 9](https://eslint.org)                        | Linting (flat config)                 |
| [Prettier 3](https://prettier.io)                     | Code formatting                       |
| [husky](https://typicode.github.io/husky)             | Git hooks                             |
| [pnpm 11](https://pnpm.io)                            | Package manager                       |

## Project Structure

```
content/
├── posts/zh-CN/              # Chinese blog posts (Markdown)
└── projects/zh-CN/           # Chinese project entries (Markdown)

src/
├── app/
│   ├── layout.tsx            # Root layout + site shell
│   ├── globals.css           # Industrial UI styles + design tokens
│   ├── page.tsx              # Home
│   ├── about/                # About page
│   ├── posts/                # Blog posts (list + detail)
│   ├── projects/             # Projects (list + detail)
│   ├── not-found.tsx         # 404 page
│   ├── sitemap.ts            # Auto-generated sitemap
│   ├── robots.ts             # robots.txt
│   └── feed.xml/             # RSS feed
├── components/
│   ├── layout/               # Header, footer, site shell, back-to-top
│   ├── post/                 # Post archive, detail template, card, code block
│   └── project/              # Project board, card, list
├── lib/                      # Data layer, utilities
│   ├── content-loader.ts     # Shared content loader factory
│   ├── posts.ts              # Post loading & queries
│   ├── projects.ts           # Project loading & queries
│   ├── markdown.ts           # Markdown → HTML pipeline
│   ├── site.ts               # Site URL config
│   └── feed.ts               # RSS XML builder
└── test-utils/               # Shared test helpers
```

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 11

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
NEXT_PUBLIC_BASE_PATH=
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
pnpm build
npx serve out
```

## Writing Content

### Blog Post

Create a Markdown file in `content/posts/zh-CN/`:

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

Create a Markdown file in `content/projects/zh-CN/`:

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

### Markdown Support

Posts and project entries use safe static Markdown. Supported authoring features:

- CommonMark headings, paragraphs, emphasis, links, blockquotes, ordered lists, unordered lists, inline code, and fenced code blocks
- GitHub Flavored Markdown tables, task lists, strikethrough, footnotes, and autolink literals
- Markdown images with sanitized `src`, `alt`, and `title`
- Automatic heading anchors for `h1` through `h6`
- Syntax highlighting for fenced code blocks
- Line highlighting with fenced code metadata such as `{1,3-5}` after the language name

Intentional exclusions:

- No MDX files
- No embedded React components
- No arbitrary raw HTML as a supported content feature
- No iframe or script embeds

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

## Chinese-Only Routing

The site no longer uses locale-prefixed routes or translation files. Add Chinese content under `content/posts/zh-CN/` and `content/projects/zh-CN/`; public pages are served at `/`, `/posts/`, `/projects/`, `/about/`, and `/feed.xml`.

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

| Variable                | Required | Description                                           |
| ----------------------- | -------- | ----------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`  | Yes      | Base URL for sitemap, robots, RSS, canonical, OG      |
| `BASE_PATH`             | Yes      | URL prefix for project pages (auto-set by CI)         |
| `NEXT_PUBLIC_BASE_PATH` | No       | Client-visible mirror of `BASE_PATH` (auto-set by CI) |

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

For a manual project-site build, set `NEXT_PUBLIC_BASE_PATH` to the same value so client components resolve public assets correctly. The GitHub Actions workflow sets both variables automatically.

### Local Development

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
BASE_PATH=
NEXT_PUBLIC_BASE_PATH=
```

## Scripts

| Command              | Description                    |
| -------------------- | ------------------------------ |
| `pnpm dev`           | Start development server       |
| `pnpm build`         | Production build to `out/`     |
| `pnpm preview`       | Preview production build       |
| `pnpm lint`          | Run ESLint                     |
| `pnpm lint:fix`      | Run ESLint with auto-fix       |
| `pnpm format:check`  | Check Prettier formatting      |
| `pnpm test`          | Run unit tests                 |
| `pnpm test:watch`    | Run tests in watch mode        |
| `pnpm test:coverage` | Run tests with coverage report |

## License

Private repository. All rights reserved.
