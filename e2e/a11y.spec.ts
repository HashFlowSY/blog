import { readFile } from "node:fs/promises";
import path from "node:path";

import { AxeBuilder } from "@axe-core/playwright";
import { expect } from "@playwright/test";

import {
  routeForPost,
  routeForProject,
  STABLE_POST,
  STABLE_PROJECT,
  test,
} from "./fixtures";
import { visitStaticPage } from "./helpers/static-page";
import { routePath } from "./static-artifact-config";

import type { Page } from "@playwright/test";

const blockingImpacts = new Set(["serious", "critical"]);

const STATIC_SCAN_STABILIZATION_STYLE = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
`;

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

async function prepareA11yPage(page: Page, pathname: string): Promise<void> {
  await visitStaticPage(page, pathname);
  // Route entry animations can leave Linux axe scans sampling a half-opacity
  // frame. Static accessibility checks should inspect the settled artifact.
  await page.addStyleTag({ content: STATIC_SCAN_STABILIZATION_STYLE });
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

    await visitStaticPage(page, missingPath, { expectedStatus: 404 });
    await expect(
      page.getByRole("heading", { name: "页面不存在" }),
    ).toBeVisible();
    await scanPage(page, "generated 404");
  });
});

test.describe("Keyboard accessibility on the static artifact", () => {
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

  test("mobile menu opens with the keyboard and Escape returns focus", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await prepareA11yPage(page, "/");

    const menuButton = page.getByRole("button", { name: "菜单" });
    const menu = page.locator("#site-nav");
    await menuButton.focus();
    await page.keyboard.press("Enter");

    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    await expect(menu).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await expect(menu).not.toBeVisible();
    await expect(menuButton).toBeFocused();
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
