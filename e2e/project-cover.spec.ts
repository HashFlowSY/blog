import { expect, test, type Page } from "@playwright/test";

import { STABLE_PROJECT } from "./fixtures";
import { goToHome, goToProject, goToProjects } from "./helpers/navigation";

test("opens the selected feature screenshot at its original deployment URL", async ({
  page,
}) => {
  await goToProject(page, STABLE_PROJECT.slug);
  const gallery = page.getByRole("figure", { name: "项目图片" });
  const choice = gallery.getByRole("link", { name: "文章检索", exact: true });
  await choice.press("Enter");
  await expect(choice).toHaveAttribute("aria-current", "true");
  const original = gallery.getByRole("link", { name: /查看原图：文章检索/ });
  const popupPromise = page.waitForEvent("popup");
  await original.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(
    new URL((await choice.getAttribute("href"))!, page.url()).href,
  );
  await expect
    .poll(() =>
      popup
        .locator("img")
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await popup.close();
  await gallery.getByRole("link", { name: "项目封面", exact: true }).click();
  await expect(
    gallery.getByRole("img", { name: `${STABLE_PROJECT.title}界面预览` }),
  ).toBeVisible();
});

async function observeFlights(page: Page) {
  const starts: number[] = [];
  await page.exposeFunction("recordCoverFlight", (duration: number) =>
    starts.push(duration),
  );
  await page.addInitScript(() => {
    if (
      !("recordCoverFlight" in window) ||
      typeof window.recordCoverFlight !== "function"
    )
      return;
    const report = window.recordCoverFlight;
    new MutationObserver((records) => {
      for (const record of records)
        for (const node of record.addedNodes) {
          if (
            !(node instanceof HTMLElement) ||
            !node.matches(".project-cover-flight")
          )
            continue;
          const animation = node
            .getAnimations()
            .find((a) => a.id === "project-cover-handoff");
          const duration = animation?.effect?.getComputedTiming().duration;
          if (typeof duration === "number") report(duration);
        }
    }).observe(document, { childList: true, subtree: true });
  });
  return starts;
}

test("a shared project cover can reverse to the original home card during navigation", async ({
  page,
}) => {
  const starts = await observeFlights(page);
  await goToHome(page);
  const entry = page.locator(`#featured-${STABLE_PROJECT.slug}`);
  await entry.focus();
  await entry.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    STABLE_PROJECT.title,
  );
  await expect.poll(() => starts.length).toBe(1);
  await page.goBack();
  await expect(entry).toBeFocused();
  await expect.poll(() => starts.length).toBe(2);
  await page.goForward();
  await expect.poll(() => starts.length).toBe(3);
  await page
    .getByRole("link", { name: "返回首页代表项目", exact: true })
    .click();
  await expect(entry).toBeFocused();
  await expect.poll(() => starts.length).toBe(4);
  await expect(
    page.locator(".project-cover-flight, [data-cover-in-flight]"),
  ).toHaveCount(0);
});

test("workbench links and reduced motion keep their return targets without animating the project card", async ({
  page,
}) => {
  const starts = await observeFlights(page);
  await goToHome(page);
  const caption = page.locator("#workbench-case");
  await caption.click();
  await page
    .getByRole("navigation", { name: "项目目录" })
    .getByRole("link")
    .first()
    .click();
  await page.reload();
  await page.getByRole("link", { name: "返回首页工作台", exact: true }).click();
  await expect(caption).toBeFocused();
  expect(starts).toHaveLength(0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  const entry = page.locator(`#featured-${STABLE_PROJECT.slug}`);
  await entry.press("Enter");
  await page
    .getByRole("link", { name: "返回首页代表项目", exact: true })
    .click();
  await expect(entry).toBeFocused();
  expect(starts).toHaveLength(0);
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test(`the project list cover lands where it opened at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const starts = await observeFlights(page);
    await goToProjects(page);
    const card = page.locator(`#projects-${STABLE_PROJECT.slug}`);
    const cover = card.locator("[data-project-cover]");
    const originalTop = await cover.evaluate(
      (el) => el.getBoundingClientRect().top,
    );
    const originalScroll = await page.evaluate(() => scrollY);
    await cover.click();
    await expect.poll(() => starts.length).toBe(1);
    await expect(page.locator(".project-cover-flight")).toHaveCount(0);
    await page.getByRole("link", { name: "返回项目列表", exact: true }).click();
    await expect.poll(() => starts.length).toBe(2);
    await expect(
      page.locator(".project-cover-flight, [data-cover-in-flight]"),
    ).toHaveCount(0);
    await expect(card).toBeFocused();
    expect(await page.evaluate(() => scrollY)).toBe(originalScroll);
    const returnedTop = await cover.evaluate(
      (el) => el.getBoundingClientRect().top,
    );
    expect(Math.abs(returnedTop - originalTop)).toBeLessThanOrEqual(2);
  });
}
