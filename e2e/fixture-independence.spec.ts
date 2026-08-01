import { spawn } from "node:child_process";
import { once } from "node:events";
import { cp, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

import { expect } from "@playwright/test";

import { STABLE_PROJECT, STABLE_POST, test } from "./fixtures";

import type { ChildProcess } from "node:child_process";

const fixtureSlug = "fixture-stability-check";
const fixtureTitle = "隔离测试文章";
const fixtureDescription = "用于证明新增合法文章不会改变无关页面行为。";

const fixtureFile = `---
title: "${fixtureTitle}"
slug: "${fixtureSlug}"
date: "2027-01-01"
tags: ["测试"]
summary: "${fixtureDescription}"
draft: false
---

这是一篇只存在于隔离测试 workspace 的合法文章。
`;

const workspaceEntries = [
  "content",
  "next.config.ts",
  "next-env.d.ts",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "postcss.config.mjs",
  "public",
  "scripts",
  "src",
  "tsconfig.json",
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
): Promise<string> {
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

  return output.output();
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

test.describe("fixture independence", () => {
  test("a valid isolated post preserves unrelated home and navigation behavior", async ({
    browser,
  }) => {
    test.setTimeout(120_000);

    const repositoryRoot = process.cwd();
    const workspace = await createFixtureWorkspace(repositoryRoot);
    const port = await findFreePort();
    const previewUrl = `http://127.0.0.1:${port}/blog/`;
    let server: ChildProcess | undefined;
    let context: Awaited<ReturnType<typeof browser.newContext>> | undefined;

    try {
      await runCommand("pnpm", ["build"], workspace, {
        ...process.env,
        NODE_ENV: "production",
        NEXT_PUBLIC_SITE_URL: "https://example.com",
        BASE_PATH: "/blog",
        NEXT_PUBLIC_BASE_PATH: "/blog",
      });

      server = spawn("pnpm", ["preview:static"], {
        cwd: workspace,
        env: {
          ...process.env,
          HOST: "127.0.0.1",
          PORT: String(port),
          STATIC_BASE_PATH: "/blog",
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      const serverOutput = collectProcessOutput(server);
      await waitForPreview(previewUrl, server, serverOutput.output);

      context = await browser.newContext();
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
          name: `阅读${STABLE_POST.title}`,
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", {
          name: `阅读${fixtureTitle}`,
          exact: true,
        }),
      ).toBeVisible();

      await page.goto(`${previewUrl}posts/${fixtureSlug}/`);
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        fixtureTitle,
      );
    } finally {
      await context?.close();
      if (server) await stopProcess(server);
      await rm(workspace, { recursive: true, force: true });
    }
  });
});
