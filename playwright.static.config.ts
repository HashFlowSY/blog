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
  // Baselines may only change through an explicit --update-snapshots command.
  updateSnapshots: "none",
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
      // The release gate: every static E2E spec except a11y, visual, and WebKit smoke.
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /(?:webkit-smoke|a11y|visual-regression)\.spec\.ts/,
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
    {
      // The focused Linux/Chromium visual gate. It intentionally owns only the
      // four screenshot assertions in visual-regression.spec.ts. Playwright's
      // default platform suffix keeps Darwin and Linux baselines separate.
      name: "chromium-visual",
      use: {
        ...devices["Desktop Chrome"],
        browserName: "chromium",
        colorScheme: "light",
        deviceScaleFactor: 1,
        locale: "zh-CN",
        contextOptions: { reducedMotion: "reduce" },
        timezoneId: "Asia/Shanghai",
        viewport: { height: 900, width: 1440 },
      },
      testMatch: /visual-regression\.spec\.ts$/,
      expect: {
        toHaveScreenshot: {
          maxDiffPixelRatio: 0,
          maxDiffPixels: 0,
          threshold: 0,
        },
      },
      outputDir: "test-results/static-artifact/chromium-visual",
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
