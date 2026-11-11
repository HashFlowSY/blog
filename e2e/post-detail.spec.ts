import { expect } from "@playwright/test";

import { STABLE_POST, test } from "./fixtures";
import { goToPosts } from "./helpers/navigation";

test.describe("Post detail", () => {
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
