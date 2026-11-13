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
result: "文章缺少必填字段时，静态站点构建失败，阻止不完整内容发布。"
evidence:
  label: "查看缺少字段时的构建校验测试"
  url: "https://github.com/HashFlowSY/blog/blob/c6bc7508f82f14a59f924c3e814f31d027815e66/src/lib/content-catalog.spec.ts#L645-L681"
featured: true
draft: false
---

## 概述

基于 Next.js 16 静态导出、部署至 GitHub Pages 的中文个人作品站。它把求职、项目合作和长期写作组织成一条清晰的浏览路径。核心特性包括原子化 Content Catalog、CJK 感知阅读时间、标签感知的文章推荐和完整自动化验证。

## 内容管线

每次构建都会创建一个原子的 Content Catalog：统一发现文章和项目案例，解析 frontmatter，执行严格契约与跨文件校验，渲染 Markdown，并按稳定 slug 建立索引。页面、静态参数、RSS、sitemap 和元数据读取同一份不可变快照；任一内容出错时，构建会在生成部分站点前失败。详见 `src/lib/content-catalog.ts`。

## Markdown 渲染与 XSS 防护

文章和项目案例共用一个 Markdown 编译器。它只解析一次正文，丢弃原始 HTML，按白名单净化元素、属性和链接，再从同一棵树生成目录、搜索片段和阅读统计。正文在构建时转成 React 元素。

Shiki 在构建时给代码分词和配色。代码围栏可以用 `{1,3-5}` 标出重点行，超出实际行数会报出源文件位置。复制按钮使用代码节点的原文，保留空行、Tab 和行尾空格。

## CJK 阅读时间

文章详情分别显示字数、词数和预计阅读时长，列表卡片显示预计时长。以正文可读文字为准，块级代码可搜索但不计入估时。估算参数为每分钟 500 个 CJK 字符、200 个其他词。

## 文章推荐

文章详情最多推荐三篇其他文章。有共同标签时依次按共同标签数、发布时间距离、日期和 slug 排序。没有共同标签时显示“最新文章”。

## 中文单站与 SEO

项目已经移除多语言路由和翻译文件，页面只保留中文路径。SEO 基础设施包括：自动生成中文站点 sitemap、RSS feed 和 canonical URL。canonical、RSS 与 sitemap 会在构建时按 `NEXT_PUBLIC_SITE_URL` 和 `BASE_PATH` 写入静态产物；每个部署目标都必须使用最终 origin 和 base path 重新构建，不能在 localhost、预览和生产环境之间复用同一份产物。

## 测试与 CI

单元测试使用 Vitest 和 Testing Library，浏览器验收使用 Playwright。静态样例覆盖代码高亮、剪贴板、脚注跳转、搜索和本地图片路径；真实页面检查目录、回顶、窄屏术语表及发布链接。本地通过 Husky 和 lint-staged 在提交时运行 ESLint 和 Prettier。

## 设计取舍

- **静态导出 vs SSR**：零成本部署到 GitHub Pages，代价是没有服务端运行时——RSS 在构建时生成。
- **Markdown 中不支持 React 组件**：刻意收窄渲染面以消除 XSS 攻击面，白名单按最小权限原则设计。
- **构建时高亮**：浏览器接收已上色的代码和一个复制按钮。Shiki 和语法包只在服务端使用。
- **统一暖白工程台界面**：全站使用同一套排版、网格、颜色和交互反馈，让项目、文章与个人信息保持一致。
