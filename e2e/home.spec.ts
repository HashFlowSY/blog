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
    await expect(viewPostsLink).toHaveAttribute("href", /\/posts\/$/);

    const viewProjectsLink = page.getByRole("link", {
      name: zh.viewProjects,
    });
    await expect(viewProjectsLink).toHaveAttribute("href", /\/projects\/$/);
  });

  test("shows recent posts section", async ({ page }) => {
    const zh = getText("zh-CN");

    await goToHome(page);

    await expect(
      page.getByRole("heading", { name: zh.recentPosts }),
    ).toBeVisible();
    await expect(page.locator(".signal-cell")).toHaveCount(3);
  });

  test("shows featured projects section", async ({ page }) => {
    const zh = getText("zh-CN");

    await goToHome(page);

    await expect(
      page.getByRole("link", { name: zh.viewProjects }),
    ).toBeVisible();
    await expect(page.locator(".scrap-monument")).toBeVisible();
  });
});
