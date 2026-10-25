import { defineConfig } from '@playwright/test';
import { assertCanonicalStorywrightRuntime } from './scripts/storywright-runtime.mjs';
assertCanonicalStorywrightRuntime({ argv: ['test'] });
export default defineConfig({
  testDir: './tests', testMatch: 'state-sheets.spec.ts', workers: 1, retries: 0, maxFailures: 1,
  timeout: 180000, reporter: [['list'], ['html', { open: 'never' }]],
  snapshotPathTemplate: '{testDir}/baselines/state-sheets/{arg}{ext}',
  use: { actionTimeout: 5000, viewport: { width: 320, height: 480 }, reducedMotion: 'reduce', locale: 'en-US', timezoneId: 'America/Vancouver' },
  webServer: { command: 'pnpm exec vite preview --outDir storybook-static --host 127.0.0.1 --port 6020 --strictPort', url: 'http://127.0.0.1:6020', reuseExistingServer: false },
});
