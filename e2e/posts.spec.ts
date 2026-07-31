import { expect } from "@playwright/test";

import { SITE_COPY, STABLE_POST, test } from "./fixtures";
import { goToPosts } from "./helpers/navigation";

test.describe("Posts list", () => {
  test("renders published articles with topic context", async ({ page }) => {
    const copy = SITE_COPY;

    await goToPosts(page);

    await expect(
      page.getByRole("heading", { name: copy.allPosts }),
    ).toBeVisible();

    await expect(page.getByLabel("当前写作主题")).toBeVisible();
    await expect(page.locator("section[aria-label='文章列表']")).toBeVisible();
    expect(
      await page.locator(".portfolio-article-row").count(),
    ).toBeGreaterThan(0);
  });

  test("the stable post link navigates to its detail page", async ({
    page,
  }) => {
    await goToPosts(page);

    const postLink = page.getByRole("link", {
      name: `阅读${STABLE_POST.title}`,
      exact: true,
    });
    await Promise.all([
      page.waitForURL((url) =>
        url.pathname.endsWith(`/posts/${STABLE_POST.slug}/`),
      ),
      postLink.click(),
    ]);

    expect(new URL(page.url()).pathname).toMatch(
      new RegExp(`/posts/${STABLE_POST.slug}/$`),
    );
  });
});
