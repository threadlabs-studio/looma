import { defineConfig } from '@playwright/test';
import config from './playwright.config.js';

// These tests only need the package-generated site.
export default defineConfig({
  ...config,
  testMatch: ['homepage.spec.js', 'blocks.spec.js', 'pickers.spec.js'],
  outputDir: '../../.context/homepage-tests',
  webServer: {
    ...config.webServer[1],
    command: `"${process.execPath}" ../../packages/looma-docs/bin/looma-docs.mjs preview --port ${new URL(config.metadata.markupress).port}`,
  },
});
