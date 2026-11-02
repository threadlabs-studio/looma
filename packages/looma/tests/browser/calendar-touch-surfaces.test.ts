import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Calendar touch surfaces", () => {
  // Blank cell corners expose the composited paint, including washes that disappear against the canvas.
  async function paintedBands(page: Page) {
    await page.locator('#calendar').scrollIntoViewIfNeeded();
    const points = await page.locator('#calendar [data-calendar-days]').evaluate(grid => {
      const rows = [...grid.querySelectorAll('[role="row"]')];
      const cells = [...rows[1]!.querySelectorAll('[role="gridcell"]')];
      const shaded = [...rows[1]!.querySelectorAll('.column-shade')].map(node => Number(getComputedStyle(node).gridColumnStart) - 1);
      const point = (node: Element) => { const box = node.getBoundingClientRect(); return { x: box.left + 2, y: box.top + 2 }; };
      return { body: point(cells.find((node, index) => !shaded.includes(index))!), weekend: point(cells[shaded[0]!]!), header: point(rows[0]!.querySelector('[role="columnheader"]')!) };
    });
    const png = (await page.screenshot({ scale: 'css' })).toString('base64');
    return page.evaluate(async ({ png, points }) => {
      const picture = new Image(); picture.src = 'data:image/png;base64,' + png; await picture.decode();
      const canvas = document.createElement('canvas'); canvas.width = picture.width; canvas.height = picture.height;
      const ctx = canvas.getContext('2d')!; ctx.drawImage(picture, 0, 0);
      const sample = (point: { x: number; y: number }) => [...ctx.getImageData(Math.floor(point.x), Math.floor(point.y), 1, 1).data].slice(0, 3);
      return { body: sample(points.body), weekend: sample(points.weekend), header: sample(points.header) };
    }, { png, points });
  }
  for (const adapter of ["HTML", "Converted"]) {
    it(`keeps calendar navigation and selection usable at 375px in light and dark ${adapter}`, async () => {
      const path = await bundle(`calendar-touch-${adapter}`, adapter === "HTML" ? 'import "@looma-test/runtime";' : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiCalendar as Calendar } from "@looma-test/components";
        createScene({ render: () => sceneNode("form", [sceneNode(Calendar, { id: "calendar", value: "2026-10-09", locale: "en-GB", min: "2026-10-05", disabledWeekdays: [6, 7], disabledDates: ["2026-10-12"] })]) }).mount("#app");
      `);
      const page = await open(path, adapter === "HTML" ? '<form><ui-calendar id="calendar" value="2026-10-09" locale="en-GB" min="2026-10-05" disabled-weekdays="[6,7]" disabled-dates=\'["2026-10-12"]\'></ui-calendar></form>' : '<div id="app"></div>', [join(root, "tokens.css"), join(root, "theme-light.css"), join(root, "theme-dark.css")], { viewport: { width: 375, height: 640 }, hasTouch: true });
      try {
        await page.addStyleTag({ content: 'body { font-family:var(--ui-font-family-sans); background:var(--ui-surface); color:var(--ui-text-primary); } form { max-inline-size:343px; }' });
        await page.evaluate(() => {
          (window as any).calendarSelections = [];
          document.querySelector("form")!.addEventListener("select", event => { if (event instanceof CustomEvent) (window as any).calendarSelections.push(event.detail); });
        });
        for (const theme of ["light", "dark"]) {
          await page.evaluate(mode => {
            document.documentElement.dataset.theme = mode;
            document.querySelector("form")!.dir = mode === "dark" ? "rtl" : "ltr";
            document.querySelector("#calendar")!.dispatchEvent(new CustomEvent("focus-date", { detail: { value: "2026-10-09" } }));
          }, theme);
          await page.locator('[data-calendar-month-toggle]').tap();
          await page.locator('[data-calendar-month="2026-11"]').tap();
          await page.waitForSelector('[data-calendar-day="2026-11-15"]');
          await page.locator('[data-calendar-month-toggle]').tap();
          await page.locator('[data-calendar-month="2026-10"]').tap();
          await page.waitForSelector('[data-calendar-day="2026-10-09"]');
          await expect.poll(() => page.locator('[data-calendar-day="2026-10-10"]').isDisabled()).toBe(true);
          await expect.poll(() => page.locator('[data-calendar-day="2026-10-12"]').isDisabled()).toBe(true);
          await page.locator('[data-calendar-day="2026-10-13"]').tap();
          await page.waitForFunction(() => document.querySelector('[data-calendar-day="2026-10-13"]')?.parentElement?.getAttribute("aria-selected") === "true");
          const paint = await paintedBands(page);
          const difference = (a: number[], b: number[]) => Math.max(...a.map((value, index) => Math.abs(value - b[index]!)));
          assert.ok(difference(paint.body, paint.weekend) >= 8, `${adapter}/${theme}: neutral weekend shading must be visible: ${JSON.stringify(paint)}`);
          assert.ok(difference(paint.body, paint.header) >= 8, `${adapter}/${theme}: the weekday band must be visible: ${JSON.stringify(paint)}`);
          const tint = paint.header.map((value, index) => value - paint.weekend[index]!);
          assert.ok(Math.max(...tint) - Math.min(...tint) >= 4, `${adapter}/${theme}: the weekday accent tint must differ from neutral shading: ${JSON.stringify(paint)}`);
          const geometry = await page.locator('#calendar').evaluate(element => ({ scroll: element.scrollWidth, width: element.clientWidth }));
          assert(geometry.scroll <= geometry.width + 1, JSON.stringify(geometry));
          if (process.env.LOOMA_CAPTURE_ARTIFACTS) await page.locator('#calendar').screenshot({ path: join(root, `../../.context/calendar-${adapter.toLowerCase()}-touch-${theme}.png`) });
        }
        assert.deepEqual(await page.evaluate(() => (window as any).calendarSelections), [{ value: "2026-10-13", trigger: "pointer" }, { value: "2026-10-13", trigger: "pointer" }]);
      } finally { await page.close(); }
    });
  }
});
