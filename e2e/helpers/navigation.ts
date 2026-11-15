import { expect, type Page } from "@playwright/test";

import { routeForPost, routeForProject } from "../fixtures";

function relativeRoute(pathname: string): string {
  if (!pathname.startsWith("/")) {
    throw new Error(`Expected a root-relative route, received ${pathname}`);
  }

  return pathname === "/" ? "./" : pathname.slice(1);
}

export async function waitForRouteEntry(page: Page): Promise<void> {
  await expect(page.locator("body")).toHaveAttribute("data-route", /\S+/);
  // The client sets data-route before animating the main content.
  await page.locator("main").evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map((animation) => animation.finished),
    );
  });
}

async function goToRoute(page: Page, pathname: string): Promise<void> {
  await page.goto(relativeRoute(pathname));
  await waitForRouteEntry(page);
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
};
