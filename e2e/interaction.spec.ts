import { expect } from "@playwright/test";

import { STABLE_POST, test } from "./fixtures";
import { goToHome, goToPost, goToPosts } from "./helpers/navigation";
import { waitForWorkbenchModel } from "./helpers/workbench";

test.describe("Continuous browsing interactions", () => {
  test("keeps the solid 3D workbench inside a narrow phone viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await goToHome(page);
    const workbench = page.getByRole("region", { name: "交互工作台" });
    const viewer = await waitForWorkbenchModel(workbench);
    const canvas = await workbench
      .locator('[data-complete="true"]')
      .boundingBox();
    const bounds = await viewer.boundingBox();
    expect(canvas).not.toBeNull();
    expect(bounds).not.toBeNull();
    if (!canvas || !bounds)
      throw new Error("Workbench canvas and solid model must be visible");
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(
      canvas.x + canvas.width,
    );
    expect(canvas.x + canvas.width).toBeLessThanOrEqual(320);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
  });

  test("filters articles by keywords and topics and recovers from no results", async ({
    page,
  }) => {
    await goToPosts(page);
    const articles = page.locator("section[aria-label='文章列表'] article");
    const originalCount = await articles.count();
    const search = page.getByRole("searchbox", { name: "查找文章" });
    await search.fill(STABLE_POST.title);
    await expect(articles).toHaveCount(1);
    await expect(
      page.getByRole("link", { name: STABLE_POST.title, exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Codex", exact: true }).click();
    await expect(articles).toHaveCount(0);
    await expect(page.getByText("没有找到匹配的文章")).toBeVisible();
    await page.getByRole("button", { name: "清除筛选" }).click();
    await expect(search).toHaveValue("");
    await expect(articles).toHaveCount(originalCount);
    await expect(
      page.getByRole("button", { name: "全部", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("opens the mobile menu without moving content and keeps it available after scrolling", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await goToPosts(page);
    const heading = page.getByRole("heading", {
      name: "技术写作",
      exact: true,
    });
    await expect(page.locator("body")).toHaveAttribute(
      "data-route",
      "articles",
    );
    const originalTop = await heading.evaluate(
      (element) => element.getBoundingClientRect().top,
    );
    const menu = page.getByRole("button", { name: "菜单", exact: true });
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    expect(
      await heading.evaluate((element) => element.getBoundingClientRect().top),
    ).toBe(originalTop);
    await menu.press("Escape");
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await expect(menu).toBeFocused();
    await page
      .getByRole("searchbox", { name: "查找文章" })
      .scrollIntoViewIfNeeded();
    await expect(menu).toBeInViewport();
    await menu.click();
    await page.getByRole("link", { name: "项目", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "项目案例", exact: true }),
    ).toBeVisible();
    await expect(menu).toHaveAttribute("aria-expanded", "false");
  });

  test("opens the mobile contents, jumps to a heading, and keeps its highlight", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await goToPost(page, STABLE_POST.slug);
    await expect(page.locator("#article-body")).toBeInViewport();
    const toggle = page.getByRole("button", { name: "目录", exact: true });
    const contents = page.getByRole("navigation", { name: "文章章节" });
    await expect(contents).toBeHidden();
    await toggle.click();
    const section = "Anthropic 官方（Claude）";
    const headingLink = contents.getByRole("link", {
      name: section,
      exact: true,
    });
    await headingLink.click();
    await expect(contents).toBeHidden();
    const heading = page.getByRole("heading", { name: section, exact: true });
    await expect(heading).toBeFocused();
    await expect(heading).toBeInViewport();
    const readingPosition = await page.evaluate(() => window.scrollY);
    const toggleBox = await toggle.boundingBox();
    if (!toggleBox)
      throw new Error("The fixed contents button must be visible");
    await page.mouse.click(
      toggleBox.x + toggleBox.width / 2,
      toggleBox.y + toggleBox.height / 2,
    );
    await expect(headingLink).toHaveAttribute("aria-current", "location");
    expect(await page.evaluate(() => window.scrollY)).toBe(readingPosition);
    await page.keyboard.press("Escape");
    await expect(contents).toBeHidden();
  });
});
