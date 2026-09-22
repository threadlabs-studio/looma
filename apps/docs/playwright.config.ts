import { defineConfig, devices } from "@playwright/test";

const port = process.env.LOOMA_DOCS_TEST_PORT ?? "4174";
const baseURL = `http://127.0.0.1:${port}/looma/`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: {
    command: `pnpm --dir ../.. --filter @threadlabs/looma build && pnpm build && pnpm exec docusaurus serve --host 127.0.0.1 --port ${port} --no-open`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
