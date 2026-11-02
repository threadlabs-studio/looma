import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Date Range Picker touch surfaces", () => {
  for (const adapter of ["HTML", "Converted"]) {
    it(`selects a backwards date range by touch in light and dark ${adapter}`, async () => {
      const path = await bundle(`range-touch-${adapter}`, adapter === "HTML" ? 'import "@looma-test/runtime";' : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiDateRangePicker as DateRangePicker } from "@looma-test/components";
        createScene({ render: () => sceneNode('form', [sceneNode(DateRangePicker, { startName: 'from', endName: 'to', startInputId: 'touch-start', endInputId: 'touch-end', today: '2026-10-30', locale: 'en-GB' })]) }).mount('#app');
      `);
      const body = adapter === "HTML" ? '<form><ui-date-range-picker start-name="from" end-name="to" start-input-id="touch-start" end-input-id="touch-end" today="2026-10-30" locale="en-GB"></ui-date-range-picker></form>' : '<div id="app"></div>';
      const page = await open(path, body, [join(root, "tokens.css"), join(root, "theme-light.css"), join(root, "theme-dark.css")], { viewport: { width: 375, height: 720 }, hasTouch: true });
      const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
      try {
        await page.addStyleTag({ content: 'body { font-family:var(--ui-font-family-sans); background:var(--ui-surface); color:var(--ui-text-primary); } form { max-inline-size:343px; }' });
        for (const theme of ["light", "dark"]) {
          await page.evaluate(mode => { document.documentElement.dataset.theme = mode; document.querySelector('form')!.dir = mode === 'dark' ? 'rtl' : 'ltr'; }, theme);
          await page.locator('[data-range-trigger="start"]').tap();
          const popup = page.locator('[data-range-popover]');
          await popup.evaluate(async element => {
            await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
            await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
            await Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished));
          });
          const geometry = async () => ({ popup: await popup.boundingBox(), arrow: await popup.locator('[data-calendar-previous]').boundingBox() });
          const original = await geometry();
          const unchanged = async () => {
            const next = await geometry();
            for (const key of ['x', 'y', 'width', 'height'] as const) assert.ok(Math.abs(next.popup![key] - original.popup![key]) < 1, `${adapter}/${theme}: popup ${key} stays fixed across views`);
            for (const key of ['x', 'y'] as const) assert.ok(Math.abs(next.arrow![key] - original.arrow![key]) < 1, `${adapter}/${theme}: navigation ${key} stays fixed across views`);
          };
          await popup.locator('[data-calendar-year-toggle]').tap();
          await popup.locator('[data-calendar-year="2026"]').waitFor({ state: 'visible' }); await unchanged();
          await popup.locator('[data-calendar-year="2026"]').tap();
          await popup.locator('[data-calendar-month="2026-10"]').waitFor({ state: 'visible' }); await unchanged();
          await popup.locator('[data-calendar-month="2026-10"]').tap();
          await popup.locator('[data-calendar-day="2026-10-20"]').waitFor({ state: 'visible' }); await unchanged();
          await page.locator('[data-calendar-day="2026-10-20"]').tap();
          await page.locator('[data-calendar-day="2026-10-15"]').tap();
          if (process.env.LOOMA_CAPTURE_ARTIFACTS) await page.screenshot({ path: join(root, `../../.context/date-range-${adapter.toLowerCase()}-touch-${theme}.png`) });
          await page.waitForFunction(() => new FormData(document.querySelector('form')!).get('from') === '2026-10-15');
          assert.deepEqual(await page.evaluate(() => [...new FormData(document.querySelector('form')!)]), [['from', '2026-10-15'], ['to', '2026-10-20']]);
          await page.evaluate(() => document.querySelector('form')!.reset());
          await page.waitForFunction(() => new FormData(document.querySelector('form')!).get('from') === '');
        }
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    });
  }
});
