import { expect, type Page } from "@playwright/test";

import { STABLE_PROJECT, test } from "./fixtures";
import { goToHome } from "./helpers/navigation";

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
