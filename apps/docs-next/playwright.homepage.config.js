import { defineConfig } from '@playwright/test';
import config from './playwright.config.js';

// The landing page needs only the package-generated site, not the retained parity fixture.
export default defineConfig({
  ...config,
  testMatch: 'homepage.spec.js',
  outputDir: '../../.context/homepage-tests',
  webServer: config.webServer.slice(1),
});
