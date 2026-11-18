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

[首页](/)有一张可以互动的手绘工作台。可以切换台灯、拨动叶片，或点按键盘让屏幕显示图纸。开启系统的「减少动态效果」时，首页直接显示完整工作台。

[体验首页工作台](/) · [工作台设计记录](https://github.com/HashFlowSY/blog/blob/c57ab05f6eaa4ce5ee6e0a5090bfba1a26437660/docs/design/workbench-interaction-design.md)

---

[![首页手绘工作台，桌面摆着两台设备，右下方有一格黄色抽屉](/assets/projects/personal-blog/workbench-finished.webp)](/assets/projects/personal-blog/workbench-finished.webp)

## 构建与发布

文章和项目案例都用 Markdown 编写。构建时先校验内容，再生成静态页面、文章搜索索引、RSS 和站点地图。浏览器检查通过后，GitHub Pages 发布被检查的那份静态文件。

### 设计取舍

新增或修改内容后重新构建，访客打开时直接读取生成的文件。页面地址由 Markdown 里单独填写的标识决定，改标题或文件名不必改公开链接。[静态托管决定](https://github.com/HashFlowSY/blog/blob/44d8229/docs/adr/0001-keep-the-site-chinese-only-and-static.md)

---

### 内容管线

1. Markdown
2. 校验并编译
3. 导出 `out/`
4. 浏览器检查
5. 发布到 Pages

#### 测试与 CI

2026.11.17 · [查看 GitHub Pages 部署记录](https://github.com/HashFlowSY/blog/actions/runs/44017752385)

## 实现细节

### Markdown 渲染与 XSS 防护

文章和项目共用 Markdown 编译器。编译时忽略原始 HTML，过滤元素和链接，再用 Shiki 给代码配色。[Markdown 编译器](https://github.com/HashFlowSY/blog/blob/44d8229/src/lib/markdown/compile.ts)

### CJK 阅读时间

文章按每分钟 500 个中日韩文字字符或 200 个其他词估算阅读时间。[字词统计](https://github.com/HashFlowSY/blog/blob/c57ab05f6eaa4ce5ee6e0a5090bfba1a26437660/src/lib/markdown/analyze.ts)

### 文章推荐

最多推荐三篇。先比较共同标签数，再比较发布日期的距离；没有共同标签时展示最新文章。[推荐规则](https://github.com/HashFlowSY/blog/blob/44d8229/src/lib/related-reading.ts)

### 中文单站与 SEO

构建时根据站点域名和部署前缀生成规范网址与资源链接。[RSS](/feed.xml) · [站点地图](/sitemap.xml)
