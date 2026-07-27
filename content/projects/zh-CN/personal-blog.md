---
title: "Personal Blog"
slug: "personal-blog"
date: "2026-04-02"
tags:
  - nextjs
  - typescript
  - tailwindcss
  - 中文博客
  - static-site
  - github-pages
description: "基于 Next.js 16 静态导出的中文个人作品站，包含类型安全的内容管线、CJK 阅读时间、标签感知推荐和完整测试验证。"
cover: "/assets/personal-blog-home.jpg"
source: "https://github.com/HashFlowSY/blog"
demo: "https://hashflowsy.github.io/blog"
role: "需求拆解、视觉重构、全栈开发"
duration: "持续迭代"
result: "静态部署、内容自动化与完整测试链路已落地"
template: false
featured: true
draft: false
---

## 概述

基于 Next.js 16 静态导出、部署至 GitHub Pages 的中文个人作品站。它把求职、项目合作和长期写作组织成一条清晰的浏览路径。核心特性包括泛型 Markdown 内容管线、CJK 感知阅读时间、标签感知的文章推荐和完整自动化验证。

## 内容管线

文章和项目共享同一套生命周期——frontmatter 解析、slug 解析、草稿过滤、日期排序——但 Zod schema 和输出类型各不相同。为此设计了 `createContentLoader<TSchema, TMeta, TFull>` 泛型工厂：接收一个 Zod schema 和两个映射回调（`toMeta`、`toFull`），返回类型安全的 `getAllMeta()`、`getAllFull()`、`getBySlug()` 接口。`src/lib/posts.ts` 和 `src/lib/projects.ts` 各自定义 schema，工厂处理其余全部逻辑。详见 `src/lib/content-loader.ts`。

## Markdown 渲染与 XSS 防护

博客通过 `dangerouslySetInnerHTML` 渲染 Markdown，因此 XSS 防护不可妥协。使用 `rehype-sanitize` 自定义白名单，仅放行代码高亮所需的 `data-meta`、`data-line`、`data-highlighted`、`data-language` 属性，其余一律拒绝。详见 `src/lib/markdown.ts`。

代码块管线串联三个自定义插件：`remark-code-meta` 提取 `{1,3-5}` 行高亮语法，`rehype-code-block` 将代码拆分为逐行 `<span>` 并标记高亮行，客户端 `CodeBlockEnhancer` 注入复制按钮。刻意不支持在 Markdown 中嵌入 React 组件或 iframe，将渲染面限制在标题、代码块、表格、引用等标准元素，保持白名单最小化。

## CJK 阅读时间

通用阅读时间估算（200 词/分钟）对中文失效——中文读者阅读速度约 500 字/分钟。估算器以 CJK Unicode 范围（覆盖 21 个区间）拆分文本，分别按字数和词数加权求和，准确支持中英混排。详见 `src/lib/reading-time.ts`。

## 文章推荐

文章详情页的相关阅读不会再只做机械切片，而是先排除当前文章，再按共享标签数量排序，同分时按发布时间接近度排序，最后用日期最新作为兜底。如果当前文章没有可用的共享标签，页面会退回展示“最新文章”，避免假相关。

列表页则直接把这组卡片命名为“最新阅读”，只承担最近文章入口，不再暗示相关性。这样详情页和列表页的职责更清楚，也更符合实际内容组织方式。

## 中文单站与 SEO

项目已经移除多语言路由和翻译文件，页面只保留中文路径。SEO 基础设施包括：自动生成中文站点 sitemap、RSS feed、Open Graph / Twitter Card 元数据。Canonical URL 基于 `NEXT_PUBLIC_SITE_URL` 环境变量动态计算，同一构建产物可在 localhost、预览和生产环境中复用。

## 测试与 CI

单元测试使用 Vitest + Testing Library，E2E 使用 Playwright。当前验证覆盖内容管线、阅读时间估算、Markdown 渲染器（含自定义 rehype/remark 插件）、RSS 生成器、核心 UI 组件、页面、导航交互，以及文章详情页的标签感知推荐逻辑。本地通过 Husky + lint-staged 在每次提交时强制执行 ESLint 和 Prettier。

## 设计取舍

- **静态导出 vs SSR**：零成本部署到 GitHub Pages，代价是没有服务端运行时——RSS 在构建时生成。
- **Markdown 中不支持 React 组件**：刻意收窄渲染面以消除 XSS 攻击面，白名单按最小权限原则设计。
- **AST 级行高亮**：`rehype-code-block` 操作 HAST 树生成逐行 `<span>`，支持任意范围高亮，使客户端能按行做 hover 效果和点击复制，而非依赖 CSS line-clamp hack。
- **统一暖白工程台界面**：全站使用同一套排版、网格、颜色和交互反馈，让项目、文章与个人信息保持一致。
