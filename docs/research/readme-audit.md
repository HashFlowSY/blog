# Hashflow 博客 README 调研

核查日期为 2026 年 11 月 14 日（北京时间）。源码以 `main` 的 `44d8229` 为基准，另查了公开的 GitHub Pages、仓库元数据和发布记录。开源项目的文档引用固定到读取时的提交。[源码基准](https://github.com/HashFlowSY/blog/tree/44d822982516f4fa86e3d49e1ae949484849f4c6) · [仓库元数据](https://api.github.com/repos/HashFlowSY/blog) · [基准发布记录](https://github.com/HashFlowSY/blog/actions/runs/43431260684)

## 已发布的网站与内容

这是 Hashflow 的中文个人网站，承载技术写作、项目案例、工程经历及求职与合作入口。首页展示手绘工作台、一个精选项目及最近文章。关于页的联系入口指向作者的 GitHub 主页。中文站点的内容路由以 `/posts/`、`/projects/` 开头。[首页源码](../../src/app/page.tsx) · [关于页源码](../../src/app/about/page.tsx) · [中文静态站决策](../adr/0001-keep-the-site-chinese-only-and-static.md)

GitHub Pages 的线上根地址为 `https://hashflowsy.github.io/blog/`。核查时，首页、文章列表、项目列表、关于页、两篇文章、一个项目详情、RSS、搜索索引、站点地图与爬虫配置的 HTTP GET 均返回 200。RSS 和搜索索引均收录两篇文章，站点地图列出两篇文章和一个项目详情。访问不存在的路径返回 404。[首页](https://hashflowsy.github.io/blog/) · [文章](https://hashflowsy.github.io/blog/posts/) · [项目](https://hashflowsy.github.io/blog/projects/) · [关于](https://hashflowsy.github.io/blog/about/) · [RSS](https://hashflowsy.github.io/blog/feed.xml) · [搜索索引](https://hashflowsy.github.io/blog/search-index.json) · [站点地图](https://hashflowsy.github.io/blog/sitemap.xml) · [robots.txt](https://hashflowsy.github.io/blog/robots.txt) · [404 页面源码](../../src/app/not-found.tsx)

- **用 Codex 定制桌面宠物：流程与踩坑**。文章的 `draft` 为 `false`，slug 为 `2026-05-02`。[内容源文件](../../content/posts/zh-CN/26-05-02.md) · [线上文章](https://hashflowsy.github.io/blog/posts/2026-05-02/)
- **AI 服务中转站：常见术语与风险清单**。文章的 `draft` 为 `false`，slug 为 `2026-04-30`。[内容源文件](../../content/posts/zh-CN/26-04-30.md) · [线上文章](https://hashflowsy.github.io/blog/posts/2026-04-30/)
- **Personal Blog**。当前唯一的真实项目案例，同时为首页精选。案例公开了本人的角色、成果、源代码、演示和一项构建校验证据。[内容源文件](../../content/projects/zh-CN/personal-blog.md) · [线上案例](https://hashflowsy.github.io/blog/projects/personal-blog/)

现有公开文章以文字为主，代码高亮与复制功能有隔离样例和自动化验收支持。项目作者模板存放在 `templates/`，供作者起草案例时使用。[文章目录](../../content/posts/zh-CN) · [项目目录](../../content/projects/zh-CN) · [作者模板](../../templates/project-case.md) · [Shiki 迁移验收](../../.scratch/shiki-markdown-migration/acceptance.md)

## 当前实现

- **静态站点。** Next.js 16 App Router 开启 `output: "export"`、`trailingSlash: true` 和静态图片配置。文章和项目详情由已发布的 slug 生成，RSS、搜索索引、站点地图与爬虫配置随站点导出。[Next.js 配置](../../next.config.ts) · [文章详情](../../src/app/posts/[slug]/page.tsx) · [项目详情](../../src/app/projects/[slug]/page.tsx) · [RSS 路由](../../src/app/feed.xml/route.ts) · [站点地图](../../src/app/sitemap.ts) · [爬虫配置](../../src/app/robots.ts)
- **首页工作台。** 逐笔构建的二维成稿可切换到 Three.js 环绕视角，部分部件可以操作。桌面拖动旋转，键盘可调整视角，触屏先启用“操作工作台”，默认手势可继续滚动页面。[绘制和触屏入口](../../src/components/home/assembly-workbench.tsx) · [环绕与键盘交互](../../src/components/home/workbench-orbit.tsx) · [交互设计](../design/workbench-interaction-design.md)
- **浏览与阅读。** 文章按主题筛选，可按标题、摘要、标签、正文进行关键词搜索，浏览器在首次关键词搜索时请求静态索引。文章详情提供目录、进度、字词数和预计时长。推荐最多三篇，有共同标签时显示关联阅读，否则显示最新文章。项目详情展示角色、周期、成果、可公开链接及可放大的封面。[文章归档](../../src/components/post/post-archive.tsx) · [搜索规则](../../src/lib/post-search.ts) · [阅读组件](../../src/components/post/article-detail.tsx) · [推荐规则](../../src/lib/related-reading.ts) · [项目详情](../../src/app/projects/[slug]/page.tsx)
- **内容目录。** 扫描范围是 `content/posts/zh-CN/` 和 `content/projects/zh-CN/` 的直接子文件 `.md`。先解析 YAML，再用 Zod 校验两类内容并汇总错误，通过后才编译已发布的 Markdown。生产环境由内容目录读取器缓存构建快照，页面、RSS、搜索索引和站点地图使用同一入口。[内容目录实现](../../src/lib/content-catalog.ts) · [内容契约](../../src/lib/content-contracts.ts) · [原子快照决策](../adr/0005-build-an-atomic-content-catalog.md)
- **正文编译。** 共用 CommonMark 和 GFM 处理链路，支持表格、任务列表、脚注、图片和标题锚点。处理链路忽略 Markdown 中的原始 HTML，再对正文树执行白名单净化。目录、正文搜索片段和阅读统计从同一正文树提取，Shiki 在构建时高亮代码并校验语言和行范围。复制控件接收作者原文，块级代码可搜索，阅读时间估算排除块级代码。[Markdown 编译入口](../../src/lib/markdown/compile.ts) · [净化规则](../../src/lib/markdown/semantics.ts) · [正文分析](../../src/lib/markdown/analyze.ts) · [代码高亮](../../src/lib/markdown/highlight.ts) · [正文组件](../../src/components/markdown/document-body.tsx)

### 写作契约

- 两类内容都在文件开头用 `---` 包裹 YAML 1.2 映射。`draft` 必须显式填写。`draft: true` 可省略发布字段和正文，已填字段继续接受校验。`draft: false` 需要必填字段与非空正文。重复 YAML 键和未知字段会报错。[YAML 解析](../../src/lib/markdown/frontmatter.ts) · [内容契约](../../src/lib/content-contracts.ts)
- 已发布文章必填 `title`、`slug`、`date`、`tags`、`summary`、`draft`，`updated` 可省略且不得早于 `date`。每个集合中的 slug 唯一，使用小写字母、数字和短横线组成的稳定地址。两个已发布文章的纯日期 slug 是保留例外，新条目要用描述内容的 slug。文件名与 URL 各自独立。[内容契约](../../src/lib/content-contracts.ts) · [稳定链接决策](../adr/0003-use-explicit-stable-slugs.md)
- 已发布项目必填 `title`、`slug`、`date`、`tags`、`description`、`cover`、`role`、`duration`、`result`、`featured`、`draft`。`source`、`demo` 和 `evidence` 可省略，填写的链接用绝对 HTTPS URL。`cover` 必须对应 `public/` 内实际存在的文件，例如 `/assets/personal-blog-home.jpg`。实际成果应有可核实的依据。[内容契约](../../src/lib/content-contracts.ts) · [真实案例决策](../adr/0004-publish-only-real-project-cases.md) · [作者模板](../../templates/project-case.md)
- 正文站内链接和图片可以写 `/posts/example/`、`/assets/figure.png` 等从根路径开始的地址，编译时按部署前缀改写。代码围栏可以用 `typescript {1,3-5}` 指定高亮行，超出代码块行数和未知语言会给出源文件位置。文章与案例的作者入口使用 `.md`。[链接改写](../../src/lib/markdown/links.ts) · [围栏规则](../../src/lib/markdown/highlight.ts) · [编译测试](../../src/lib/markdown/compile.spec.ts)

### 本地运行与发布

- `.nvmrc` 固定 Node.js `24.22.2`，`package.json` 允许 `>=24.22.2 <25`，包管理器为 `pnpm@11.28.10`。`pnpm dev` 启动 Next.js 开发服务器，`NEXT_PUBLIC_SITE_URL` 开发时可省略，也可设为 `http://localhost:3000`。[Node 版本文件](../../.nvmrc) · [脚本及依赖](../../package.json) · [站点配置](../../src/lib/site.ts)
- `pnpm build` 需要纯 HTTPS origin，域名之后的路径、末尾斜杠、查询参数与片段均不属于该值。实际线上构建的 origin 为 `https://hashflowsy.github.io`，Pages 子路径为 `/blog`。`BASE_PATH` 可省略或置空以部署在站点根路径。Next.js 会为浏览器注入 `NEXT_PUBLIC_BASE_PATH`，同时显式提供两个变量时值须一致。更换 origin 或部署路径要重新生成 `out/`。[站点配置](../../src/lib/site.ts) · [Next.js 配置](../../next.config.ts) · [发布工作流](../../.github/workflows/deploy.yml) · [线上 RSS](https://hashflowsy.github.io/blog/feed.xml)
- `pnpm preview:static` 服务已有的 `out/`，默认打开 `http://127.0.0.1:4173/blog/`。静态 Playwright 同样默认 `/blog`，并自行启动预览服务器，要求该地址没有其他预览进程占用。用测试默认值时，先以 `https://example.com` 为 `NEXT_PUBLIC_SITE_URL`、`/blog` 为 `BASE_PATH` 生成产物。测试实际发布配置时，用 `PLAYWRIGHT_PUBLIC_ORIGIN` 和 `PLAYWRIGHT_STATIC_BASE_URL` 对应构建的 origin 和预览挂载路径。[静态预览脚本](../../scripts/serve-static.mts) · [静态测试配置](../../playwright.static.config.ts) · [产物 URL 约定](../../e2e/static-artifact-config.ts)
- 发往 `main` 的 PR 执行共享质量流程，包括 ESLint、TypeScript、Vitest 覆盖率、依赖审计和开发服务器上的 Chromium E2E。`main` 推送或手动触发部署时复用质量流程，随后构建、验证部署路径下的静态资源地址及 `out/`，通过 Chromium 功能、axe 无障碍、Linux Chromium 截图和 WebKit 冒烟检查后部署同一份产物。[PR 工作流](../../.github/workflows/ci.yml) · [质量工作流](../../.github/workflows/quality.yml) · [发布工作流](../../.github/workflows/deploy.yml) · [测试覆盖率配置](../../vitest.config.mts)
- 无障碍测试拦截 axe 的 `serious` 和 `critical` 结果，另有键盘路径用例。视觉测试有四张基线，只在 Linux 上执行。桌面首页允许一个抗锯齿差异像素，其余三张要求零差异。README 可直接引用配置与用例，依赖环境固定在发布工作流中。[无障碍用例](../../e2e/a11y.spec.ts) · [视觉用例](../../e2e/visual-regression.spec.ts) · [视觉配置](../../e2e/visual-regression-config.ts) · [发布镜像](../../.github/workflows/deploy.yml)

## 开发进度

- **静态站点加固。** 加固地图标记 `completed`，运行环境、内容契约、原子内容目录及发布验证等 20 项均为 `resolved`。[加固地图](../../.scratch/static-blog-hardening/map.md)
- **首页与阅读改版。** 11 月 8 日提交首页 360° 工作台，11 月 12 日加入可交互部件，11 月 13 日调整页面滚动与触屏操作，并加入正文搜索和阅读改进。[首页改版](https://github.com/HashFlowSY/blog/commit/13e2995be92ef58ac499e6be8c2da10677263c62) · [部件交互](https://github.com/HashFlowSY/blog/commit/c6bc7508f82f14a59f924c3e814f31d027815e66) · [浏览与阅读改进](https://github.com/HashFlowSY/blog/commit/43fe48049edc57be5f92cb357460ff8eb31c3b23)
- **Shiki 迁移。** 11 月 13 日提交到 `main`，规格标记 `implemented`，验收记录保留了历史测试及构建测量。迁移提交的 Pages 运行在静态浏览器测试步骤失败。后续 `44d8229` 将桌面首页截图容差调整为一个像素，并完成发布。[迁移规格](../../.scratch/shiki-markdown-migration/spec.md) · [验收记录](../../.scratch/shiki-markdown-migration/acceptance.md) · [迁移提交](https://github.com/HashFlowSY/blog/commit/2eb99f059bf867674ef406a9a41a3651ab36a19c) · [历史失败运行](https://github.com/HashFlowSY/blog/actions/runs/43423780615) · [后续发布](https://github.com/HashFlowSY/blog/actions/runs/43431260684)
- **当前发布。** `44d8229` 的部署在 11 月 13 日 21:17（北京时间）成功完成。GitHub 的质量、静态构建和部署任务记录均为 `success`。这是该提交的 CI 结果，本调研通过读取运行记录和线上 HTTP 响应进行核查。[发布概览](https://github.com/HashFlowSY/blog/actions/runs/43431260684) · [质量任务](https://github.com/HashFlowSY/blog/actions/runs/43431260684/job/131905121524) · [产物任务](https://github.com/HashFlowSY/blog/actions/runs/43431260684/job/131906692809) · [部署任务](https://github.com/HashFlowSY/blog/actions/runs/43431260684/job/131908570776)
- **待补充案例。** 站点体验地图将新增真实项目案例标记为 `ready-for-human`。该事项需要作者提供至少两个可公开的真实项目，并核实本人的职责、成果、证据与封面。README 的案例介绍以当前已公开的项目为准。[站点体验地图](../../.scratch/site-experience/map.md) · [待补充事项](../../.scratch/site-experience/issues/01-add-real-project-evidence.md)

本次重构在 macOS 使用 Node.js `24.22.2` 验证了 `pnpm dev`，首页、文章列表、项目详情与 RSS 均返回 200。按 README 的 `/blog` 参数构建 `out/` 也成功，核对了 canonical、搜索索引和爬虫配置。静态浏览器套件通过 51 项，4 项仅在 Linux 执行的截图比对按配置跳过。[本地启动](../../README.md#本地启动) · [静态验证步骤](../static-verification.md)

## 原 README 需要修订的地方

- **站点入口。** 旧版有 492 行，以英文 `Blog` 和通用功能清单开头，缺少实际站点地址，安装命令仍用 `<repo-url>`。使用站点显示的 Hashflow 名称和中文定位，在文档开头放首页、文章、项目、关于与 RSS。开发章节写实际 HTTPS clone 地址。[旧版 README](https://github.com/HashFlowSY/blog/blob/44d822982516f4fa86e3d49e1ae949484849f4c6/README.md#L1-L19) · [旧版安装段](https://github.com/HashFlowSY/blog/blob/44d822982516f4fa86e3d49e1ae949484849f4c6/README.md#L79-L110) · [站点配置](../../src/lib/site.ts)
- **命令与配置。** 同一组 origin 和路径规则出现在安装、构建、部署、环境变量四处，完整视觉基线流程放在写作之前。在本地启动后给出简洁的内容维护步骤与可运行的静态构建示例。质量门槛和产物检查可引用源码与现有文档。[旧版构建与测试](https://github.com/HashFlowSY/blog/blob/44d822982516f4fa86e3d49e1ae949484849f4c6/README.md#L112-L241) · [站点配置](../../src/lib/site.ts) · [静态产物决策](../adr/0002-test-the-deployable-static-artifact.md)
- **写作规范。** 旧版 frontmatter 表说明了 kebab-case，遗漏纯日期 slug 的规则和两个保留例外。“XSS Safe”把具体措施写成了绝对结论。用一个可复制的中文文章示例、真实项目及作者模板说明写作规范，并精确描述原始 HTML 的处理和白名单净化。[旧版内容规则](https://github.com/HashFlowSY/blog/blob/44d822982516f4fa86e3d49e1ae949484849f4c6/README.md#L307-L360) · [内容契约](../../src/lib/content-contracts.ts) · [正文净化](../../src/lib/markdown/semantics.ts)
- **仓库与许可。** 旧版将仓库标为私有。当前 GitHub 元数据为 `private: false`、`license: null`，Git 树中没有 `LICENSE` 或 `COPYING`。纠正仓库可见性，说明项目没有声明开源许可证，保留原版权表述的授权边界。[旧版许可段](https://github.com/HashFlowSY/blog/blob/44d822982516f4fa86e3d49e1ae949484849f4c6/README.md#L490-L492) · [公开仓库](https://github.com/HashFlowSY/blog) · [仓库元数据](https://api.github.com/repos/HashFlowSY/blog)

## 开源博客的 README 参考

选了同技术栈的博客模板、重视内容维护的静态博客、入口较短的成熟主题和真实个人站。比较重点是访客能否打开实际页面，维护者能否找到内容入口、运行命令和完整文档。

- **Tailwind Nextjs Starter Blog** 用实际文章链接演示 Markdown、图片、长文和嵌套路由。快速开始逐步指出站点元数据、作者、项目和文章的修改位置，正文维护段给出 frontmatter 参考。本项目可展示两篇真实文章与 `Personal Blog`，并给出内容目录、站点配置位置和一份可复制的中文文章示例。[示例与快速开始](https://github.com/timlrx/tailwind-nextjs-starter-blog/blob/b45bef66b40c63b6f57c15ee8cd090682238df4c/README.md#sample-posts) · [文章字段](https://github.com/timlrx/tailwind-nextjs-starter-blog/blob/b45bef66b40c63b6f57c15ee8cd090682238df4c/README.md#frontmatter)
- **AstroPaper** 在介绍后链接线上文章和文档，目录树旁说明文章存放位置。配置、写作和样式入口分别链接 Markdown 源文件及发布页面。本项目的公开页面可用线上地址，编辑入口可用源码相对链接。写作示例后可链接内容契约、项目模板和设计记录。[README 开头](https://github.com/satnaing/astro-paper/blob/832f645d604270cfe3a9d4465c4b4fbc50256b8f/README.md#L1-L14) · [内容目录和文档](https://github.com/satnaing/astro-paper/blob/832f645d604270cfe3a9d4465c4b4fbc50256b8f/README.md#L42-L84)
- **Hugo PaperMod** 在开头并列在线示例、文档和示例站源码。较长的安装、功能、FAQ 和变量解释通过 Wiki 入口继续阅读。本项目可把线上站点放在页面前部，复用已有 ADR、设计记录和验收记录承接技术细节。[README 的入口与文档索引](https://github.com/adityatelange/hugo-PaperMod/blob/118119693d8b5ac211b939775678310973bcb232/README.md)
- **brianm.me** 是真实个人作品站，首段用一句话说明用途并链接线上站点。开发段给出启动、生产构建、产物位置与 `package.json`。本项目可突出 `pnpm dev`、`pnpm build`、`out/` 以及静态发布所需的 origin 和路径，其余脚本链接到清单。[个人站 README](https://github.com/BrianMitchL/brianm.me/blob/b35061aa1cbdf3e527898d830bdf034f94e46835/README.md#L1-L22)

## 重构后的信息顺序

1. **站点与阅读入口。** 一句话说明 Hashflow 的中文技术写作和作品用途，链接真实站点、文章、项目、关于和 RSS。若需要一张视觉预览，可采用仓库中现有的桌面首页基线，注明它是固定视口的首页截图。[首页源码](../../src/app/page.tsx) · [首页视觉基线](../../e2e/visual-regression.spec.ts-snapshots/home-desktop-chromium-visual-linux.png)
2. **当前内容与实现。** 说明本次核查时的两篇文章、一个项目案例和待补充真实案例事项。用工作台、文章浏览和 Markdown 构建三个具体实现串起能力介绍，并链接最新发布记录。[文章目录](../../content/posts/zh-CN) · [项目目录](../../content/projects/zh-CN) · [待补充事项](../../.scratch/site-experience/issues/01-add-real-project-evidence.md) · [发布记录](https://github.com/HashFlowSY/blog/actions/runs/43431260684)
3. **运行与写作。** 给出固定版本、克隆与启动命令、内容目录、一个最小有效文章示例。保留 `draft`、新 slug、`cover` 和项目证据的实际要求，链接作者模板及内容契约。[运行脚本](../../package.json) · [Node 版本](../../.nvmrc) · [作者模板](../../templates/project-case.md) · [内容契约](../../src/lib/content-contracts.ts)
4. **构建、测试与部署。** 给一个能与静态预览默认值相配的 `/blog` 示例。说明手动预览的端口和 Playwright 自动启动预览的行为，引用现有工作流作为发布条件的依据。文末提供源码、设计、决策和调研链接及许可证状态。[站点配置](../../src/lib/site.ts) · [静态测试配置](../../playwright.static.config.ts) · [发布工作流](../../.github/workflows/deploy.yml) · [工作台设计记录](../design/workbench-assembly-plan.md) · [仓库元数据](https://api.github.com/repos/HashFlowSY/blog)
