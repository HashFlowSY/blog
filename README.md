# Hashflow · 技术博客与作品集

我是 Hashflow。这里记录我使用 AI 工具和开发软件的实践，也展示我在项目中负责的工作、技术取舍和可核实的成果。站点用中文写作，由 Next.js 静态构建并部署到 GitHub Pages。

[在线首页](https://hashflowsy.github.io/blog/) · [技术写作](https://hashflowsy.github.io/blog/posts/) · [项目案例](https://hashflowsy.github.io/blog/projects/) · [关于与联系](https://hashflowsy.github.io/blog/about/#contact) · [RSS](https://hashflowsy.github.io/blog/feed.xml)

[![Hashflow 首页：左侧是个人介绍，右侧是手绘交互工作台](e2e/visual-regression.spec.ts-snapshots/home-desktop-chromium-visual-linux.png)](https://hashflowsy.github.io/blog/)

## 现在可以看什么

- **工作台**：铅笔在首页逐步画出工作台。画完后可拖动 360° 查看 Three.js 模型，也可操作抽屉和台灯。触屏上先点「操作工作台」；WebGL 不可用时会保留二维成稿。
- **两篇文章**：[用 Codex 定制桌面宠物：流程与踩坑](https://hashflowsy.github.io/blog/posts/2026-05-02/) 和 [AI 服务中转站：常见术语与风险清单](https://hashflowsy.github.io/blog/posts/2026-04-30/)。文章列表支持主题筛选和关键词搜索，详情提供目录、阅读进度、预计时长与推荐文章。
- **一个项目案例**：[Personal Blog](https://hashflowsy.github.io/blog/projects/personal-blog/) 记录了本站的实现与验证。后续案例待整理[可公开的项目事实和证据](.scratch/site-experience/issues/01-add-real-project-evidence.md)。

[部署记录](https://github.com/HashFlowSY/blog/actions/workflows/deploy.yml) · [现状调研与开源 README 对照](docs/research/readme-audit.md)

## 本地启动

使用 Node.js `24.22.2`（见 [`.nvmrc`](.nvmrc)，项目支持从此版本起的 Node.js 24.x）和 pnpm `11.28.10`。

```bash
git clone https://github.com/HashFlowSY/blog.git
cd blog
pnpm install --frozen-lockfile
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000)。本地开发可直接启动；如果需要生成带域名的链接，可在 `.env.local` 中设置 `NEXT_PUBLIC_SITE_URL=http://localhost:3000`。生产构建的地址要求见[构建与部署](#构建与部署)。

## 写作与发布

文章放在 [`content/posts/zh-CN/`](content/posts/zh-CN/)，项目放在 [`content/projects/zh-CN/`](content/projects/zh-CN/)。两类内容都使用目录下的 `.md` 文件，页面 URL 不含 `/zh-CN/`。

新建 `content/posts/zh-CN/static-deploy-notes.md`，例如：

```markdown
---
title: "一次静态站点部署记录"
slug: "static-deploy-notes"
date: "2026-11-14"
tags: ["静态站点"]
summary: "记录构建、产物检查和发布的过程。"
draft: false
---

## 构建产物

用 `pnpm build` 生成用于发布的静态文件。
```

运行开发服务器后，可在 `/posts/static-deploy-notes/` 查看这篇示例文章。`slug` 决定公开地址，与文件名无关，在同一内容集合内必须唯一。新内容用小写字母、数字和短横线组成描述性 slug。纯日期会被拒绝，历史地址 `2026-04-30` 和 `2026-05-02` 除外。[稳定链接约定](docs/adr/0003-use-explicit-stable-slugs.md)

`draft: true` 可暂留草稿，已填写的字段仍要通过校验。发布时设为 `draft: false`，并补齐必填字段和正文。文章可选填 `updated`，日期不得早于 `date`。YAML 中的未知字段和重复键会报错。[字段规则](src/lib/content-contracts.ts)

项目案例可参照[真实案例源码](content/projects/zh-CN/personal-blog.md)和[作者模板](templates/project-case.md)。项目用 `description` 代替 `summary`，另需填写 `role`、`duration`、`result`、`cover` 和 `featured`。封面必须是 `public/` 中已存在的文件，例如 `/assets/personal-blog-home.jpg`。`source`、`demo` 和 `evidence` 都可省略；填写 `evidence` 时需提供 `label` 和 `url`，所有这些外链均使用完整 HTTPS 地址。

### Markdown 约定

- 支持 CommonMark 及 GFM 表格、任务列表、脚注，自动生成标题锚点。同一篇内可用 `#构建产物` 这样的片段；链接到其他页面时使用目标页实际发布的锚点。
- 站内链接与图片使用 `/posts/example/`、`/assets/figure.png` 这类路径，编译时会加上部署前缀。原始 HTML 会被忽略，生成的正文按白名单净化。
- 代码由 Shiki 在构建时高亮，页面可复制原文。围栏可指定 [Shiki 支持的语言](https://shiki.style/languages)，例如 `typescript {1,3-5}` 会突出第 1、3 至 5 行。省略语言时按纯文本显示。未知语言、无效或越界的行号会导致构建报错。

## 构建与部署

用与静态验证默认值一致的 `/blog` 配置构建 `out/`：

```bash
NEXT_PUBLIC_SITE_URL=https://example.com BASE_PATH=/blog NEXT_PUBLIC_BASE_PATH=/blog pnpm build
```

如需在浏览器中手动检查产物，运行 `pnpm preview:static`，打开 [http://127.0.0.1:4173/blog/](http://127.0.0.1:4173/blog/)。运行自动化静态测试前，先关闭手动预览；Playwright 会自行启动预览服务。

| 构建变量                | 用途                                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`  | 生产构建必填，值为 HTTPS origin，例如 `https://hashflowsy.github.io`。末尾不加斜杠，也不带 `/blog`、查询参数或片段。 |
| `BASE_PATH`             | 站点部署前缀。本项目使用 `/blog`；部署在域名根路径时留空。非空值以 `/` 开头，末尾不加斜杠。                          |
| `NEXT_PUBLIC_BASE_PATH` | 由 Next.js 配置注入浏览器。若手动同时设置此变量和 `BASE_PATH`，两者必须一致。                                        |

canonical、RSS、站点地图和资源链接在构建时写入产物。更换域名或部署前缀时，用目标配置重新构建。

在 GitHub Pages 的 **Settings → Pages → Source** 选择 **GitHub Actions**，并在 **Settings → Secrets and variables → Actions → Variables** 设置 `NEXT_PUBLIC_SITE_URL`。推送到 `main` 或手动触发后，[发布流程](.github/workflows/deploy.yml)会读取 Pages 的路径配置，验证构建产物，再部署同一份 `out/`。

## 开发与验证

| 命令                                         | 检查内容                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| `pnpm lint` / `pnpm format:check`            | ESLint / Prettier 格式检查                                                |
| `pnpm exec tsc --noEmit --incremental false` | TypeScript 类型检查                                                       |
| `pnpm test` / `pnpm test:coverage`           | 单元测试 / 单元测试与覆盖率门槛                                           |
| `pnpm test:e2e`                              | 对开发服务器运行 Chromium 浏览器测试                                      |
| `pnpm test:e2e:static`                       | 对已构建的 `out/` 运行 Chromium、无障碍、Linux 截图比对和 WebKit 冒烟测试 |

提交到 `main` 的 PR 执行[共享质量检查](.github/workflows/quality.yml)，包括依赖审计。发布时还会验证静态产物，覆盖带 `/blog` 的页面、资源、RSS 和 404。浏览器安装、根路径测试和视觉基线更新见[静态产物验证指南](docs/static-verification.md)。完整脚本见 [`package.json`](package.json)。

## 源码入口

| 位置                                                       | 负责什么                                                                                     |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [`src/app/`](src/app/)                                     | Next.js App Router 的页面、RSS、站点地图和搜索索引入口                                       |
| [`src/components/home/`](src/components/home/)             | 铅笔动画和 Three.js 工作台，见[工作台设计及贴图生成](docs/design/workbench-assembly-plan.md) |
| [`src/lib/content-catalog.ts`](src/lib/content-catalog.ts) | 校验文章与案例并生成统一的内容快照，供页面、RSS、搜索和站点地图使用                          |
| [`src/lib/markdown/`](src/lib/markdown/)                   | Markdown 净化、目录与搜索文本提取、阅读统计和构建时 Shiki 高亮                               |
| [`src/lib/site.ts`](src/lib/site.ts)                       | 站点名称、联系入口和 URL 配置                                                                |

核心技术为 Next.js 16、React 19、TypeScript、Tailwind CSS 4、Three.js、Zod 和 Shiki。静态站点、稳定链接和真实案例等取舍见[架构决策记录](docs/adr/)。

## 许可证

本仓库公开可读，尚未声明开源许可证。保留所有权利。
