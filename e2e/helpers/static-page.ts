import { expect } from "@playwright/test";

import { routePath } from "../static-artifact-config";

import type { Page } from "@playwright/test";

interface StaticPageVisitOptions {
  expectedStatus?: number;
}

export async function visitStaticPage(
  page: Page,
  pathname: string,
  { expectedStatus = 200 }: StaticPageVisitOptions = {},
): Promise<void> {
  const targetPath = routePath(pathname);
  const response = await page.goto(targetPath);
  if (!response) {
    throw new Error(`Static server did not respond to ${targetPath}`);
  }

  expect(response.status(), targetPath).toBe(expectedStatus);
  await page.waitForLoadState("networkidle");
  expect(new URL(page.url()).pathname, targetPath).toBe(targetPath);
}
