import { expect } from "@playwright/test";

import { test } from "./fixtures";
import { goToHome, getText } from "./helpers/navigation";

test.describe("Home page", () => {
  test("renders hero section", async ({ page }) => {
    const zh = getText("zh-CN");

    await goToHome(page);

    await expect(page.getByText(zh.viewPosts)).toBeVisible();
    await expect(page.getByText(zh.viewProjects)).toBeVisible();

    const viewPostsLink = page.getByRole("link", { name: zh.viewPosts });
    await expect(viewPostsLink).toHaveAttribute("href", /\/zh-CN\/posts\/$/);

    const viewProjectsLink = page.getByRole("link", {
      name: zh.viewProjects,
    });
    await expect(viewProjectsLink).toHaveAttribute(
      "href",
      /\/zh-CN\/projects\/$/,
    );
  });

  test("shows recent posts section", async ({ page }) => {
    const zh = getText("zh-CN");

    await goToHome(page);

    await expect(page.getByText(zh.recentPosts)).toBeVisible();

    const postCards = page.locator("article a").first();
    await expect(postCards).toBeVisible();

    await expect(page.getByRole("link", { name: zh.allPosts })).toBeVisible();
  });

  test("shows featured projects section", async ({ page }) => {
    const zh = getText("zh-CN");

    await goToHome(page);

    await expect(page.getByText(zh.featuredProjects)).toBeVisible();

    const projectCards = page.locator("article").first();
    await expect(projectCards).toBeVisible();

    await expect(
      page.getByRole("link", { name: zh.allProjects }),
    ).toBeVisible();
  });
});
