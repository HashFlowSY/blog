import { spawn } from "node:child_process";
import { once } from "node:events";
import { cp, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect } from "@playwright/test";

import { STABLE_PROJECT, STABLE_POST, test } from "./fixtures";

import type { Page } from "@playwright/test";
import type { ChildProcess } from "node:child_process";

const fixtureSlug = "fixture-stability-check";
const fixtureTitle = "隔离测试文章";
const caseSlug = "fixture-markdown-case";
const caseTitle = "隔离测试项目";
const caseSearchToken = "仅项目正文";
const draftSearchToken = "私有草稿索引探针";
const imagePath = "/assets/personal-blog-home.jpg";
const primaryCode = [
  "",
  "/* 跨行注释",
  "\t结束 */  ",
  "const needle = '<script>代码片段探针</script>';",
  "",
].join("\n");
const projectCode = "const name = 'Shiki';";
const body = [
  "## 示例",
  "",
  "使用 **Shiki** 阅读[说明][home]，查看 `codeToHast`。[^tip][^tip]",
  "",
  "[home]: /posts/2026-04-30/?q=API#user-content-使用前的检查清单",
  "",
  "[回到标题](#示例)",
  "",
  "![样例截图][cover]",
  "",
  `[cover]: ${imagePath} "样例图片题注"`,
  "",
  "- [x] 完成",
  "",
  "- [ ] 未完成",
  "",
  "| 左 | 中 | 右 |",
  "| :--- | :---: | ---: |",
  `| 左 | 中 | ${"content".repeat(35)} |`,
  "",
  "```ts {3}",
  primaryCode,
  "```",
  "",
  "    " + "indented_".repeat(50),
  "",
  "```text",
  "```",
  "",
  "[^tip]: 保留空行。",
  "",
  "<script>document.body.dataset.fixtureInjected = 'true'</script>",
].join("\n");

const fixtureFile = `---
title: "${fixtureTitle}"
slug: "${fixtureSlug}"
date: "2027-01-01"
updated: "2027-01-02"
tags: ["测试"]
summary: "用于验证静态正文。"
draft: false
---

${body}
`;

const projectFixtureFile = `---
title: "${caseTitle}"
slug: "${caseSlug}"
date: "2027-01-01"
tags: ["测试"]
description: "用同一套编译器生成的项目正文。"
cover: "${imagePath}"
role: "测试"
duration: "一次构建"
result: "可以阅读正文"
featured: false
draft: false
---

${caseSearchToken}

\`\`\`js {1}
${projectCode}
\`\`\`
`;

const draftFixtureFile = `---
draft: true
---

${draftSearchToken}

\`\`\`not-a-language
草稿不进入编译
\`\`\`
`;

const workspaceEntries = [
  "content",
  "next.config.ts",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "postcss.config.mjs",
  "public",
  "scripts",
  "src",
  "tsconfig.json",
  "vitest.setup.ts",
] as const;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function findFreePort(): Promise<number> {
  const listener = createServer();
  await new Promise<void>((resolve, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", () => resolve());
  });

  const address = listener.address();
  if (!address || typeof address === "string") {
    listener.close();
    throw new Error("Unable to allocate a temporary preview port");
  }

  const port = address.port;
  await new Promise<void>((resolve, reject) => {
    listener.close((error) => (error ? reject(error) : resolve()));
  });
  return port;
}

async function createFixtureWorkspace(repositoryRoot: string): Promise<string> {
  const workspace = await mkdtemp(
    path.join(repositoryRoot, ".scratch/e2e-fixture-"),
  );

  for (const entry of workspaceEntries) {
    await cp(path.join(repositoryRoot, entry), path.join(workspace, entry), {
      recursive: true,
    });
  }

  await symlink(
    path.join(repositoryRoot, "node_modules"),
    path.join(workspace, "node_modules"),
    "junction",
  );
  await writeFile(
    path.join(workspace, "content/posts/zh-CN/fixture-stability-check.md"),
    fixtureFile,
    "utf8",
  );
  await writeFile(
    path.join(workspace, "content/posts/zh-CN/draft-search-check.md"),
    draftFixtureFile,
    "utf8",
  );
  await writeFile(
    path.join(workspace, "content/projects/zh-CN", `${caseSlug}.md`),
    projectFixtureFile,
    "utf8",
  );

  return workspace;
}

function collectProcessOutput(process: ChildProcess): {
  output: () => string;
  stop: () => void;
} {
  let output = "";
  const append = (chunk: Buffer | string) => {
    output += chunk.toString();
  };
  process.stdout?.on("data", append);
  process.stderr?.on("data", append);

  return {
    output: () => output,
    stop: () => {
      process.stdout?.removeListener("data", append);
      process.stderr?.removeListener("data", append);
    },
  };
}

async function runCommand(
  command: string,
  args: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): Promise<void> {
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = collectProcessOutput(child);
  const [result] = await once(child, "close");
  output.stop();

  const exitCode = typeof result === "number" ? result : 1;
  if (exitCode !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with exit code ${exitCode}:\n${output.output()}`,
    );
  }
}

async function waitForPreview(
  previewUrl: string,
  server: ChildProcess,
  output: () => string,
): Promise<void> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Static fixture preview exited early:\n${output()}`);
    }

    try {
      const response = await fetch(previewUrl);
      if (response.status === 200) return;
    } catch {
      // The server may still be binding its temporary port.
    }

    await wait(250);
  }

  throw new Error(`Timed out waiting for fixture preview:\n${output()}`);
}

async function stopProcess(process: ChildProcess): Promise<void> {
  if (process.exitCode !== null) return;

  process.kill("SIGTERM");
  await Promise.race([once(process, "close"), wait(5_000)]);
  if (process.exitCode === null) process.kill("SIGKILL");
}

async function verifyMarkdown(page: Page, basePath: string) {
  const code = page.getByRole("figure", { name: "ts 代码" });
  await expect(code.getByLabel("ts 源码").locator(".highlighted")).toHaveText(
    "结束 */",
  );
  await expect(code.getByLabel("ts 源码")).toHaveAttribute("tabindex", "0");
  const noteReferences = page.locator("[data-footnote-ref]");
  await expect(noteReferences).toHaveCount(2);
  await page.getByRole("link", { name: "说明" }).focus();
  await page.keyboard.press("Tab");
  await expect(noteReferences.first()).toBeFocused();
  for (const reference of await noteReferences.all()) {
    const href = await reference.getAttribute("href");
    const referenceId = await reference.getAttribute("id");
    const labelId = await reference.getAttribute("aria-describedby");
    expect(href).toMatch(/^#user-content-footnote:fn-/);
    const note = page.locator(`[id="${href?.slice(1)}"]`);
    await expect(page.locator(`[id="${labelId}"]`)).toHaveText("脚注");
    await reference.press("Enter");
    await expect(note).toBeFocused();
    const returnLink = note.locator(`[href="#${referenceId}"]`);
    await expect(returnLink).toHaveAccessibleName(/返回脚注 1 的引用/);
    await returnLink.press("Enter");
    await expect(reference).toBeFocused();
  }

  const figure = page.getByRole("img", { name: "样例截图" });
  await expect(figure).toHaveAttribute("title", "样例图片题注");
  await expect(figure).toHaveAttribute("src", basePath + imagePath);
  await expect
    .poll(() =>
      figure.evaluate(
        (node: HTMLImageElement) => node.complete && node.naturalWidth > 0,
      ),
    )
    .toBe(true);
  await expect(page.getByRole("link", { name: "说明" })).toHaveAttribute(
    "href",
    `${basePath}/posts/2026-04-30/?q=API#${encodeURIComponent("user-content-使用前的检查清单")}`,
  );
  const checked = page.getByRole("checkbox", { name: "完成", exact: true });
  const unchecked = page.getByRole("checkbox", { name: "未完成", exact: true });
  await expect(checked).toBeChecked();
  await expect(checked).toBeDisabled();
  await expect(unchecked).not.toBeChecked();
  await expect(unchecked).toBeDisabled();
  for (const [name, alignment] of [
    ["左", "left"],
    ["中", "center"],
    ["右", "right"],
  ] as const) {
    await expect(page.getByRole("columnheader", { name })).toHaveCSS(
      "text-align",
      alignment,
    );
  }
  expect(
    await page.locator("body").getAttribute("data-fixture-injected"),
  ).toBeNull();
}

test.describe("isolated Markdown static artifact", () => {
  test("publishes shared Markdown, reads the real clipboard and keeps isolated content out of real pages", async ({
    browser,
  }) => {
    test.setTimeout(180_000);

    const repositoryRoot = process.cwd();
    const workspace = await createFixtureWorkspace(repositoryRoot);
    const port = await findFreePort();
    const basePath = process.env["STATIC_BASE_PATH"] ?? "/blog";
    const origin = `http://127.0.0.1:${port}`;
    const previewUrl = `${origin}${basePath}/`;
    let server: ChildProcess | undefined;
    let context: Awaited<ReturnType<typeof browser.newContext>> | undefined;

    try {
      await runCommand("pnpm", ["build"], workspace, {
        ...process.env,
        NODE_ENV: "production",
        NEXT_PUBLIC_SITE_URL: "https://example.com",
        BASE_PATH: basePath,
        NEXT_PUBLIC_BASE_PATH: basePath,
      });

      server = spawn("pnpm", ["preview:static"], {
        cwd: workspace,
        env: {
          ...process.env,
          HOST: "127.0.0.1",
          PORT: String(port),
          STATIC_BASE_PATH: basePath,
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      const serverOutput = collectProcessOutput(server);
      await waitForPreview(previewUrl, server, serverOutput.output);

      const indexResponse = await fetch(`${previewUrl}search-index.json`);
      expect(indexResponse.status).toBe(200);
      expect(indexResponse.headers.get("content-type")).toMatch(
        /application\/json/,
      );
      const index = await indexResponse.text();
      expect(JSON.parse(index)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            slug: fixtureSlug,
            blocks: expect.arrayContaining([
              expect.stringContaining("代码片段探针"),
              "保留空行。",
            ]),
          }),
        ]),
      );
      expect(index).not.toContain(draftSearchToken);
      expect(index).not.toContain(caseSearchToken);
      expect(index).not.toContain("fixtureInjected");
      expect(
        (await fetch(`${previewUrl}posts/draft-search-check/`)).status,
      ).toBe(404);

      context = await browser.newContext({
        permissions: ["clipboard-read", "clipboard-write"],
        reducedMotion: "reduce",
        hasTouch: true,
      });
      const page = await context.newPage();
      await page.goto(previewUrl);
      await page.waitForLoadState("networkidle");

      await expect(
        page.getByRole("heading", { name: /Hashflow AI 全栈工程师/ }),
      ).toBeVisible();
      expect(
        await page
          .locator(`a[href$="/projects/${STABLE_PROJECT.slug}/"]`)
          .count(),
      ).toBeGreaterThan(0);
      await expect(page.locator('nav[aria-label="主导航"]')).toBeVisible();

      const postsLink = page
        .locator('nav[aria-label="主导航"]')
        .getByRole("link", { name: "文章", exact: true });
      await Promise.all([
        page.waitForURL((url) => url.pathname.endsWith("/posts/")),
        postsLink.click(),
      ]);

      await expect(
        page.getByRole("link", {
          name: STABLE_POST.title,
          exact: true,
        }),
      ).toBeVisible();
      const fixtureCard = page.getByRole("link", {
        name: fixtureTitle,
        exact: true,
      });
      await expect(fixtureCard.getByText("约 1 分钟")).toBeVisible();
      await fixtureCard.click();
      await expect(page).toHaveURL(`${previewUrl}posts/${fixtureSlug}/`);
      const code = page.getByRole("figure", { name: "ts 代码" });
      const copy = code.getByRole("button", { name: "复制代码" });
      await copy.press("Enter");
      await expect(code.getByRole("status")).toHaveText("已复制");
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        primaryCode,
      );
      await expect(code.getByRole("status")).toBeEmpty();
      await verifyMarkdown(page, basePath);
      const scan = await new AxeBuilder({ page })
        .include("#article-body")
        .analyze();
      expect(
        scan.violations.filter(
          ({ impact }) => impact === "serious" || impact === "critical",
        ),
      ).toEqual([]);
      await expect(
        page.getByText(/^正文 \d+ 字 · \d+ 词 · 约 1 分钟$/),
      ).toBeVisible();
      await expect(page.getByText("更新于 2027.01.02")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "最新文章" }),
      ).toBeVisible();
      await page.setViewportSize({ width: 320, height: 760 });
      const scrolls = await page.evaluate(() => ({
        pageFits: document.documentElement.scrollWidth <= window.innerWidth,
        codeScrolls: Array.from(document.querySelectorAll("pre")).some(
          (node) => node.scrollWidth > node.clientWidth,
        ),
        tableScrolls: Array.from(
          document.querySelectorAll('[aria-label="正文表格"]'),
        ).some((node) => node.scrollWidth > node.clientWidth),
      }));
      expect(scrolls).toEqual({
        pageFits: true,
        codeScrolls: true,
        tableScrolls: true,
      });

      await page.goto(`${previewUrl}posts/${fixtureSlug}/`);
      await copy.press("Space");
      await expect(code.getByRole("status")).toHaveText("已复制");
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        primaryCode,
      );
      const plain = page.getByRole("figure", { name: "纯文本 代码" });
      await plain.getByRole("button", { name: "复制代码" }).tap();
      await expect(plain.getByRole("status")).toHaveText("已复制");
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        "indented_".repeat(50),
      );

      await page.goto(`${previewUrl}projects/${caseSlug}/`);
      await expect(
        page.getByRole("heading", { name: caseTitle }),
      ).toBeVisible();
      const projectBlock = page.getByRole("figure", { name: "js 代码" });
      await expect(
        projectBlock.getByLabel("js 源码").locator(".highlighted"),
      ).toHaveText(projectCode);
      await expect(page.getByText(/^正文 \d+ 字/)).toHaveCount(0);

      const noJs = await browser.newContext({ javaScriptEnabled: false });
      try {
        const staticPage = await noJs.newPage();
        const response = await staticPage.goto(
          `${previewUrl}posts/${fixtureSlug}/`,
        );
        if (!response?.ok()) throw new Error("Missing compiled fixture HTML.");
        const html = await response.text();
        expect(html).toContain("shiki github-dark-high-contrast");
        await expect(staticPage.getByText(/^正文 \d+ 字/)).toBeVisible();
        await expect(staticPage.getByRole("table")).toBeVisible();
        await staticPage.getByRole("link", { name: "回到标题" }).click();
        await expect(
          staticPage.getByRole("heading", { name: "示例" }),
        ).toBeFocused();
        await staticPage.locator("[data-footnote-ref]").first().press("Enter");
        const back = staticPage.getByRole("link", {
          name: "返回脚注 1 的引用（第 1 处）",
        });
        await back.press("Enter");
        await expect(
          staticPage.locator("[data-footnote-ref]").first(),
        ).toBeFocused();
        await staticPage.getByRole("link", { name: "说明" }).click();
        await expect(
          staticPage.getByRole("heading", { name: "使用前的检查清单" }),
        ).toBeInViewport();
        expect(new URL(staticPage.url()).searchParams.get("q")).toBe("API");
      } finally {
        await noJs.close();
      }
    } finally {
      await context?.close();
      if (server) await stopProcess(server);
      await rm(workspace, { recursive: true, force: true });
    }
  });
});
