import { expect } from "@playwright/test";

import { test } from "./fixtures";
import { goToPostDetail, getText } from "./helpers/navigation";

test.describe("Post detail", () => {
  test("renders post metadata", async ({ page }) => {
    const zh = getText("zh-CN");

    await goToPostDetail(page, "nextjs-static-export-guide");

    await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(
      "Building a Static Blog with Next.js",
    );

    await expect(page.getByText(zh.publishedAt)).toBeVisible();
    await expect(page.getByText(zh.minutes)).toBeVisible();
  });

  test("table of contents exists", async ({ page }) => {
    await goToPostDetail(page, "nextjs-static-export-guide");

    const toc = page.locator('nav[aria-label="Table of contents"]');
    await expect(toc).toBeAttached();

    const tocLinks = toc.locator("a");
    await expect(tocLinks.first()).toBeVisible();
  });

  test("previous and next post navigation exists", async ({ page }) => {
    await goToPostDetail(page, "hello-world");

    await expect(
      page.locator('nav[aria-label="Post navigation"]'),
    ).toBeAttached();
  });

  test("copy link button works", async ({ page }) => {
    await goToPostDetail(page, "nextjs-static-export-guide");

    const copyButton = page.getByRole("button", { name: "Copy link" });
    await expect(copyButton).toBeVisible();

    await copyButton.click();

    // Button text changes from "Copy link" to "Copied!"
    await expect(copyButton).not.toContainText("Copy link");
    await expect(copyButton).toContainText("Copied");
  });
});
