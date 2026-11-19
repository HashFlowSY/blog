---
title: "Personal Blog"
slug: "personal-blog"
date: "2026-04-02"
tags:
  - nextjs
  - typescript
  - svg
  - shiki
  - github-pages
  - tailwindcss
description: "Hashflow 的中文技术博客与作品集，收录 AI 工具实践和项目复盘。文章支持按主题筛选和全文搜索。"
cover: "/assets/personal-blog-home.jpg"
source: "https://github.com/HashFlowSY/blog"
demo: "https://hashflowsy.github.io/blog/"
role: "设计、开发和维护网站，并搭建 Markdown 发布流程"
duration: "2026 年 4 月至今"
result: "中文技术博客与作品集，已发布到 GitHub Pages。支持按主题筛选文章和搜索正文。"
showcase:
  eyebrow: "个人博客 · 已上线"
  intro: "我用这个站点发布中文技术文章和项目案例，记录做过的尝试、遇到的问题和可以查证的结果。"
  demoLabel: "浏览博客"
  chapters: true
featured: true
draft: false
---

## 概述

[技术写作](/posts/)记录工具怎么用、实际操作中遇到了什么。[项目案例](/projects/)说明我在项目里负责什么、为什么选了这个方案，以及结果怎么验证。

---

### 已发布文章

- [AI 服务中转站：常见术语与风险清单](/posts/2026-04-30/)

  梳理官方订阅、API 转发和计费倍率，列出使用前要核对的事项。

- [用 Codex 定制桌面宠物：流程与踩坑](/posts/2026-05-02/)

  记录从确认参考图到验收动作资源的定制过程。

## 文章检索

文章列表可以按主题筛选，也可以搜索标题、摘要、标签和正文。关键词只出现在正文里时，列表会显示包含它的片段。

---

### 搜索示例

搜索：`验收条件`

**用 Codex 定制桌面宠物：流程与踩坑**

> …越早把可接受范围和**验收条件**说清楚，后续成本越低。

[试这次搜索](/posts/?q=验收条件)

## 首页交互工作台

[首页](/)的手绘工作台会在素材加载完毕并进入视口后自动播放。铅笔先画墙面、地面和透视线，再逐件画出桌子、电脑、盆栽和挂板工具，全程约 25 秒。切到后台时暂停，回到页面后接着画。

收笔后，可以开关工作灯、拨动叶片，或操作笔记本、外接显示器和键盘，让对应的屏幕逐笔画出图纸。部件支持鼠标、触屏和键盘操作。系统开启「减少动态效果」时，直接显示完整工作台。

[体验首页工作台](/) · [工作台设计记录](https://github.com/HashFlowSY/blog/blob/083ac431f4daa60fd7cf570174562fa37709e8cc/docs/design/workbench-interaction-design.md)

---

[![首页手绘工作台，桌面摆着两台设备，右下方有一格黄色抽屉](/assets/projects/personal-blog/workbench-finished.webp)](/assets/projects/personal-blog/workbench-finished.webp)

## 构建与发布

文章和项目案例都用 Markdown 编写。构建时校验内容字段并编译正文，然后用 Next.js 生成静态页面、文章搜索索引、RSS 和站点地图。读者搜索时，浏览器按需加载静态索引并匹配文章。

### 设计取舍

新增或修改内容后重新构建，访客打开时直接读取生成的文件。页面地址由 Markdown 中的 `slug` 字段决定，改标题或文件名时可以沿用原来的公开链接。[静态托管决定](https://github.com/HashFlowSY/blog/blob/44d8229/docs/adr/0001-keep-the-site-chinese-only-and-static.md)

---

### 内容管线

1. Markdown
2. 校验并编译
3. 导出 `out/`
4. 浏览器检查
5. 发布到 Pages

#### 测试与 CI

GitHub Actions 对 `out/` 中的静态文件执行浏览器和无障碍检查，随后将同一份文件发布到 GitHub Pages。

2026.11.19 · [查看 GitHub Pages 部署记录](https://github.com/HashFlowSY/blog/actions/runs/44463840286)

## 实现细节

### Markdown 渲染与 XSS 防护

文章和项目共用 Markdown 编译器。编译时忽略原始 HTML，过滤元素和链接，再用 Shiki 给代码配色。[Markdown 编译器](https://github.com/HashFlowSY/blog/blob/44d8229/src/lib/markdown/compile.ts)

### CJK 阅读时间

文章按每分钟 500 个中日韩文字字符或 200 个其他词估算阅读时间。[字词统计](https://github.com/HashFlowSY/blog/blob/c57ab05f6eaa4ce5ee6e0a5090bfba1a26437660/src/lib/markdown/analyze.ts)

### 文章推荐

最多推荐三篇有共同标签的文章。共同标签多的排在前面，数量相同时优先推荐发布日期更接近的文章。找不到同标签的文章时，展示其他最新文章。[推荐规则](https://github.com/HashFlowSY/blog/blob/44d8229/src/lib/related-reading.ts)

### 中文单站与 SEO

构建时根据站点域名和部署前缀生成规范网址与资源链接。[RSS](/feed.xml) · [站点地图](/sitemap.xml)
