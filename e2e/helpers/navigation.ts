import { routeForPost, routeForProject } from "../fixtures";

import type { Page } from "@playwright/test";

function relativeRoute(pathname: string): string {
  if (!pathname.startsWith("/")) {
    throw new Error(`Expected a root-relative route, received ${pathname}`);
  }

  return pathname === "/" ? "./" : pathname.slice(1);
}

async function goToRoute(page: Page, pathname: string): Promise<void> {
  await page.goto(relativeRoute(pathname));
  await page.waitForLoadState("networkidle");
}

async function goToHome(page: Page) {
  await goToRoute(page, "/");
}

async function goToPosts(page: Page) {
  await goToRoute(page, "/posts/");
}

async function goToProjects(page: Page) {
  await goToRoute(page, "/projects/");
}

async function goToAbout(page: Page) {
  await goToRoute(page, "/about/");
}

async function goToPost(page: Page, slug: string): Promise<void> {
  await goToRoute(page, routeForPost(slug));
}

async function goToProject(page: Page, slug: string): Promise<void> {
  await goToRoute(page, routeForProject(slug));
}

export {
  goToAbout,
  goToHome,
  goToPost,
  goToPosts,
  goToProject,
  goToProjects,
  goToRoute,
  relativeRoute,
};
