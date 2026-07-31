import { defineConfig, devices } from "@playwright/test";

import {
  staticBasePath,
  staticBaseURL,
  staticServerUrl,
} from "./e2e/static-artifact-config";

export default defineConfig({
  testDir: "./e2e",
  testMatch: /static-artifact\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  workers: process.env["CI"] ? 1 : "50%",
  reporter: [
    ["html", { open: "never", outputFolder: "playwright-static-report" }],
  ],
  outputDir: "test-results/static-artifact",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },

  use: {
    baseURL: staticBaseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
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
