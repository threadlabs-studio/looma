import { defineConfig, devices } from "@playwright/test";

// Serves both finished builds: apps/docs/build (Docusaurus, /looma/) and site/ (package-generated Markupress, /looma/).
const docusaurus = 4175;
const markupress = 4176;

export default defineConfig({
  testDir: "./tests",
  ...(process.env.CI ? {} : { workers: 1 }),
  forbidOnly: Boolean(process.env.CI),
  reporter: [["list"]],
  use: { ...devices["Desktop Chrome"], contextOptions: { reducedMotion: "reduce" } },
  metadata: { docusaurus: `http://127.0.0.1:${docusaurus}/looma/`, markupress: `http://127.0.0.1:${markupress}/looma/` },
  webServer: [
    {
      command: `pnpm --dir ../docs exec docusaurus serve --host 127.0.0.1 --port ${docusaurus} --no-open`,
      url: `http://127.0.0.1:${docusaurus}/looma/`,
      reuseExistingServer: false,
    },
    {
      command: `pnpm exec looma-docs preview --port ${markupress}`,
      url: `http://127.0.0.1:${markupress}/looma/`,
      reuseExistingServer: false,
    },
  ],
});
