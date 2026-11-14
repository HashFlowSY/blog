---
title: "Personal Blog"
slug: "personal-blog"
date: "2026-04-02"
tags:
  - nextjs
  - typescript
  - threejs
  - shiki
  - github-pages
  - tailwindcss
description: "Hashflow 的中文技术博客与作品集，包含手绘 3D 工作台、文章全文搜索和构建时 Markdown 渲染。"
cover: "/assets/personal-blog-home.jpg"
source: "https://github.com/HashFlowSY/blog"
demo: "https://hashflowsy.github.io/blog/"
role: "站点设计与开发、内容构建、发布维护"
duration: "2026 年 4 月至今"
result: "站点已在 GitHub Pages 上线，公开了两篇技术文章和一个项目案例。"
evidence:
  label: "查看 GitHub Pages 部署记录"
  url: "https://github.com/HashFlowSY/blog/actions/runs/43431260684"
featured: true
draft: false
---

## 概述

我用这个站点发布技术写作、记录项目决策，并提供求职和项目合作的联系入口。项目详情展示我负责的工作、实际成果和公开证据。[技术写作](/posts/) · [关于与联系](/about/#contact)

## 首页交互工作台

首页先逐笔画出工作台，绘制完成后可以拖动旋转 360°。访客可以开关工作灯、拉出抽屉、打开工具箱，也可以转动台钳。触屏上先点「操作工作台」，再用单指旋转、双指缩放。WebGL 初始化失败时会保留二维成稿。

二维成稿和 Three.js 模型共用几何、铅笔贴图和参考相机。拖动时切换到已经绘好的三维画面，回到初始视角且部件归位后重新显示成稿。[建模与贴图方案](https://github.com/HashFlowSY/blog/blob/44d8229/docs/design/workbench-assembly-plan.md) · [交互设计](https://github.com/HashFlowSY/blog/blob/44d8229/docs/design/workbench-interaction-design.md)

## 内容管线

构建时，内容目录（Content Catalog）统一读取文章和项目的 Markdown 文件，校验 frontmatter、slug 和项目封面路径，再编译已发布的正文。页面、搜索索引、RSS 和站点地图从同一份内容快照读取数据。缺少必填字段或出现重复 slug 时，内容目录会汇总错误并中止构建。[内容目录实现](https://github.com/HashFlowSY/blog/blob/44d8229/src/lib/content-catalog.ts)

## Markdown 渲染与 XSS 防护

文章和项目案例共用 Markdown 编译器，支持 GFM 表格、任务列表和脚注。编译器忽略原始 HTML，按白名单过滤元素、属性和链接。正文、目录、搜索片段和阅读统计都来自处理后的正文树。

Shiki 在构建时给代码配色。代码围栏可以用 `{1,3-5}` 标出重点行，行号越界或语言无法识别时，构建会报告源文件位置。复制按钮使用代码原文，保留空行、Tab 和行尾空格。[Markdown 编译器](https://github.com/HashFlowSY/blog/blob/44d8229/src/lib/markdown/compile.ts)

## 文章检索

文章列表支持主题筛选和关键词搜索。关键词可以匹配标题、摘要、标签和正文。关键词只命中正文时，会显示命中片段。浏览器在首次关键词搜索时加载构建生成的静态索引。[打开文章列表](/posts/)

## CJK 阅读时间

文章详情显示目录、阅读进度、字词数和预计阅读时长，列表卡片也显示预计时长。估算按每分钟 500 个中日韩文字字符或 200 个其他词计算。代码块进入搜索索引，阅读统计从可读正文中取数。

## 文章推荐

文章详情最多推荐三篇其他文章。有共同标签时先比较共同标签数，再比较发布日期的距离。找不到共同标签时显示最新文章。[推荐规则](https://github.com/HashFlowSY/blog/blob/44d8229/src/lib/related-reading.ts)

## 中文单站与 SEO

站点以中文发布，文章和项目路径分别从 `/posts/` 和 `/projects/` 开始。Next.js 16 静态导出页面、RSS 和站点地图，构建时按目标域名与 `/blog` 部署前缀生成 canonical 地址和资源链接。部署地址变化时重新构建。[RSS](/feed.xml) · [站点地图](/sitemap.xml)

## 测试与 CI

GitHub Actions 先运行 ESLint、TypeScript 类型检查、Vitest 覆盖率、依赖审计和开发服务器上的 Chromium 测试。Next.js 导出 `out/` 后，再用 Playwright 检查待发布文件，覆盖 Chromium 页面交互、axe 无障碍、Linux 截图比对和 WebKit 冒烟测试。通过后部署同一份产物。[发布工作流](https://github.com/HashFlowSY/blog/blob/44d8229/.github/workflows/deploy.yml)

## 设计取舍

- **静态托管。** GitHub Pages 直接提供 HTML 和资源文件。文章、搜索索引和 RSS 随每次发布更新。[静态站点决策](https://github.com/HashFlowSY/blog/blob/44d8229/docs/adr/0001-keep-the-site-chinese-only-and-static.md)
- **稳定链接。** 公开地址由显式 slug 决定，调整文件名或文章标题时可以保留原有链接。[slug 约定](https://github.com/HashFlowSY/blog/blob/44d8229/docs/adr/0003-use-explicit-stable-slugs.md)
