import { expect } from "@playwright/test";

import { routeForPost, STABLE_POST, test } from "./fixtures";
import { goToHome, goToPost, goToPosts, goToRoute } from "./helpers/navigation";
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
    const toolbar = page.getByRole("group", { name: "阅读工具" });
    const contents = page.getByRole("navigation", { name: "文章章节" });
    await expect(contents).toBeHidden();
    await toggle.click();
    await expect
      .poll(async () => {
        const navTop = (await contents.boundingBox())?.y ?? 0;
        const toolbarBottom = await toolbar.evaluate(
          (element) => element.getBoundingClientRect().bottom,
        );
        return navTop - toolbarBottom;
      })
      .toBeGreaterThan(0);
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
    await expect
      .poll(() =>
        toolbar.evaluate((element) => element.getBoundingClientRect().top),
      )
      .toBe(0);
    expect((await heading.boundingBox())?.y ?? 0).toBeGreaterThan(56);
    expect(
      await page
        .getByRole("banner", { name: "站点头部" })
        .evaluate((element) => element.getBoundingClientRect().bottom),
    ).toBeLessThanOrEqual(0);
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
    await headingLink.focus();
    await page.keyboard.press("Escape");
    await expect(contents).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  test("opens the checklist from the article and clears the anchor when returning to top", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const articlePath = routeForPost(STABLE_POST.slug);
    const search = new URLSearchParams({ q: "中转站", topic: "AI 工具" });
    await goToRoute(page, `${articlePath}?${search}`);

    await page
      .getByRole("link", { name: "直达使用前的检查清单" })
      .press("Enter");
    const heading = page.getByRole("heading", { name: "使用前的检查清单" });
    await expect(heading).toBeFocused();
    await expect(heading).toBeInViewport();
    expect((await heading.boundingBox())?.y ?? 0).toBeGreaterThan(56);

    await page.reload();
    await expect(heading).toBeInViewport();
    expect((await heading.boundingBox())?.y ?? 0).toBeGreaterThan(56);

    const returnToTop = page.getByRole("button", { name: "回到顶部" });
    await expect(returnToTop).toHaveCount(1);
    await returnToTop.press("Enter");
    const title = page.getByRole("heading", { level: 1 });
    await expect(title).toHaveText(STABLE_POST.title);
    await expect(title).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    expect(new URL(page.url()).hash).toBe("");
    expect(new URL(page.url()).searchParams.get("q")).toBe("中转站");
    expect(new URL(page.url()).searchParams.get("topic")).toBe("AI 工具");

    await page.reload();
    await expect(title).toBeInViewport();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await expect(
      page.getByRole("link", { name: "返回文章列表" }),
    ).toHaveAttribute("href", /q=.*&topic=.*#posts-2026-04-30/);
  });

  test("keeps glossary explanations wide and finishes progress at the end of the body", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 667 });
    await goToPost(page, STABLE_POST.slug);
    const body = page.locator("#article-body");
    const table = body.getByRole("table").first();
    const term = table.getByRole("columnheader", { name: "术语" });
    const explanation = table.getByRole("columnheader", { name: "说明" });
    await expect(term).toBeVisible();
    await expect(explanation).toBeVisible();

    for (const width of [320, 375, 430]) {
      await page.setViewportSize({ width, height: 667 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      expect((await explanation.boundingBox())?.width ?? 0).toBeGreaterThan(
        1.8 * ((await term.boundingBox())?.width ?? 0),
      );
    }

    const list = body.getByRole("list");
    await expect(list.getByRole("listitem")).toHaveCount(5);
    expect(
      await list.evaluate((element) => getComputedStyle(element).listStyleType),
    ).toBe("disc");

    const progress = page.getByRole("progressbar", { name: "正文阅读进度" });
    await expect(progress).toHaveAttribute("aria-valuenow", "0");
    await body.evaluate((element) => {
      window.scrollBy(
        0,
        element.getBoundingClientRect().bottom - window.innerHeight + 2,
      );
    });
    await expect(progress).toHaveAttribute("aria-valuenow", "100");
    await page
      .getByRole("heading", { name: "最新文章" })
      .scrollIntoViewIfNeeded();
    await expect(progress).toHaveAttribute("aria-valuenow", "100");
  });

  test("marks a fully visible short article as read", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1800 });
    await goToPost(page, "2026-05-02");
    await expect(page.locator("#article-body")).toBeInViewport({ ratio: 1 });
    await expect(
      page.getByRole("progressbar", { name: "正文阅读进度" }),
    ).toHaveAttribute("aria-valuenow", "100");
  });
});
