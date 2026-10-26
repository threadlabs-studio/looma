import { defineConfig, devices } from '@playwright/test';
import config from './playwright.config.js';

// Explicit Safari audit of the package-generated site, including real touch taps.
export default defineConfig({
  ...config,
  testMatch: ['dashboard.spec.js', 'design-system.spec.js', 'refinement.spec.js'],
  workers: 1,
  use: { ...devices['Desktop Safari'], browserName: 'webkit', contextOptions: { reducedMotion: 'reduce' } },
  outputDir: '../../.context/safari-tests',
  webServer: config.webServer.slice(1),
});
