# 静态产物验证指南

GitHub Pages 部署的是 `out/`。[`pnpm test:e2e`](../playwright.config.ts) 提供开发服务器上的快速反馈；发布以[静态产物测试](../playwright.static.config.ts)为准。测试套件从预览服务器读取已有的 `out/`，其中的内容夹具测试会另建隔离站点验证 Markdown 行为。

## 在本地检查 `/blog` 产物

按 [README](../README.md#本地启动) 安装项目依赖。第一次运行浏览器测试时，安装 Playwright 需要的 Chromium 与 WebKit；Linux 如缺系统库，使用 `pnpm exec playwright install --with-deps chromium webkit`。

```bash
pnpm exec playwright install chromium webkit
NEXT_PUBLIC_SITE_URL=https://example.com BASE_PATH=/blog NEXT_PUBLIC_BASE_PATH=/blog pnpm build
pnpm test:e2e:static
```

测试默认使用 `https://example.com` 作为公开地址的 origin，自动在 `http://127.0.0.1:4173/blog/` 启动预览服务。先关闭占用该端口的手动预览。需要手动查看时，可以在测试结束后运行 `pnpm preview:static`。

验证域名根路径的产物时，先构建，再把预览挂载到 `/`：

```bash
NEXT_PUBLIC_SITE_URL=https://example.com BASE_PATH= NEXT_PUBLIC_BASE_PATH= pnpm build
PLAYWRIGHT_STATIC_BASE_URL=http://127.0.0.1:4173/ STATIC_BASE_PATH= pnpm test:e2e:static
```

使用其他公开域名构建时，测试命令还要设置 `PLAYWRIGHT_PUBLIC_ORIGIN`，其值应与构建的 `NEXT_PUBLIC_SITE_URL` 一致。若修改部署前缀，`PLAYWRIGHT_STATIC_BASE_URL` 的路径和 `STATIC_BASE_PATH` 必须匹配该前缀。手动预览使用 `STATIC_BASE_PATH`，例如 `STATIC_BASE_PATH= pnpm preview:static` 挂载在根路径。[URL 配置](../e2e/static-artifact-config.ts)

## 定位失败

| 命令                            | 检查范围                                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------------------------- |
| `pnpm test:e2e:static:chromium` | 静态页面、主要交互、资源地址、元数据、订阅、搜索和 404                                             |
| `pnpm test:e2e:static:a11y`     | Chromium 上的 axe 和键盘用例。扫描首页、文章与项目的列表和代表详情，以及返回 HTTP 404 的真实产物。 |
| `pnpm test:e2e:static:visual`   | Linux Chromium 的四张固定视口截图                                                                  |
| `pnpm test:e2e:static:webkit`   | WebKit 上的主要导航、工作台和阅读交互冒烟检查                                                      |

打开 `playwright-static-report/` 查看报告。截图和 trace 在 `test-results/static-artifact/<project>/`；视觉失败还会留下预期图、实际图和差异图。

[无障碍检查](../e2e/a11y.spec.ts)拦截 axe 标为 `serious` 或 `critical` 的问题，报告规则、影响等级、说明和元素定位。若必须排除某条规则，在对应页面的用例旁记录规则、原因和范围。

## 视觉基线

当前截图覆盖桌面首页、文章详情、项目详情和打开菜单的手机首页。基线位于 [`e2e/visual-regression.spec.ts-snapshots/`](../e2e/visual-regression.spec.ts-snapshots/)。桌面首页允许提示文字边缘出现 1 个抗锯齿差异像素，其余三张要求一致。[用例和容差](../e2e/visual-regression.spec.ts) · [固定视口和浏览器设置](../e2e/visual-regression-config.ts)

非 Linux 主机跳过截图比对。界面变更需要更新基线时，使用[发布工作流](../.github/workflows/deploy.yml)固定的 Linux amd64 Playwright 镜像与 Chromium 版本，构建对应的静态产物，再显式更新：

```bash
pnpm test:e2e:static:visual --update-snapshots
```

审阅更新前后的四张图及差异，然后执行两次 `pnpm test:e2e:static:visual`，确认普通比对稳定通过。默认测试命令不会更新基线。
