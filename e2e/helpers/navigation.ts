import type { Page } from "@playwright/test";

async function goToHome(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

async function goToPosts(page: Page) {
  await page.goto("/posts/");
  await page.waitForLoadState("networkidle");
}

async function goToProjects(page: Page) {
  await page.goto("/projects/");
  await page.waitForLoadState("networkidle");
}

async function goToAbout(page: Page) {
  await page.goto("/about/");
  await page.waitForLoadState("networkidle");
}

export { goToAbout, goToHome, goToPosts, goToProjects };
