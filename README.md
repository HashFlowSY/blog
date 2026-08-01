# Blog

A Chinese personal portfolio built with Next.js 16. It presents real Project Cases and technical writing, and is deployed as a static site on GitHub Pages.

## Features

- **Static Export** — Pure HTML/CSS/JS, no server required
- **Unified Portfolio UI** — One workbench and portfolio system across the home page, Project Cases, Posts, and about page
- **Strict Content Catalog** — Posts and Project Cases use explicit, Zod-validated frontmatter and build as one atomic snapshot
- **Chinese-Only Routes** — Root, posts, projects, about, RSS, sitemap, and content all target Chinese
- **Syntax Highlighting** — Code blocks with language labels, copy button, line highlighting
- **Writing Topics** — Post tags summarize current writing themes without client-side filtering
- **Post Reading Template** — Shared reading page template for every Post
- **SEO** — Sitemap, robots.txt, canonical URLs, noindex 404
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
└── projects/zh-CN/           # Chinese Project Cases (Markdown)

src/
├── app/
│   ├── layout.tsx            # Root layout + site shell
│   ├── globals.css           # Shared workbench and portfolio styles
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
│   └── project/              # Project Case card, list
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

`pnpm build` runs in production mode. The `http://localhost:3000` value above
is for `pnpm dev` only and is rejected by a production build. Pass a bare HTTPS
deployment origin explicitly so it overrides the local development settings:

```bash
NODE_ENV=production NEXT_PUBLIC_SITE_URL=https://example.com BASE_PATH= NEXT_PUBLIC_BASE_PATH= pnpm build
```

Replace `https://example.com` with the deployed site origin. Static output is
generated in the `out/` directory. Canonical URLs, RSS URLs, and sitemap URLs
are written into that artifact at build time. Rebuild separately for every
deployment target with its final origin and base path; do not reuse an artifact
between localhost, preview, and production.

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

Run the complete Chromium artifact suite, Chromium-only accessibility and
keyboard checks, focused visual project, and smaller WebKit smoke suite against
that same output with:

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

### Post

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

### Project Case

Create a Markdown file in `content/projects/zh-CN/`:

```markdown
---
title: "My Project"
slug: "my-project"
date: "2026-04-02"
tags: ["react", "typescript"]
description: "A brief project description."
cover: "/assets/my-project-cover.jpg"
source: "https://github.com/user/repo"
demo: "https://demo.example.com"
role: "My actual responsibility"
duration: "2026-01 to 2026-03"
result: "An outcome supported by evidence"
featured: true
draft: false
---

Detailed project description in Markdown.
```

### Template Case

`templates/project-case.md` is an internal Template Case. It is outside the
Content Catalog's scanned directories and is never public portfolio evidence.
Copy it only after real, publishable facts and a local cover asset are ready;
do not add a public `template` field.

### Draft

A Draft must explicitly declare `draft: true`. It may omit publication fields
and its Markdown body, but every field it provides must still have a valid type
and format.

### Markdown Support

Posts and Project Cases use safe static Markdown. Supported authoring features:

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

| Field     | Required for a published Post | Description                                                               |
| --------- | ----------------------------- | ------------------------------------------------------------------------- |
| `title`   | Yes                           | Non-empty title                                                           |
| `slug`    | Yes                           | Stable lowercase kebab-case URL segment; it never comes from the filename |
| `date`    | Yes                           | Real `YYYY-MM-DD` calendar date                                           |
| `updated` | No                            | Real `YYYY-MM-DD` date that is not earlier than `date`                    |
| `tags`    | Yes                           | At least one non-empty, unique tag after trimming                         |
| `summary` | Yes                           | Non-empty summary                                                         |
| `draft`   | Yes                           | Explicitly `false` for a published Post and `true` for a Draft            |

#### Project Case

| Field         | Required for a published Project Case | Description                                                               |
| ------------- | ------------------------------------- | ------------------------------------------------------------------------- |
| `title`       | Yes                                   | Non-empty title                                                           |
| `slug`        | Yes                                   | Stable lowercase kebab-case URL segment; it never comes from the filename |
| `date`        | Yes                                   | Real `YYYY-MM-DD` calendar date                                           |
| `tags`        | Yes                                   | At least one non-empty, unique tag after trimming                         |
| `description` | Yes                                   | Non-empty project summary                                                 |
| `cover`       | Yes                                   | Root-relative asset that exists inside `public/`                          |
| `role`        | Yes                                   | The author's actual responsibility                                        |
| `duration`    | Yes                                   | Actual participation or delivery period                                   |
| `result`      | Yes                                   | Outcome supported by publishable evidence                                 |
| `source`      | No                                    | Absolute HTTPS source URL                                                 |
| `demo`        | No                                    | Absolute HTTPS demo URL                                                   |
| `featured`    | Yes                                   | Explicit boolean controlling the home-page selection                      |
| `draft`       | Yes                                   | Explicitly `false` for a published Project Case and `true` for a Draft    |

Published Posts and Project Cases require a non-empty Markdown body. Both
schemas reject unknown frontmatter fields.

## Chinese-Only Routing

The site no longer uses locale-prefixed routes or translation files. Add Chinese content under `content/posts/zh-CN/` and `content/projects/zh-CN/`; public pages are served at `/`, `/posts/`, `/projects/`, `/about/`, and `/feed.xml`.

## Deployment

### GitHub Pages (Automatic)

The included GitHub Actions workflow (`deploy.yml`) handles everything:

1. Push to `main` triggers the workflow
2. `BASE_PATH` is auto-detected:
   - `username.github.io` → empty (root)
   - `username.github.io/repo-name` → `/repo-name`
3. The reusable quality workflow runs linting, non-incremental TypeScript,
   coverage, dependency audit, and the development-server Chromium suite
4. `pnpm build` generates static files in `out/`; Chromium, accessibility,
   focused Linux visual, and WebKit smoke checks verify that exact directory
   under the computed base path
5. The same verified `out/` directory is deployed to GitHub Pages

**Setup:**

1. Go to repo **Settings → Pages → Source**
2. Select **GitHub Actions** as the source
3. Go to **Settings → Secrets and variables → Actions → Variables**
4. Add `NEXT_PUBLIC_SITE_URL` to **Repository variables**(e.g. `https://username.github.io`)
5. Push to `main` — deployment starts automatically

### Custom Domain

Set `NEXT_PUBLIC_SITE_URL` to your domain in GitHub Variables, and configure DNS accordingly.

## Environment Variables

| Variable                | Required   | Description                                                           |
| ----------------------- | ---------- | --------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`  | Production | Build-time origin for sitemap, robots, RSS, and canonical URLs        |
| `BASE_PATH`             | No         | URL prefix for project pages; omitted or empty means the site root    |
| `NEXT_PUBLIC_BASE_PATH` | No         | Client-visible mirror of `BASE_PATH`; it must match when both are set |

### NEXT_PUBLIC_SITE_URL

The final deployment origin. During `pnpm build`, it is written into sitemap,
robots.txt, RSS feed URLs, and canonical links together with `BASE_PATH`.
Build again whenever either value changes; a static artifact is only valid for
the origin and base path used to create it.

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

| Command                                      | Description                                                          |
| -------------------------------------------- | -------------------------------------------------------------------- |
| `pnpm dev`                                   | Start the development server                                         |
| `pnpm build`                                 | Build the production static artifact in `out/`                       |
| `pnpm lint`                                  | Run ESLint                                                           |
| `pnpm lint:fix`                              | Run ESLint with auto-fix                                             |
| `pnpm format:check`                          | Check Prettier formatting                                            |
| `pnpm exec tsc --noEmit --incremental false` | Run the release TypeScript check                                     |
| `pnpm test`                                  | Run unit tests                                                       |
| `pnpm test:watch`                            | Run unit tests in watch mode                                         |
| `pnpm test:coverage`                         | Run unit tests with coverage                                         |
| `pnpm audit --audit-level moderate`          | Run the release dependency-audit policy                              |
| `pnpm test:e2e`                              | Run the development-server Chromium suite                            |
| `pnpm preview:static`                        | Serve an existing static artifact at `/blog` by default              |
| `pnpm test:e2e:static`                       | Run static Chromium, a11y, focused visual, and WebKit smoke projects |
| `pnpm test:e2e:static:chromium`              | Run the ordinary static Chromium suite                               |
| `pnpm test:e2e:static:a11y`                  | Run the Chromium-only accessibility and keyboard gate                |
| `pnpm test:e2e:static:visual`                | Run four strict Chromium visual comparisons on Linux only            |
| `pnpm test:e2e:static:webkit`                | Run the reduced static WebKit smoke suite                            |

## License

Private repository. All rights reserved.
