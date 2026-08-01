# Blog

An industrial-wasteland style Chinese personal blog built with Next.js 16 and deployed as a static site on GitHub Pages.

## Features

- **Static Export** — Pure HTML/CSS/JS, no server required
- **Industrial UI** — Scraplog-inspired dark grid, archive panels, workbench project cards, and shelter-style about page
- **Markdown Writing** — Posts and projects with Zod-validated frontmatter
- **Chinese-Only Routes** — Root, posts, projects, about, RSS, sitemap, and content all target Chinese
- **Syntax Highlighting** — Code blocks with language labels, copy button, line highlighting
- **Archive Filters** — Tag filters for posts
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
| [pnpm 11.0.8](https://pnpm.io)                        | Package manager                       |

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
│   └── project/              # Project card, list
└── lib/                      # Data layer, utilities
    ├── content-catalog.ts    # Atomic content discovery, validation, and queries
    ├── content-contracts.ts  # Strict Post and Project Case frontmatter contracts
    ├── markdown.ts           # Structured Markdown rendering pipeline
    ├── site.ts               # Site URL config
    └── feed.ts               # RSS XML builder
```

## Getting Started

### Prerequisites

- Node.js 24.x (the latest patch release; `.nvmrc` selects this major)
- pnpm 11.0.8

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

### Verify the deployable static artifact

Build the same representative GitHub Pages project-site artifact that the
release gate validates:

```bash
NODE_ENV=production NEXT_PUBLIC_SITE_URL=https://example.com BASE_PATH=/blog NEXT_PUBLIC_BASE_PATH=/blog pnpm build
```

Start a read-only preview of the existing output, then open
[http://127.0.0.1:4173/blog/](http://127.0.0.1:4173/blog/):

```bash
pnpm preview:static
```

Run the complete Chromium artifact suite, focused visual project, and smaller
WebKit smoke suite against that same output with:

```bash
pnpm test:e2e:static
```

The `chromium-a11y` static project is part of that command and runs only in
Chromium. It scans the home page (`/`), post list (`/posts/`), stable post
fixture (`/posts/2026-04-30/`), project list (`/projects/`), stable real project
fixture (`/projects/personal-blog/`), and the generated 404 document. The 404
check first verifies an HTTP 404 response and byte-for-byte equality with
`out/404.html`, then runs the accessibility scan. All pages are served from the
same `/blog` build of `out/`.

The gate uses `@axe-core/playwright@4.12.1` and fails when any violation has
`serious` or `critical` impact. Failure output includes the axe rule id, impact,
help text/URL, and each matched DOM target. Moderate and minor findings do not
lower this threshold. Automated scanning complements the focused keyboard
tests for the skip link, mobile menu, navigation links, and isolated copy
control fixture.

Run only the accessibility project with:

```bash
pnpm test:e2e:static:a11y
```

To inspect a browser project independently:

```bash
pnpm test:e2e:static:chromium
pnpm test:e2e:static:a11y
pnpm test:e2e:static:visual
pnpm test:e2e:static:webkit
```

These commands require an already-complete `out/` directory. They only serve
and test that directory: they do not run `next dev`, `next start`, or an
implicit rebuild. The preview server uses Node 24's built-in HTTP and file
system modules, so this harness adds no static-server dependency. Failure
screenshots and traces are separated under
`test-results/static-artifact/chromium/` and
`test-results/static-artifact/chromium-a11y/` for the accessibility project,
`test-results/static-artifact/chromium-visual/` for the visual project, and
`test-results/static-artifact/webkit/`; the HTML report is written to
`playwright-static-report/`. A visual failure keeps the expected, actual, and
diff PNGs alongside its trace and screenshot in the visual project directory.

The `chromium-visual` project owns exactly four viewport screenshots: the home
page at `1440x900`, the stable post
`/posts/2026-04-30/` at `1440x900`, the real project
`/projects/personal-blog/` at `1440x900`, and the home page at `375x667` with
the mobile navigation open. It uses Chromium with a fixed device scale factor,
light color scheme, reduced motion, `zh-CN` locale, and `Asia/Shanghai`
timezone. The snapshots live in
`e2e/visual-regression.spec.ts-snapshots/`; names include `linux` and the
`chromium-visual` project marker through Playwright's platform/project suffix.
Linux files therefore end in `-chromium-visual-linux.png`; Darwin explicitly
skips the project and never creates or accepts a canonical baseline (the
underlying Playwright suffix would be `-darwin` if that guard were removed).
The visual project is excluded from
development-server tests and from the ordinary Chromium project, and WebKit
remains smoke-only.

On non-Linux hosts, the visual project is explicitly reported as skipped so
`pnpm test:e2e:static` can still exercise the non-visual static suites without
looking for Darwin baselines. Linux CI runs all four comparisons and fails if
any canonical PNG is missing or differs.

### Visual baseline review

Canonical PNGs must be generated in a Linux/Chromium environment aligned with
CI, using the Playwright version pinned by `pnpm-lock.yaml` and the CI runner's
architecture (the committed baseline uses the amd64 image variant). Do not
generate or commit a baseline from macOS or a different Linux architecture.
The visual project disables automatic snapshot updates and uses strict pixel
comparison; CI can only compare committed PNGs.

For an intentional baseline change, run the update explicitly in the approved
Linux environment, inspect every expected/actual/diff image, then run two
ordinary comparison passes:

```bash
pnpm test:e2e:static:visual --update-snapshots
pnpm test:e2e:static:visual
pnpm test:e2e:static:visual
```

Review the PNG diff with the code change and commit the four baseline files
together. Updating snapshots is never part of the default test command.

Accessibility suppressions are intentionally local: there is no shared
site-wide rule-disable list. A suppression is permitted only beside the
specific page/rule, with the rule id, concrete reason, and exact scope written
in the test. It must not silently affect another page.

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
3. `pnpm build` generates static files in `out/`, then the Chromium artifact
   suite verifies that exact directory under the computed base path
4. The same verified `out/` directory is deployed to GitHub Pages

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

For releases, it must be a bare HTTPS origin: no path, query, hash, or
trailing slash. `http://localhost` is allowed only for local development. Put
any repository path in `BASE_PATH`, not in this value.

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

Use either an empty value or a normalized root-relative path without a trailing
slash (for example, `/blog`). It cannot contain an origin, query, or hash. When
`NEXT_PUBLIC_BASE_PATH` is set, it must exactly match `BASE_PATH`.

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

| Command                       | Description                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `pnpm dev`                    | Start development server                                                       |
| `pnpm build`                  | Production build to `out/`                                                     |
| `pnpm lint`                   | Run ESLint                                                                     |
| `pnpm lint:fix`               | Run ESLint with auto-fix                                                       |
| `pnpm format:check`           | Check Prettier formatting                                                      |
| `pnpm test`                   | Run unit tests                                                                 |
| `pnpm test:watch`             | Run tests in watch mode                                                        |
| `pnpm test:coverage`          | Run tests with coverage report                                                 |
| `pnpm preview:static`         | Serve the existing artifact at `/blog`                                         |
| `pnpm test:e2e:static`        | Run Chromium full + visual + WebKit smoke checks against the existing artifact |
| `pnpm test:e2e:static:a11y`   | Run the Chromium-only accessibility and keyboard gate                          |
| `pnpm test:e2e:static:visual` | Run the four strict Chromium visual comparisons                                |

## License

Private repository. All rights reserved.
