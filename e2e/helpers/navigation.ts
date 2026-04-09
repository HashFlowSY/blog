import { LOCALES } from "../fixtures";

import type { Locale } from "../fixtures";
import type { Page } from "@playwright/test";

function getText(locale: Locale) {
  return LOCALES[locale];
}

async function goToHome(page: Page, locale: Locale = "zh-CN") {
  await page.goto(`/${locale}/`);
  await page.waitForLoadState("networkidle");
}

async function goToPosts(page: Page, locale: Locale = "zh-CN") {
  await page.goto(`/${locale}/posts/`);
  await page.waitForLoadState("networkidle");
}

async function goToPostDetail(
  page: Page,
  slug: string,
  locale: Locale = "zh-CN",
) {
  await page.goto(`/${locale}/posts/${slug}/`);
  await page.waitForLoadState("networkidle");
}

async function goToProjects(page: Page, locale: Locale = "zh-CN") {
  await page.goto(`/${locale}/projects/`);
  await page.waitForLoadState("networkidle");
}

async function goToProjectDetail(
  page: Page,
  slug: string,
  locale: Locale = "zh-CN",
) {
  await page.goto(`/${locale}/projects/${slug}/`);
  await page.waitForLoadState("networkidle");
}

async function goToAbout(page: Page, locale: Locale = "zh-CN") {
  await page.goto(`/${locale}/about/`);
  await page.waitForLoadState("networkidle");
}

export {
  getText,
  goToAbout,
  goToHome,
  goToPostDetail,
  goToPosts,
  goToProjectDetail,
  goToProjects,
};
