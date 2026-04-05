---
title: "Building a Static Blog with Next.js"
slug: "nextjs-static-export-guide"
date: "2026-04-01"
updated: "2026-04-02"
tags: ["nextjs", "github-pages", "tutorial"]
summary: "A guide to building a static blog with Next.js and deploying to GitHub Pages"
draft: false
---

# Building a Static Blog with Next.js

In this post, I'll walk through how to build a static blog using Next.js and deploy it to GitHub Pages.

## Why Static Export?

Static export (`output: 'export'`) pre-renders all pages at build time. This is perfect for content-focused sites like blogs because:

1. **Fast loading** - No server-side rendering at request time
2. **Free hosting** - GitHub Pages serves static files for free
3. **Security** - No server to attack
4. **CDN-ready** - Can be deployed to any CDN

## Setting Up the Project

Start by creating a Next.js project:

```bash
pnpm create next-app@latest blog --ts --tailwind --eslint --app --src-dir
```

Then configure `next.config.ts`:

```typescript
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};
```

## Managing Content with Markdown

Content is stored as Markdown files in a `content/` directory. Each file has frontmatter for metadata:

```yaml
---
title: "My Post"
slug: "my-post"
date: "2026-04-01"
tags: ["example"]
summary: "A short description"
---
```

> **Tip**: Use `gray-matter` to parse frontmatter and `remark` to convert Markdown to HTML.

## Handling i18n with next-intl

For multilingual support, use `next-intl` with `localePrefix: 'always'`:

```typescript
export const routing = defineRouting({
  locales: ["zh-CN", "en-US"],
  defaultLocale: "zh-CN",
  localePrefix: "always",
});
```

> **Note**: Static export doesn't support middleware, so always use explicit locale prefixes in URLs.

## Conclusion

Building a static blog with Next.js is straightforward and provides excellent performance. The combination of Next.js App Router, Markdown content, and GitHub Pages creates a powerful yet simple blogging platform.
