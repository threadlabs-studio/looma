import { defineConfig, devices } from "@playwright/test";

const port = process.env.LOOMA_DOCS_TEST_PORT ?? "4174";
const baseURL = process.env.LOOMA_DOCS_TEST_URL ?? `http://127.0.0.1:${port}/looma/`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  ...(process.env.CI ? {} : { workers: 1 }),
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  outputDir: `test-results/${process.env.LOOMA_DOCS_REPORT ?? "behavior"}`,
  reporter: [["list"], ["html", { open: "never", outputFolder: `playwright-report/${process.env.LOOMA_DOCS_REPORT ?? "behavior"}` }]],
  use: {
    baseURL,
    // The site scrolls and animates; measuring geometry mid-transition is what made these flaky.
    contextOptions: { reducedMotion: "reduce" },
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      testIgnore: "**/visual.spec.ts",
      use: { ...devices["Desktop Chrome"] }
    },
    { name: "firefox", testIgnore: "**/visual.spec.ts", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", testIgnore: "**/visual.spec.ts", use: { ...devices["Desktop Safari"] } },
    {
      name: "visual",
      timeout: 60_000,
      expect: { timeout: 15_000 },
      testMatch: "**/visual.spec.ts",
      use: {
        ...devices["Desktop Chrome"], locale: "en-US", timezoneId: "UTC", colorScheme: "light", deviceScaleFactor: 1
      }
    }
  ],
  // Missing references must fail ordinary checks; intentional updates opt in via CLI.
  updateSnapshots: "none",
  snapshotPathTemplate: "{testDir}/baselines/{projectName}/{arg}{ext}",
  expect: { toHaveScreenshot: { animations: "disabled", caret: "hide", maxDiffPixels: 0 } },
  ...(process.env.LOOMA_DOCS_TEST_URL ? {} : { webServer: {
    command: `pnpm --dir ../.. --filter @threadlabs/looma build && pnpm build && pnpm docs:coverage && pnpm exec docusaurus serve --host 127.0.0.1 --port ${port} --no-open`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000
  } })
});
