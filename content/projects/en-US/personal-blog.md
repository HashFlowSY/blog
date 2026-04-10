---
title: "Personal Blog"
slug: "personal-blog"
date: "2026-04-02"
tags:
  - nextjs
  - typescript
  - tailwindcss
  - i18n
  - static-site
  - github-pages
description: "基于 Next.js 16 静态导出的中英双语个人博客，泛型内容管线、CJK 阅读时间估算、构建时全文搜索、484 个测试用例。"
source: "https://github.com/HashFlowSY/blog"
demo: "https://hashflowsy.github.io/blog"
featured: true
draft: false
---

## 概述

基于 Next.js 16 静态导出、部署至 GitHub Pages 的中英双语个人博客。零服务器成本，运行时零 JS 开销。核心特性：泛型 Markdown 内容管线、CJK 感知阅读时间、构建时全文搜索。40 个测试文件、484 个用例、4 任务并行 CI。

## 内容管线

文章和项目共享同一套生命周期——frontmatter 解析、slug 解析、草稿过滤、日期排序——但 Zod schema 和输出类型各不相同。为此设计了 `createContentLoader<TSchema, TMeta, TFull>` 泛型工厂：接收一个 Zod schema 和两个映射回调（`toMeta`、`toFull`），返回类型安全的 `getAllMeta()`、`getAllFull()`、`getBySlug()` 接口。`src/lib/posts.ts` 和 `src/lib/projects.ts` 各自定义 schema，工厂处理其余全部逻辑。详见 `src/lib/content-loader.ts`。

## Markdown 渲染与 XSS 防护

博客通过 `dangerouslySetInnerHTML` 渲染 Markdown，因此 XSS 防护不可妥协。使用 `rehype-sanitize` 自定义白名单，仅放行代码高亮所需的 `data-meta`、`data-line`、`data-highlighted`、`data-language` 属性，其余一律拒绝。详见 `src/lib/markdown.ts`。

代码块管线串联三个自定义插件：`remark-code-meta` 提取 `{1,3-5}` 行高亮语法，`rehype-code-block` 将代码拆分为逐行 `<span>` 并标记高亮行，客户端 `CodeBlockEnhancer` 注入复制按钮。刻意不支持在 Markdown 中嵌入 React 组件或 iframe，将渲染面限制在标题、代码块、表格、引用等标准元素，保持白名单最小化。

## CJK 阅读时间与构建时搜索

通用阅读时间估算（200 词/分钟）对中文失效——中文读者阅读速度约 500 字/分钟。估算器以 CJK Unicode 范围（覆盖 21 个区间）拆分文本，分别按字数和词数加权求和，准确支持中英混排。详见 `src/lib/reading-time.ts`。

全文搜索基于 Fuse.js，索引在构建时生成：prebuild 脚本剥离 Markdown 语法、截取前 2000 字符、写入按 locale 分组的 JSON 文件。搜索字段权重：title 0.4、summary 0.25、tags 0.2、content 0.15。选择构建时方案是因为 `output: "export"` 模式下没有服务端运行时。详见 `src/scripts/generate-search-index.ts`。

## 国际化与 SEO

通过 `next-intl` 实现中英双语，`localePrefix: "always"`，所有页面为两种 locale 静态生成。翻译文件按 locale 和 namespace 组织在 `src/messages/` 下。SEO 基础设施包括：自动生成覆盖所有 locale 变体的 sitemap、双语 RSS feed、Open Graph / Twitter Card 元数据、文章页的 JSON-LD 结构化数据（`BlogPosting` schema）。Canonical URL 基于 `NEXT_PUBLIC_SITE_URL` 环境变量动态计算，同一构建产物可在 localhost、预览和生产环境中复用。

## 测试与 CI

单元测试使用 Vitest + Testing Library。40 个测试文件共 484 个用例，覆盖内容管线、阅读时间估算、Markdown 渲染器（含自定义 rehype/remark 插件）、RSS 生成器、搜索索引生成器、所有 UI 组件和页面。CI 流水线并行执行 4 个任务（lint、typecheck、单元测试+覆盖率、依赖审计），全部通过后才触发构建。本地通过 Husky + lint-staged 在每次提交时强制执行 ESLint 和 Prettier。

## 设计取舍

- **静态导出 vs SSR**：零成本部署到 GitHub Pages，代价是没有服务端运行时——搜索完全在客户端执行，RSS 在构建时生成。
- **Markdown 中不支持 React 组件**：刻意收窄渲染面以消除 XSS 攻击面，白名单按最小权限原则设计。
- **AST 级行高亮**：`rehype-code-block` 操作 HAST 树生成逐行 `<span>`，支持任意范围高亮，使客户端能按行做 hover 效果和点击复制，而非依赖 CSS line-clamp hack。
- **Fuse.js vs Algolia**：无外部服务依赖、无需 API Key 管理、离线可用。代价是客户端包体积增大、索引随内容增长——对个人博客规模可接受。
- **next-themes 暗色模式**：主题状态持久化在 `localStorage`，首次访问尊重 `prefers-color-scheme`。CSS 变量方案避免了 class-toggle 策略的闪烁问题。
