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

  test("introduces the blog and its published writing before the workbench", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await goToProject(page, STABLE_PROJECT.slug);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      STABLE_PROJECT.title,
    );
    await expect(
      page.getByText(STABLE_PROJECT.intro, { exact: true }),
    ).toBeInViewport({ ratio: 1 });
    const sourceLink = page.getByRole("link", {
      name: "查看源码",
      exact: true,
    });
    await expect(sourceLink).toHaveAttribute(
      "href",
      "https://github.com/HashFlowSY/blog",
    );
    await expect(sourceLink).toBeInViewport({ ratio: 1 });

    const demoLink = page.getByRole("link", { name: "浏览博客" });
    await expect(demoLink).toHaveAttribute(
      "href",
      "https://hashflowsy.github.io/blog/",
    );
    await expect(demoLink).toBeInViewport({ ratio: 1 });

    const content = page.getByRole("region", { name: "概述", exact: true });
    const firstPost = content.getByRole("link", { name: /AI 服务中转站/ });
    await expect(firstPost).toHaveAttribute("href", /\/posts\/2026-04-30\/$/u);
    await expect(firstPost).toBeInViewport({ ratio: 1 });
    await expect(
      content.getByRole("link", { name: /用 Codex 定制桌面宠物/ }),
    ).toHaveAttribute("href", /\/posts\/2026-05-02\/$/u);

    const workbench = page.getByRole("region", { name: "首页交互工作台" });
    await expect(workbench).not.toBeInViewport();

    await page.setViewportSize({ width: 320, height: 800 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBe(320);

    await expect(
      page.getByText(
        "中文技术博客与作品集，已发布到 GitHub Pages。支持按主题筛选文章和搜索正文。",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "查看 GitHub Pages 部署记录" }),
    ).toHaveAttribute(
      "href",
      /^https:\/\/github\.com\/HashFlowSY\/blog\/actions\/runs\/\d+$/,
    );

    await page.getByRole("link", { name: "试这次搜索" }).click();
    await expect(page).toHaveURL(
      (url) =>
        url.pathname.endsWith("/posts/") &&
        url.searchParams.get("q") === "验收条件",
    );
    const result = page.getByRole("link", {
      name: "用 Codex 定制桌面宠物：流程与踩坑",
    });
    await expect(
      page.locator("article").filter({ has: result }).locator("mark"),
    ).toHaveText("验收条件");
  });

  test("keeps the workbench example and chapter navigation available without scripts", async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      ...(baseURL ? { baseURL } : {}),
      javaScriptEnabled: false,
      viewport: { width: 1280, height: 720 },
    });
    try {
      const page = await context.newPage();
      await page.goto(`projects/${STABLE_PROJECT.slug}/`);
      await page
        .getByRole("button", { name: "目录", exact: true })
        .press("Enter");
      const contents = page.getByRole("navigation", { name: "项目章节" });
      await contents
        .getByRole("link", { name: "首页交互工作台" })
        .press("Enter");
      await expect(
        page.getByRole("heading", { name: "首页交互工作台" }),
      ).toBeFocused();
      const workbench = page.getByRole("region", { name: "首页交互工作台" });
      await expect(
        workbench.getByRole("img", { name: /首页手绘工作台/u }),
      ).toHaveJSProperty("naturalWidth", 900);
      await expect(
        workbench.getByRole("link", { name: /首页手绘工作台/u }),
      ).toHaveAttribute(
        "href",
        /\/assets\/projects\/personal-blog\/workbench-finished\.webp$/u,
      );
    } finally {
      await context.close();
    }
  });
});
