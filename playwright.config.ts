import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testIgnore: [
    /a11y\.spec\.ts/,
    /static-artifact\.spec\.ts/,
    /fixture-independence\.spec\.ts/,
    /webkit-smoke\.spec\.ts/,
  ],
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  workers: process.env["CI"] ? 1 : "50%",
  reporter: [["html", { open: "never", outputFolder: "playwright-report" }]],
  outputDir: "test-results/e2e/chromium",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },

  use: {
    baseURL: process.env["PLAYWRIGHT_BASE_URL"] || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    permissions: ["clipboard-write"],
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env["CI"],
    timeout: 30_000,
  },
});
