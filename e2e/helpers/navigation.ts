import { LOCALES } from "../fixtures";

import type { Locale } from "../fixtures";
import type { Page } from "@playwright/test";

function getText(locale: Locale = "zh-CN") {
  return LOCALES[locale];
}

async function goToHome(page: Page, _locale: Locale = "zh-CN") {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

async function goToPosts(page: Page, _locale: Locale = "zh-CN") {
  await page.goto("/posts/");
  await page.waitForLoadState("networkidle");
}

async function goToProjects(page: Page, _locale: Locale = "zh-CN") {
  await page.goto("/projects/");
  await page.waitForLoadState("networkidle");
}

async function goToAbout(page: Page, _locale: Locale = "zh-CN") {
  await page.goto("/about/");
  await page.waitForLoadState("networkidle");
}

export { getText, goToAbout, goToHome, goToPosts, goToProjects };
