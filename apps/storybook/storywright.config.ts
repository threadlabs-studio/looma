import { defineConfig } from '@storywright/cli'
import { assertCanonicalStorywrightRuntime } from './scripts/storywright-runtime.mjs'

// Screenshots are only canonical inside the pinned Playwright Docker image. The
// guard blocks a bare `storywright test`/`update` on the host, which would bake
// host-specific font/AA rendering into the baselines.
assertCanonicalStorywrightRuntime()

export default defineConfig({
  storybook: {
    staticDir: 'storybook-static',
    // build:visual builds the workspace packages Storybook imports (their dist
    // must exist to resolve) before running `storybook build`.
    buildCommand: 'pnpm run build:visual',
    compatibility: 'auto',
  },
  // ponytail: single chromium viewport to start. Add responsive viewports
  // when a layout regression needs them.
  browsers: ['chromium'],
  browserOptions: {
    chromium: {
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    },
  },
  screenshot: {
    fullPage: false,
    animations: 'disabled',
    threshold: 0.1,
    maxDiffPixelRatio: 0.001,
    freezeTime: '2026-08-05T12:00:00.000Z',
    timezone: 'America/Vancouver',
    locale: 'en-US',
    seed: 257,
  },
  storage: {
    provider: 'local',
    branch: 'main',
    local: { baselineDir: '.storywright/accepted' },
  },
  report: {
    outputDir: '.storywright/report',
    title: 'Looma Storybook visual regression',
  },
  workers: 1,
  retries: 0,
  // Generous: the first story of a run pays the cold browser + font start,
  // which under amd64 emulation on Apple silicon can exceed 10s.
  timeout: {
    test: 60_000,
    navigation: 15_000,
    expect: 30_000,
  },
  // ponytail: Examples opens two modal Search Shells, and whether the visible
  // one's search field shows its focus ring depends on upgrade timing, so it
  // flakes. Storywright 1.8 declares `hooks.beforeScreenshot` but never calls
  // it, so the harness cannot blur first; re-include once hooks run.
  exclude: ['Overlay/Search Shell/Examples'],
})
