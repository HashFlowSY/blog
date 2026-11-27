import { expect } from "@playwright/test";

import { SITE_COPY, test } from "./fixtures";
import { goToAbout } from "./helpers/navigation";

test.describe("About page", () => {
  test("renders skills and experience", async ({ page }) => {
    const copy = SITE_COPY;

    await goToAbout(page);

    await expect(
      page.getByRole("heading", { name: copy.aboutTitle }),
    ).toBeVisible();

    await expect(page.getByLabel(copy.skills)).toBeVisible();
    await expect(
      page.getByLabel(copy.skills).getByText("AI 应用与 Agent"),
    ).toBeVisible();

    await expect(page.getByLabel(copy.experience)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "查看 GitHub 主页", exact: true }),
    ).toHaveAttribute("href", "https://github.com/HashFlowSY");
  });

  test("keeps the mobile footer contact and the return-to-top button separately usable", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await goToAbout(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const topButton = page.getByRole("button", { name: "回到顶部" });
    await expect(topButton).toBeVisible();
    const footer = page.getByRole("contentinfo");
    await expect
      .poll(async () => {
        const button = await topButton.boundingBox();
        const bounds = await footer.boundingBox();
        return !!button && !!bounds && button.y + button.height <= bounds.y;
      })
      .toBe(true);

    const contact = footer.getByRole("link", { name: /GitHub/ });
    expect(
      await contact.evaluate((link) => {
        const rect = link.getBoundingClientRect();
        return link.contains(
          document.elementFromPoint(rect.right - 8, rect.top + rect.height / 2),
        );
      }),
    ).toBe(true);
    await topButton.click();
    await expect(page.getByRole("main")).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });
});
