import { expect } from "@playwright/test";

import { test } from "./fixtures";
import { goToProjects, goToProjectDetail, getText } from "./helpers/navigation";

test.describe("Projects", () => {
  test("project list renders project cards", async ({ page }) => {
    const zh = getText("zh-CN");

    await goToProjects(page);

    await expect(
      page.getByRole("heading", { name: zh.allProjects }),
    ).toBeVisible();

    await expect(page.getByText("Personal Blog")).toBeVisible();
  });

  test("project detail renders full info", async ({ page }) => {
    const zh = getText("zh-CN");

    await goToProjectDetail(page, "personal-blog");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Personal Blog",
    );

    const sourceLink = page.getByRole("link", { name: zh.source });
    await expect(sourceLink).toHaveAttribute("href", /github\.com/);

    const demoLink = page.getByRole("link", { name: zh.demo });
    await expect(demoLink).toBeVisible();
  });
});
