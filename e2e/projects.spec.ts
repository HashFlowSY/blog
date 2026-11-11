import { expect } from "@playwright/test";

import { SITE_COPY, STABLE_PROJECT, test } from "./fixtures";
import { goToProject, goToProjects } from "./helpers/navigation";

test.describe("Projects", () => {
  test("opens a case from its cover and returns to the same project card", async ({
    page,
  }) => {
    const copy = SITE_COPY;

    await page.setViewportSize({ width: 390, height: 844 });
    await goToProjects(page);

    await expect(
      page.getByRole("heading", { name: copy.allProjects }),
    ).toBeVisible();

    const card = page.getByRole("link", {
      name: STABLE_PROJECT.title,
      exact: true,
    });
    await card.getByRole("img").click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      STABLE_PROJECT.title,
    );
    await page
      .getByRole("heading", { name: "内容管线", exact: true })
      .scrollIntoViewIfNeeded();

    const back = page.getByRole("link", { name: "返回项目列表" });
    await expect(back).toBeInViewport();
    await back.click();
    await expect(page).toHaveURL(
      (url) =>
        url.pathname.endsWith("/projects/") &&
        url.hash === `#projects-${STABLE_PROJECT.slug}`,
    );
    await expect(card).toBeFocused();
    await expect(card).toBeInViewport();
  });

  test("shows case details and returns focus after zooming the preview", async ({
    page,
  }) => {
    const copy = SITE_COPY;

    await page.setViewportSize({ width: 390, height: 844 });
    await goToProject(page, STABLE_PROJECT.slug);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      STABLE_PROJECT.title,
    );
    await expect(page.getByText(STABLE_PROJECT.description)).toBeVisible();

    const sourceLink = page.getByRole("link", { name: copy.source });
    await expect(sourceLink).toHaveAttribute("href", /github\.com/);

    const demoLink = page.getByRole("link", { name: copy.demo });
    await expect(demoLink).toBeVisible();

    const preview = page.getByRole("button", { name: "查看项目大图" });
    await expect(preview).toBeInViewport();
    await preview.click();
    const dialog = page.getByRole("dialog", {
      name: `${STABLE_PROJECT.title}项目大图`,
    });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "放大", exact: true }).click();
    expect(
      await dialog
        .getByRole("region", { name: "项目截图" })
        .evaluate((element) => element.scrollWidth > element.clientWidth),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(preview).toBeFocused();
  });
});
