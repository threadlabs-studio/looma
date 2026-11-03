import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Time picker touch surfaces", () => {
  for (const adapter of ["HTML", "Converted"]) {
    it(`keeps time selection usable at 375px in light and dark ${adapter}`, async () => {
      const path = await bundle(`time-picker-touch-${adapter}`, adapter === "HTML" ? 'import "@looma-test/runtime";' : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiTimePicker as TimePicker } from "@looma-test/components";
        createScene({ render: () => sceneNode("form", [sceneNode(TimePicker, { id: "picker", name: "time", label: "Time", value: "23:15:30.125", min: "21:00", max: "03:00", locale: "en-GB" })]) }).mount("#app");
      `);
      const page = await open(path, adapter === "HTML" ? '<form><ui-time-picker id="picker" name="time" label="Time" value="23:15:30.125" min="21:00" max="03:00" locale="en-GB"></ui-time-picker></form>' : '<div id="app"></div>', [join(root, "tokens.css"), join(root, "theme-light.css"), join(root, "theme-dark.css")], { viewport: { width: 375, height: 320 }, hasTouch: true });
      await page.evaluate(() => { document.body.style.fontFamily = "var(--ui-font-family-sans)"; document.body.style.backgroundColor = "var(--ui-surface)"; document.body.style.color = "var(--ui-text-primary)"; });
      for (const theme of ["light", "dark"]) {
        await page.evaluate(mode => { document.documentElement.dataset.theme = mode; }, theme);
        await page.locator('form').evaluate((form, direction) => { form.dir = direction; }, theme === 'dark' ? 'rtl' : 'ltr');
        const trigger = page.locator('#picker [data-time-trigger]');
        await trigger.tap();
        await page.waitForFunction(() => {
          const popover = document.querySelector('#picker [data-time-popover]');
          return popover && getComputedStyle(popover).opacity === "1";
        });
        await expect.poll(() => page.locator('#picker [data-time-hour]').inputValue()).toBe('23');
        await expect.poll(() => page.locator('#picker [data-time-hour] option[value="12"]').isDisabled()).toBe(true);
        if (theme === 'dark') assert.equal(await page.locator('#picker [data-time-hour]').evaluate(select => getComputedStyle(select).backgroundPositionX.split(',')[0].trim()), '8px');
        assert.equal(await page.locator('#picker [data-time-popover]').evaluate(element => element.scrollWidth <= element.clientWidth + 1), true);
        assert.equal(await page.locator('#picker').evaluate(element => element.scrollWidth <= element.clientWidth + 1), true);
        if (process.env.LOOMA_CAPTURE_ARTIFACTS) await page.screenshot({ path: join(root, `../../.context/time-picker-${adapter.toLowerCase()}-touch-${theme}.png`) });
        await page.locator('#picker [data-time-hour]').selectOption('1');
        await page.waitForFunction(() => new FormData(document.querySelector('form')!).get('time') === '01:15:30.125');
        await expect.poll(() => trigger.getAttribute('aria-expanded')).toBe('true');
        await page.keyboard.press('Escape');
        await expect.poll(() => trigger.getAttribute('aria-expanded')).toBe('false');
        await page.locator('form').evaluate(form => (form as HTMLFormElement).reset());
        await page.waitForFunction(() => new FormData(document.querySelector('form')!).get('time') === '23:15:30.125');
      }
      await page.close();
    });
  }
});
