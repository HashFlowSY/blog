import { readFile } from "node:fs/promises";
import path from "node:path";

import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  routeForPost,
  routeForProject,
  STABLE_POST,
  STABLE_PROJECT,
} from "./fixtures";
import { waitForRouteEntry } from "./helpers/navigation";
import { visitStaticPage } from "./helpers/static-page";
import { routePath } from "./static-artifact-config";

import type { Page } from "@playwright/test";

const blockingImpacts = new Set(["serious", "critical"]);

const scannedPages = [
  ["home", "/"],
  ["post list", "/posts/"],
  ["stable post detail", routeForPost(STABLE_POST.slug)],
  ["project list", "/projects/"],
  ["stable project detail", routeForProject(STABLE_PROJECT.slug)],
] as const;

function formatBlockingViolations(
  violations: Array<{
    help: string;
    helpUrl: string;
    id: string;
    impact?: string | null;
    nodes: Array<{ target: unknown }>;
  }>,
): string {
  return violations
    .map((violation) => {
      const targets = violation.nodes
        .map((node) => `    target: ${JSON.stringify(node.target)}`)
        .join("\n");

      return [
        `  rule: ${violation.id}`,
        `    impact: ${violation.impact ?? "unknown"}`,
        `    help: ${violation.help}`,
        `    helpUrl: ${violation.helpUrl}`,
        targets,
      ].join("\n");
    })
    .join("\n");
}

async function scanPage(page: Page, pageName: string): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const blockingViolations = results.violations.filter((violation) =>
    blockingImpacts.has(violation.impact ?? ""),
  );

  if (blockingViolations.length > 0) {
    throw new Error(
      [
        `Accessibility threshold failed for ${pageName}.`,
        "Blocking impacts: serious, critical.",
        formatBlockingViolations(blockingViolations),
      ].join("\n"),
    );
  }
}

async function prepareA11yPage(
  page: Page,
  pathname: string,
  expectedStatus = 200,
): Promise<void> {
  await visitStaticPage(page, pathname, { expectedStatus });
  await waitForRouteEntry(page);
}

test.describe("Accessibility scans on the static artifact", () => {
  test("exposes the expected document language and landmarks", async ({
    page,
  }) => {
    await prepareA11yPage(page, "/");

    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await expect(page.getByRole("link", { name: "跳到内容" })).toHaveAttribute(
      "href",
      "#content",
    );
    await expect(page.locator("main#content")).toBeAttached();
    await expect(page.locator('nav[aria-label="主导航"]')).toBeAttached();
  });

  for (const [pageName, pathname] of scannedPages) {
    test(`passes the serious/critical threshold on ${pageName}`, async ({
      page,
    }) => {
      await prepareA11yPage(page, pathname);
      await scanPage(page, pageName);
    });
  }

  test("passes the serious/critical threshold on the generated 404 document", async ({
    page,
  }) => {
    const generated404 = await readFile(path.resolve("out", "404.html"));
    const missingPath = "/does-not-exist/";
    const documentResponse = await page.request.get(routePath(missingPath));

    expect(documentResponse.status(), routePath(missingPath)).toBe(404);
    expect(await documentResponse.body()).toEqual(generated404);

    await prepareA11yPage(page, missingPath, 404);
    await expect(
      page.getByRole("heading", { name: "页面不存在" }),
    ).toBeVisible();
    await scanPage(page, "generated 404");
  });
});

test.describe("Keyboard accessibility on the static artifact", () => {
  test("article search keeps its rounded focus indicator in normal and forced colors", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await prepareA11yPage(page, "/posts/");
    const field = page.getByRole("searchbox", { name: "查找文章" });
    await field.scrollIntoViewIfNeeded();
    const restingBounds = await field.boundingBox();
    const restingBorder = await field.evaluate(
      (element) => getComputedStyle(element).borderTopColor,
    );

    await field.click();
    await expect(field).toBeFocused();
    await expect(field).not.toHaveCSS("border-top-color", restingBorder);
    expect(
      await field.evaluate((element) =>
        parseFloat(getComputedStyle(element).borderTopLeftRadius),
      ),
    ).toBeGreaterThan(0);
    expect(await field.boundingBox()).toEqual(restingBounds);

    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "全部", exact: true }),
    ).toBeFocused();
    await page.emulateMedia({ forcedColors: "active" });
    await page.keyboard.press("Shift+Tab");
    await expect(field).toBeFocused();
    await expect(field).toHaveCSS("outline-style", "solid");
    expect(
      await field.evaluate((element) =>
        parseFloat(getComputedStyle(element).outlineWidth),
      ),
    ).toBeGreaterThanOrEqual(2);
  });

  test("skip link is visible on focus and moves focus to main content", async ({
    page,
  }) => {
    await prepareA11yPage(page, "/");

    const skipLink = page.getByRole("link", { name: "跳到内容" });
    await page.keyboard.press("Tab");
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(page.locator("main#content")).toBeFocused();
  });

  test("mobile section links can be traversed and opened with the keyboard", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await prepareA11yPage(page, "/");
    const nav = page.getByRole("navigation", { name: "主导航" });
    await nav.getByRole("link", { name: "首页" }).focus();
    await page.keyboard.press("Tab");
    await expect(nav.getByRole("link", { name: "项目" })).toBeFocused();
    await page.keyboard.press("Enter");
    await page.waitForURL((url) => url.pathname === routePath("/projects/"));
    await expect(nav.getByRole("link", { name: "项目" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("navigation links can be triggered from the keyboard", async ({
    page,
  }) => {
    await prepareA11yPage(page, "/");

    const postsLink = page
      .locator('nav[aria-label="主导航"]')
      .getByRole("link", { name: "文章", exact: true });
    await postsLink.focus();
    await page.keyboard.press("Enter");
    await page.waitForURL((url) => url.pathname === routePath("/posts/"));
    await expect(page.getByRole("heading", { name: "技术写作" })).toBeVisible();
  });
});
