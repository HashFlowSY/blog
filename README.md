# Hashflow · 技术博客与作品集

我是 Hashflow，主要关注 AI 应用、后端系统和自动化交付。我在这里记录工具实践和项目复盘，整理自己负责的工作、技术取舍和可核实的成果。文章和案例用中文 Markdown 编写，由 Next.js 构建为静态页面并发布到 GitHub Pages。

[在线首页](https://hashflowsy.github.io/blog/) · [技术写作](https://hashflowsy.github.io/blog/posts/) · [项目案例](https://hashflowsy.github.io/blog/projects/) · [关于与联系](https://hashflowsy.github.io/blog/about/#contact) · [RSS](https://hashflowsy.github.io/blog/feed.xml)

[![Hashflow 首页：左侧是个人介绍，右侧是手绘交互工作台](e2e/visual-regression.spec.ts-snapshots/home-desktop-chromium-visual-linux.png)](https://hashflowsy.github.io/blog/)

## 现在可以看什么

- **首页工作台**。首次进入视口时，铅笔先画背景和透视线，再逐件画桌子、摆件和挂板工具。完整播放约 25 秒，切到后台时暂停。选择「直接体验」可跳到成稿，用鼠标、触屏或键盘开关工作灯、拨动叶片和触发屏幕绘图。同一标签页返回首页时可以直接操作，也可以选择「重看绘制」。系统开启「减少动态效果」时直接显示完整工作台。
- **技术写作**。文章列表可按主题筛选，也可搜索标题、摘要、标签及正文。仅正文命中时会显示匹配片段，搜索与筛选条件可以随网址分享。文章详情提供目录、阅读进度、预计时长和推荐文章。[试搜「验收条件」](https://hashflowsy.github.io/blog/posts/?q=%E9%AA%8C%E6%94%B6%E6%9D%A1%E4%BB%B6)
- **项目案例**。目前发布了一篇案例，介绍本站的文章检索、手绘工作台和静态发布流程，并提供在线演示、源码和部署记录。[Personal Blog](https://hashflowsy.github.io/blog/projects/personal-blog/)
- **关于我**。关于页列出工程经历和能力范围，求职与合作区提供 GitHub 主页入口。

目前有两篇公开文章。[用 Codex 定制桌面宠物：流程与踩坑](https://hashflowsy.github.io/blog/posts/2026-05-02/) · [AI 服务中转站：常见术语与风险清单](https://hashflowsy.github.io/blog/posts/2026-04-30/)

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

可以新建 `content/posts/zh-CN/static-deploy-notes.md`，填入以下内容。

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

运行开发服务器后，可在 `/posts/static-deploy-notes/` 查看示例。`slug` 决定公开地址，在同一内容集合内必须唯一。用小写字母、数字和短横线组成描述性 slug。只有两篇已发布文章保留 `YYYY-MM-DD` 格式的历史 slug。改标题或文件名时可以保留原 slug，继续使用原来的公开地址。[稳定链接约定](docs/adr/0003-use-explicit-stable-slugs.md)

`draft: true` 可暂留草稿，已填写的字段仍要通过校验。发布时设为 `draft: false`，并补齐必填字段和正文。文章可选填 `updated`，日期不得早于 `date`。YAML 中的未知字段和重复键会报错。[字段规则](src/lib/content-contracts.ts)

项目用 `description` 代替文章的 `summary`，另需填写 `role`、`duration`、`result`、`cover` 和 `featured`。`cover` 指向 `public/` 中已存在的文件，例如 `/assets/personal-blog-home.jpg`。`source`、`demo` 和 `evidence` 为可选字段。填写 `evidence` 时需提供 `label` 和 `url`。这些外链均使用完整 HTTPS 地址。[已发布案例源码](content/projects/zh-CN/personal-blog.md) · [项目模板](templates/project-case.md)

`cover` 同时用于首页卡片、项目列表和详情页首屏。读者从卡片打开案例时，封面会移到详情页的位置；点击详情大图可查看原图。有独立功能截图时，在项目 Markdown 的 `showcase.screenshots` 中填写本地图片路径、缩略图名称和图注，读者即可点选切换。[字段示例](templates/project-case.md#可选的详情展示)

截图、运行结果和验证记录也可以跟着章节展示。设置 `showcase.chapters: true`，用二级标题分章，在说明和材料之间加一个独立的 `---`。宽屏上各章的材料随阅读接替右侧位置，小屏上材料跟在所属章节下。至少有两章时显示目录。有两章或更多附带材料时，项目列表的「项目速览」提供最多三个入口，可直达相应内容。

### Markdown 约定

- 支持 CommonMark 及 GFM 表格、任务列表、脚注，并自动生成标题锚点。篇内可用 `#构建产物` 这样的片段。跨页链接使用目标页实际生成的锚点。修改已发布的标题时，检查受影响的锚点链接。
- 站内链接与图片使用 `/posts/example/`、`/assets/figure.png` 这类路径，编译时会加上部署前缀。原始 HTML 会被忽略，生成的正文按白名单净化。
- 代码由 Shiki 在构建时高亮，页面可复制原文。围栏可指定 [Shiki 支持的语言](https://shiki.style/languages)，例如 `typescript {1,3-5}` 会突出第 1、3 至 5 行。省略语言时按纯文本显示。未知语言、无效或越界的行号会导致构建报错。

## 构建与部署

用以下命令构建 `out/`。示例域名和 `/blog` 前缀与本地静态测试的默认配置一致。

```bash
NEXT_PUBLIC_SITE_URL=https://example.com BASE_PATH=/blog pnpm build
```

如需在浏览器中手动检查产物，运行 `pnpm preview:static`，打开 [http://127.0.0.1:4173/blog/](http://127.0.0.1:4173/blog/)。运行自动化静态测试前，先关闭手动预览；Playwright 会自行启动预览服务。

| 构建变量                | 用途                                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`  | 生产构建必填，值为 HTTPS origin，例如 `https://hashflowsy.github.io`。末尾不加斜杠，也不带 `/blog`、查询参数或片段。 |
| `BASE_PATH`             | 站点部署前缀。本项目使用 `/blog`；部署在域名根路径时留空。非空值以 `/` 开头，末尾不加斜杠。                          |
| `NEXT_PUBLIC_BASE_PATH` | 由 Next.js 配置注入浏览器。若手动同时设置此变量和 `BASE_PATH`，两者必须一致。                                        |

构建产物包含页面、文章搜索索引 `search-index.json`、RSS 和站点地图。页面的 canonical 地址和资源链接也在构建时确定。更换域名或部署前缀时，用目标配置重新构建。

在 GitHub Pages 的 **Settings → Pages → Source** 选择 **GitHub Actions**，并在 **Settings → Secrets and variables → Actions → Variables** 设置 `NEXT_PUBLIC_SITE_URL`。推送到 `main` 或手动触发后，工作流会读取 Pages 的路径配置，执行质量检查，再构建、验证并发布同一份 `out/`。[发布工作流](.github/workflows/deploy.yml) · [部署记录](https://github.com/HashFlowSY/blog/actions/workflows/deploy.yml)

## 开发与验证

首次运行 `pnpm test:e2e` 前，执行 `pnpm exec playwright install chromium` 安装浏览器。静态产物测试还需要 WebKit，截图比对在 Linux 上运行。

| 命令                                         | 检查内容                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| `pnpm lint` / `pnpm format:check`            | ESLint / Prettier 格式检查                                                |
| `pnpm exec tsc --noEmit --incremental false` | TypeScript 类型检查                                                       |
| `pnpm test` / `pnpm test:coverage`           | 单元测试 / 单元测试与覆盖率门槛                                           |
| `pnpm test:e2e`                              | 对开发服务器运行 Chromium 浏览器测试                                      |
| `pnpm test:e2e:static`                       | 对已构建的 `out/` 运行 Chromium、无障碍、Linux 截图比对和 WebKit 冒烟测试 |

面向 `main` 的拉取请求执行 lint、类型检查、覆盖率测试、依赖审计和 Chromium 测试。[共享质量检查](.github/workflows/quality.yml)

发布时还会验证带 `/blog` 前缀的页面、资源、文章搜索、RSS 和 404。浏览器安装、根路径测试和视觉基线更新见[静态产物验证指南](docs/static-verification.md)。完整命令见 [`package.json`](package.json)。

## 源码入口

| 位置                                                       | 负责什么                                                                                      |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [`src/app/`](src/app/)                                     | Next.js App Router 的页面、RSS、站点地图和搜索索引入口                                        |
| [`src/components/home/`](src/components/home/)             | 铅笔绘制及电脑、叶片和灯光的交互，见[工作台设计](docs/design/workbench-interaction-design.md) |
| [`src/lib/content-catalog.ts`](src/lib/content-catalog.ts) | 校验文章与案例并生成统一的内容快照，供页面、RSS、搜索和站点地图使用                           |
| [`src/lib/markdown/`](src/lib/markdown/)                   | Markdown 净化、目录与搜索文本提取、阅读统计和构建时 Shiki 高亮                                |
| [`src/lib/post-search.ts`](src/lib/post-search.ts)         | 浏览器按需加载静态文章索引，匹配关键词并生成正文片段                                          |
| [`src/lib/site.ts`](src/lib/site.ts)                       | 站点名称、联系入口和 URL 配置                                                                 |

核心技术为 Next.js 16、React 19、TypeScript、Tailwind CSS 4、SVG、Zod 和 Shiki。静态站点、稳定链接和真实案例等取舍见[架构决策记录](docs/adr/)。

## 许可证

本仓库公开可读，尚未声明开源许可证。保留所有权利。
