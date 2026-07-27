import { expect } from "@playwright/test";

import { test } from "./fixtures";
import { goToHome, getText } from "./helpers/navigation";

test.describe("Home page", () => {
  test("renders hero section", async ({ page }) => {
    const zh = getText("zh-CN");

    await goToHome(page);

    await expect(
      page.getByRole("heading", { name: /Hashflow AI 全栈工程师/ }),
    ).toBeVisible();

    const viewProjectsLink = page.getByRole("link", {
      name: zh.viewProjects,
      exact: true,
    });
    await expect(viewProjectsLink).toBeVisible();
    await expect(viewProjectsLink).toHaveAttribute("href", /\/projects\/$/);

    const contactLink = page.getByRole("link", { name: "联系我" }).first();
    await expect(contactLink).toHaveAttribute("href", /\/about\/#contact$/);
  });

  test("shows recent posts section", async ({ page }) => {
    const zh = getText("zh-CN");

    await goToHome(page);

    await expect(
      page.getByRole("heading", { name: zh.recentPosts }),
    ).toBeVisible();
    await expect(page.locator(".writing-item")).toHaveCount(2);
  });

  test("shows featured projects section", async ({ page }) => {
    const zh = getText("zh-CN");

    await goToHome(page);

    await expect(
      page.getByRole("heading", { name: zh.featuredProjects }),
    ).toBeVisible();
    await expect(page.locator(".featured-work")).toBeVisible();
  });
});
