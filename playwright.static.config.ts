import { defineConfig, devices } from "@playwright/test";

import {
  staticBasePath,
  staticBaseURL,
  staticServerUrl,
} from "./e2e/static-artifact-config";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /\.spec\.ts$/,
  fullyParallel: false,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  workers: 1,
  reporter: [
    ["html", { open: "never", outputFolder: "playwright-static-report" }],
  ],
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },

  use: {
    baseURL: staticBaseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      // The release gate: every static E2E spec except a11y and WebKit smoke.
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /(?:webkit-smoke|a11y)\.spec\.ts/,
      outputDir: "test-results/static-artifact/chromium",
    },
    {
      // Accessibility scans and keyboard checks run once in their own Chromium project.
      name: "chromium-a11y",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /a11y\.spec\.ts$/,
      outputDir: "test-results/static-artifact/chromium-a11y",
    },
    {
      // Cross-browser confidence: deliberately limited to webkit-smoke.spec.ts.
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      testMatch: /webkit-smoke\.spec\.ts/,
      outputDir: "test-results/static-artifact/webkit",
    },
  ],

  webServer: {
    command: "pnpm preview:static",
    url: staticBaseURL,
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      HOST: staticServerUrl.hostname,
      PORT: staticServerUrl.port,
      STATIC_BASE_PATH: staticBasePath,
    },
  },
});
