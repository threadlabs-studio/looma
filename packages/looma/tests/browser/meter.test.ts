import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Meter", () => {
for (const adapter of ["html", "converted"]) it(`animates checklist progress, retargets changes, and respects motion settings in ${adapter}`, async () => {
    const path = await bundle(`checklist-motion-${adapter}`, adapter === "html" ? `
      import "@looma-test/runtime";
      import { componentRegistry } from '@nextwebwg/html-next/runtime';
      window.setProgressTone = tone => componentRegistry.update(document.querySelector('#progress'), { tone });
      document.querySelector('#checklist').addEventListener('change', () => {
        componentRegistry.update(document.querySelector('#progress'), { value: document.querySelectorAll('#checklist input:checked').length });
      });` : `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiCheckbox as Checkbox, UiMeter as Meter } from '@looma-test/components';
      const completed = createState(2);
      const tone = createState('accent');
      window.setProgressTone = value => { tone.value = value; };
      createScene({ render: () => [
        sceneNode(Meter, { id: 'progress', value: completed.value, max: 3, label: 'Checklist progress', tone: tone.value, segments: 3 }),
        sceneNode('div', { id: 'checklist', onChange: event => { completed.value = event.currentTarget.querySelectorAll('input:checked').length; } },
          [true, true, false].map((checked, index) => sceneNode(Checkbox, { checked }, () => 'Step ' + (index + 1))))
      ] }).mount('#app');`);
    const page = await open(path, adapter === "html" ? `
      <ui-meter id="progress" value="2" max="3" label="Checklist progress" tone="accent" segments="3"></ui-meter>
      <div id="checklist"><ui-checkbox checked>Step 1</ui-checkbox><ui-checkbox checked>Step 2</ui-checkbox><ui-checkbox>Step 3</ui-checkbox></div>` : '<div id="app"></div>',
      [join(root, "tokens.css"), join(root, "theme-light.css")], { reducedMotion: "no-preference", viewport: { width: 375, height: 600 } });
    try {
      // Slow the shared role so intermediate geometry is observable without wall-clock guesses.
      await page.addStyleTag({ content: ':root { --ui-motion-layout: 1000ms; --ui-motion-layout-ease: linear; --ui-motion-feedback: 1000ms; }' });
      const meter = page.getByRole("meter", { name: "Checklist progress" });
      const fill = meter.locator(".fill");
      const width = await meter.evaluate(element => element.getBoundingClientRect().width);
      assert.ok(Math.abs(await fill.evaluate(element => element.getBoundingClientRect().width) / width - 2 / 3) < 0.01, "initial progress renders at its value");
      await page.getByRole("checkbox", { name: "Step 3" }).check();
      await page.waitForFunction(() => document.querySelector('#progress')?.getAttribute('aria-valuenow') === '3');
      const middle = await fill.evaluate(element => {
        const animation = element.getAnimations().find(animation => ['inline-size', 'width'].includes((animation as CSSTransition).transitionProperty));
        if (!animation) return null;
        animation.pause();
        animation.currentTime = 500;
        return element.getBoundingClientRect().width;
      });
      assert.ok(middle !== null && middle > width * 2 / 3 + 1 && middle < width - 1, `${adapter}: checking a step animates the bar: ${middle}/${width}`);
      // A second change takes over an unfinished transition and reaches the latest value.
      await page.getByRole("checkbox", { name: "Step 1" }).uncheck();
      await page.getByRole("checkbox", { name: "Step 2" }).uncheck();
      await page.waitForFunction(() => document.querySelector('#progress')?.getAttribute('aria-valuenow') === '1');
      await fill.evaluate(element => element.getAnimations().forEach(animation => animation.finish()));
      assert.ok(Math.abs(await fill.evaluate(element => element.getBoundingClientRect().width) / width - 1 / 3) < 0.01);
      const beforeTone = await fill.evaluate(element => getComputedStyle(element).backgroundColor);
      await page.evaluate(() => (window as unknown as { setProgressTone: (tone: string) => void }).setProgressTone('success'));
      const middleTone = await fill.evaluate(element => {
        const animation = element.getAnimations().find(animation => (animation as CSSTransition).transitionProperty === 'background-color');
        if (!animation) return null;
        animation.pause();
        animation.currentTime = 500;
        return getComputedStyle(element).backgroundColor;
      });
      assert.notEqual(middleTone, null, "status color changes use shared feedback timing");
      await fill.evaluate(element => element.getAnimations().forEach(animation => animation.finish()));
      assert.notEqual(middleTone, beforeTone);
      assert.notEqual(middleTone, await fill.evaluate(element => getComputedStyle(element).backgroundColor));
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.getByRole("checkbox", { name: "Step 3" }).uncheck();
      await page.waitForFunction(() => document.querySelector('#progress')?.getAttribute('aria-valuenow') === '0');
      assert.equal(await fill.evaluate(element => element.getBoundingClientRect().width), 0, "reduced motion overrides even custom nonzero timing");
      assert.equal(await fill.evaluate(element => element.getAnimations().length), 0);
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.addStyleTag({ content: ':root { --ui-motion-layout: 0ms; }' });
      await page.getByRole("checkbox", { name: "Step 3" }).check();
      await page.waitForFunction(() => document.querySelector('#progress')?.getAttribute('aria-valuenow') === '1');
      assert.ok(Math.abs(await fill.evaluate(element => element.getBoundingClientRect().width) / width - 1 / 3) < 0.01, "zero timing applies progress immediately");
    } finally { await page.close(); }
  });

  it("localizes its spoken percentage in native HTML and converted while keeping CSS numeric", async () => {
    for (const target of ["html", "converted"]) {
      const path = await bundle(`localized-meter-${target}`, target === "html"
        ? `import "@looma-test/runtime";`
        : `import { createScene, sceneNode, createState } from "@looma-test/scene";
           import { UiMeter as Meter } from "@looma-test/components";
           const value = createState(0.29);
           window.localizedMeterValue = value;
           createScene({ render: () => sceneNode(Meter, { value: value.value, label: "Progress" }) }).mount("#app");`);
      const page = await open(path, target === "html"
        ? '<ui-meter id="meter" value="0.29" label="Progress"></ui-meter>'
        : '<div id="app"></div>', css, { locale: "de-DE" });
      const meter = page.getByRole("meter", { name: "Progress" });
      await expect.poll(() => meter.getAttribute("aria-valuetext")).toBe("29\u00a0%");
      const fill = await meter.locator(".fill").evaluate((element) => (element as HTMLElement).style.inlineSize);
      assert.ok(fill.endsWith("%") && Math.abs(parseFloat(fill) - 29) < 0.000001, fill);
      if (target === "converted") {
        await page.evaluate(() => {
          (window as unknown as { localizedMeterValue: { value: number } }).localizedMeterValue.value = 0.5;
        });
        await page.waitForFunction(() => document.querySelector('[role="meter"]')?.getAttribute("aria-valuetext") === "50\u00a0%");
        assert.equal(await meter.locator(".fill").evaluate((element) => (element as HTMLElement).style.inlineSize), "50%");
      }
      await page.close();
    }
  });
  const tones = ["neutral", "accent", "info", "success", "warning", "danger"];
  const meters: [string, Record<string, unknown>][] = [
    ["partial", { value: 750, max: 1240, tone: "info", label: "Collected", valueText: "$750 of $1,240 collected" }],
    ["empty", { value: 0, max: 10, label: "Reviewed" }],
    ["full", { value: 12, max: 10, tone: "success", label: "Done" }],
    ["thin", { size: "sm", value: 0.5, label: "Thin" }],
    ["named", { value: 3, max: 5, "aria-labelledby": "steps-label" }],
    ["wide", { class: "wide", value: 0.5, label: "Wide" }],
    ["steps", { class: "steps", segments: 6, value: 4, max: 6, tone: "accent", label: "Status", valueText: "Shipped, step 4 of 6" }],
    ...tones.map((tone): [string, Record<string, unknown>] => [`tone-${tone}`, { tone, value: 1, label: tone }]),
  ];
  const css = ["tokens.css", "theme-light.css", "theme-dark.css"].map((file) => join(root, file));
  // 296px and a 4px gap make six segments of 46px, each starting on a whole pixel; the margin keeps
  // its neighbours out of the pixels either side of it.
  const hook = `<style>.wide { --ui-meter-inline-size: 300px; } .steps { --ui-meter-inline-size: 296px; margin-inline: 4px; }</style><span id="steps-label">Setup checklist</span>`;

  async function checkMeters(page: Page) {
    await page.locator("#tone-danger").waitFor();
    // Named by its label, or by visible text; the value reads as valueText, or as the percentage.
    const collected = page.getByRole("meter", { name: "Collected" });
    await expect.poll(() => collected.getAttribute("aria-valuetext")).toBe("$750 of $1,240 collected");
    await expect.poll(() => page.getByRole("meter", { name: "Setup checklist" }).getAttribute("aria-valuetext")).toBe("60%");

    const box = (selector: string) => page.locator(selector).evaluate((element) => {
      const track = element.getBoundingClientRect();
      const fill = element.querySelector(".fill")!.getBoundingClientRect();
      return { width: track.width, height: track.height, fill: fill.width / track.width, start: fill.left - track.left };
    });
    const partial = await box("#partial");
    assert.ok(Math.abs(partial.fill - 750 / 1240) < 0.01, `a partial meter fills ${partial.fill}`);
    assert.equal(partial.start, 0, "the fill starts at the track's start");
    // An empty meter still shows its track; a value above max fills it and no further.
    const empty = await box("#empty");
    assert.equal(empty.fill, 0);
    assert.ok(empty.width > 0 && empty.height > 0, "an empty meter shows its track");
    assert.notEqual(await page.locator("#empty").evaluate((element) => getComputedStyle(element).backgroundColor), "rgba(0, 0, 0, 0)");
    assert.equal((await box("#full")).fill, 1);
    await expect.poll(() => page.locator("#full").getAttribute("aria-valuenow")).toBe("10");
    // sm is a thinner bar; the hook sets the width.
    assert.ok((await box("#thin")).height < partial.height, "sm is thinner than md");
    assert.equal((await box("#wide")).width, 300);

    // Every tone's fill is its own colour and keeps 3:1 against the track and the page, light and dark.
    const colors = () => page.evaluate((tones) => {
      const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
      const luminance = (color: string) => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        const [r, g, b] = [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)].map((value) => {
          const c = value / 255;
          return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const probe = document.createElement("span");
      probe.style.color = "var(--ui-surface)";
      document.body.append(probe);
      const surface = luminance(getComputedStyle(probe).color);
      probe.remove();
      return tones.map((tone) => {
        const meter = document.querySelector(`#tone-${tone}`)!;
        const fill = getComputedStyle(meter.querySelector(".fill")!).backgroundColor;
        const value = luminance(fill);
        return { tone, fill, track: ratio(value, luminance(getComputedStyle(meter).backgroundColor)), surface: ratio(value, surface) };
      });
    }, tones);
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      const drawn = await colors();
      assert.equal(new Set(drawn.map(({ fill }) => fill)).size, tones.length, `${scheme}: each tone has its own fill`);
      for (const { tone, track, surface } of drawn) {
        assert.ok(track >= 3, `${scheme} ${tone}: fill against track is ${track.toFixed(2)}:1`);
        assert.ok(surface >= 3, `${scheme} ${tone}: fill against the page is ${surface.toFixed(2)}:1`);
      }
    }
    await page.emulateMedia({ colorScheme: "light" });

    // Forced colours drop the track's colour: the outline draws the track and the fill is text-coloured.
    // Segments: the page shows through each gap, the fill covers the steps done, the track the rest.
    const row = async () => {
      const box = await page.locator("#steps").evaluate((element) => {
        const { x, y, width, height } = element.getBoundingClientRect();
        return { x, y, width, height };
      });
      // Two pixels of page either side of the meter, along its middle row.
      const png = await page.screenshot({ clip: { x: box.x - 2, y: box.y + box.height / 2, width: box.width + 4, height: 1 } });
      return page.evaluate(async (data) => {
        const image = new Image();
        image.src = `data:image/png;base64,${data}`;
        await image.decode();
        const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
        context.drawImage(image, 0, 0);
        return Array.from({ length: image.width }, (_, x) => context.getImageData(x, 0, 1, 1).data.slice(0, 3).join());
      }, png.toString("base64"));
    };
    const at = (pixels: string[], x: number) => pixels[Math.floor(x) + 2];
    const segment = (index: number) => index * 50;
    await expect.poll(() => page.locator("#steps").getAttribute("aria-valuetext")).toBe("Shipped, step 4 of 6");
    const drawn = await row();
    const page0 = at(drawn, -1);
    for (let index = 0; index < 5; index++) assert.equal(at(drawn, segment(index) + 48), page0, `gap ${index + 1} shows the page`);
    const done = [0, 1, 2, 3].map((index) => at(drawn, segment(index) + 23));
    const todo = [4, 5].map((index) => at(drawn, segment(index) + 23));
    const near = (left: string, right: string) => left.split(",").every((channel, index) => Math.abs(Number(channel) - Number(right.split(",")[index])) <= 2);
    assert.ok(done.every((pixel) => near(pixel, done[0]!)), `the shaded steps done share one fill: ${done}`);
    assert.equal(new Set(todo).size, 1, "the steps to do are one colour");
    assert.notEqual(done[0], todo[0], "the fill differs from the track");
    assert.notEqual(todo[0], page0, "the track differs from the page");

    await page.emulateMedia({ forcedColors: "active" });
    // Forced colours: each segment keeps its outline, and the gaps still show the page.
    const outlined = await row();
    const canvas = at(outlined, -1);
    for (let index = 0; index < 5; index++) assert.equal(at(outlined, segment(index) + 48), canvas, `forced gap ${index + 1} shows the page`);
    for (const index of [4, 5]) {
      assert.equal(at(outlined, segment(index) + 23), canvas, `forced step ${index + 1} is hollow`);
      assert.notEqual(at(outlined, segment(index)), canvas, `forced step ${index + 1} draws its start`);
      assert.notEqual(at(outlined, segment(index) + 45), canvas, `forced step ${index + 1} draws its end`);
    }
    for (const index of [0, 1, 2, 3]) assert.equal(at(outlined, segment(index) + 23), at(outlined, segment(4)), `forced step ${index + 1} is filled`);
    const forced = await page.locator("#partial").evaluate((element) => ({
      outline: getComputedStyle(element).outlineColor,
      fill: getComputedStyle(element.querySelector(".fill")!).backgroundColor,
    }));
    assert.equal(forced.fill, forced.outline, "the fill takes the text colour the track's outline has");
    assert.notEqual(forced.fill, "rgba(0, 0, 0, 0)");
    await page.emulateMedia({ forcedColors: "none" });
  }

  it("fills its track, names its value, and keeps its tones legible, in HTML", async () => {
    const path = await bundle("html-meter", `import "@looma-test/runtime";`);
    const attributes = (props: Record<string, unknown>) =>
      Object.entries(props).map(([name, value]) => `${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}="${value}"`).join(" ");
    const page = await open(path, hook + meters.map(([id, props]) => `<ui-meter id="${id}" ${attributes(props)}></ui-meter>`).join(""), css, { reducedMotion: "reduce" });
    await checkMeters(page);
    await page.close();
  });

  it("fills its track, names its value, keeps its tones legible, and follows its value, in converted output", async () => {
    const path = await bundle("converted-meter", `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiMeter as Meter } from "@looma-test/components";
      const value = createState(750);
      window.meterValue = value;
      const meters = ${JSON.stringify(meters)};
      createScene({ render: () => meters.map(([id, props]) => sceneNode(Meter, { id, ...props, ...(id === "partial" ? { value: value.value } : {}) })) }).mount("#app");
    `);
    const page = await open(path, `${hook}<div id="app"></div>`, [...css], { reducedMotion: "reduce" });
    await checkMeters(page);
    await page.evaluate(() => { (window as unknown as { meterValue: { value: number } }).meterValue.value = 1240; });
    await page.waitForFunction(() => document.querySelector("#partial")?.getAttribute("aria-valuenow") === "1240");
    const fill = await page.locator("#partial").evaluate((element) => element.querySelector(".fill")!.getBoundingClientRect().width / element.getBoundingClientRect().width);
    assert.equal(fill, 1);
    await page.close();
  });
});
