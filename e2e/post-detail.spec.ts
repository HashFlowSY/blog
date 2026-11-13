import { expect } from "@playwright/test";

import { routeForPost, STABLE_POST, test } from "./fixtures";
import { goToPosts, goToRoute } from "./helpers/navigation";

test.describe("Post detail", () => {
  test("loads body search when requested, shows the match, and keeps topic and keyword in the URL", async ({
    page,
  }) => {
    let indexRequests = 0;
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.endsWith("/search-index.json"))
        indexRequests++;
    });
    await page.setViewportSize({ width: 375, height: 667 });
    await goToPosts(page);
    await expect(
      page
        .locator(".portfolio-article-list article")
        .first()
        .locator(".content-card-summary"),
    ).toBeInViewport({ ratio: 1 });
    expect(indexRequests).toBe(0);

    const search = page.getByRole("searchbox", { name: "查找文章" });
    const card = page.getByRole("link", {
      name: STABLE_POST.title,
      exact: true,
    });
    await page.getByRole("button", { name: "Codex", exact: true }).click();
    expect(indexRequests).toBe(0);
    await search.fill("月抛站");
    await expect(page.getByText("没有找到匹配的文章")).toBeVisible();
    expect(indexRequests).toBe(1);

    await page.getByRole("button", { name: "仅取消主题" }).click();
    await expect(search).toHaveValue("月抛站");
    await expect(card.locator("mark")).toHaveText("月抛站");
    await expect(page).toHaveURL(
      (url) =>
        url.searchParams.get("q") === "月抛站" &&
        !url.searchParams.has("topic"),
    );

    await page.getByRole("button", { name: "风险识别", exact: true }).click();
    await page.reload();
    await expect(search).toHaveValue("月抛站");
    await expect(
      page.getByRole("button", { name: "风险识别", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(card.locator("mark")).toHaveText("月抛站");
  });

  test("focuses a body-only result when returning from a directly opened post", async ({
    page,
  }) => {
    const filters = new URLSearchParams({ q: "月抛站", topic: "风险识别" });
    await goToRoute(page, `${routeForPost()}?${filters}`);

    await page.getByRole("link", { name: "返回文章列表" }).click();

    const card = page.getByRole("link", {
      name: STABLE_POST.title,
      exact: true,
    });
    await expect(card.locator("mark")).toHaveText("月抛站");
    await expect(card).toBeFocused();
    await expect(card).toBeInViewport();
  });

  test("preserves filters and restores the card when returning from an article", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await goToPosts(page);
    const search = page.getByRole("searchbox", { name: "查找文章" });
    const topic = page.getByRole("button", { name: "风险识别", exact: true });
    await search.fill("风险");
    await topic.click();

    const card = page.getByRole("link", {
      name: STABLE_POST.title,
      exact: true,
    });
    const title = page.locator("h1#post-title");
    await card.getByText(STABLE_POST.description, { exact: true }).click();
    await expect(title).toHaveText(STABLE_POST.title);
    await page.goBack();
    await expect(search).toHaveValue("风险");
    await expect(topic).toHaveAttribute("aria-pressed", "true");

    await card.press("Enter");
    await expect(title).toHaveText(STABLE_POST.title);
    await page
      .getByRole("heading", { name: "使用前的检查清单" })
      .scrollIntoViewIfNeeded();
    const back = page.getByRole("link", { name: "返回文章列表" });
    await expect(back).toBeInViewport();
    await back.click();

    await expect(page).toHaveURL(
      (url) =>
        url.pathname.endsWith("/posts/") &&
        url.hash === `#posts-${STABLE_POST.slug}`,
    );
    await expect(search).toHaveValue("风险");
    await expect(topic).toHaveAttribute("aria-pressed", "true");
    await expect(card).toBeFocused();
    await expect(card).toBeInViewport();
  });
});
