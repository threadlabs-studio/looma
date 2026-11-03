import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import type { Editor } from "@tiptap/core";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open, look } from "../renderers/browser-driver";

describe("Editor callouts", () => {
  async function openCalloutFixture() {
    const path = await bundle("converted-editor-callout-layout", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { editorBrowserTarget } from "../../tests/editor-browser-target.ts";
      import { Extension, generateJSON } from "@tiptap/core";
      import { getDefaultEditorExtensions } from "@threadlabs/looma/editor/extensions";
      editorBrowserTarget().then(LoomaEditor => {
      createScene({ render: () => sceneNode(LoomaEditor, { extensions: () => [Extension.create({ name: "fixtureConsumer", onCreate() { const editor = this.editor; window.fixtureEditor = editor; } })] }) }).mount("#app");
      });
    `);
    const page = await open(path, '<div id="app"></div>', [join(root, "tokens.css"), join(root, "theme-light.css"), join(root, "theme-dark.css")]);
    await page.waitForFunction(() => "fixtureEditor" in window);
    return page;
  }

  it("keeps callout first lines aligned without collapsing authored whitespace", async () => {
    const page = await openCalloutFixture();
    const text = "Keep  both spaces.\nAnd this line.";
    for (const width of [375, 1280]) for (const heading of ["", "Before you start"]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(({ text, heading }) => {
        (window as unknown as { fixtureEditor: Editor }).fixtureEditor.commands.setContent({ type: "doc", content: [
          { type: "loomaCallout", attrs: { tone: "tip", heading }, content: [{ type: "paragraph", content: [{ type: "text", text }] }] },
        ] });
      }, { text, heading });
      const callout = page.locator('.ProseMirror :is([component~=ui-callout],[data-component~=ui-callout],.ui-callout,[ui-callout])');
      await callout.waitFor();
      const layout = await callout.evaluate(element => {
        const icon = element.querySelector(".icon")!.getBoundingClientRect();
        const body = element.querySelector<HTMLElement>("[data-looma-callout-body]")!;
        const first = element.querySelector(".heading") ?? body.querySelector("p")!;
        return { gap: Math.abs(icon.top - first.getBoundingClientRect().top), text: body.textContent, whiteSpace: getComputedStyle(body).whiteSpace };
      });
      assert.ok(layout.gap < 1, `callout icon and first line align at ${width}px (gap ${layout.gap})`);
      assert.equal(layout.text, text);
      assert.equal(layout.whiteSpace, "break-spaces", "document whitespace stays editable and preserved");
    }
    await page.close();
  });

  it("isolates shared editor component chrome while preserving owned document whitespace", async () => {
    const page = await openCalloutFixture();
    const text = "Keep  both spaces.\nAnd this line.";
    await page.evaluate(text => {
      (window as unknown as { fixtureEditor: Editor }).fixtureEditor.commands.setContent({ type: "doc", content: [
        { type: "loomaCallout", attrs: { tone: "tip" }, content: [{ type: "paragraph", content: [{ type: "text", text }] }] },
        { type: "loomaExpand", attrs: { summary: "Details", open: true }, content: [{ type: "paragraph", content: [{ type: "text", text }] }] },
      ] });
    }, text);
    const before = await page.evaluate(() => (window as unknown as { fixtureEditor: Editor }).fixtureEditor.getJSON());
    for (const [tag, body] of [["ui-callout", "data-looma-callout-body"], ["ui-disclosure", "data-looma-expand-body"]]) {
      const chrome = page.locator(`.ProseMirror :is([component~="${tag}"],[data-component~="${tag}"],.${tag},[${tag}])`);
      await chrome.waitFor();
      const styles = await chrome.evaluate((element, body) => {
        const content = element.querySelector(`[${body}]`)!;
        return { chrome: getComputedStyle(element).whiteSpace, document: getComputedStyle(content).whiteSpace, text: content.textContent };
      }, body);
      assert.equal(styles.chrome, "normal", `${tag} isolates template whitespace at the shared editor boundary`);
      assert.equal(styles.document, "break-spaces", `${tag} preserves projected document whitespace`);
      assert.equal(styles.text, text);
    }
    assert.equal(await page.locator(".ProseMirror").evaluate(element => getComputedStyle(element).whiteSpace), "break-spaces");
    const button = page.locator('.ProseMirror :is([component~=ui-button],[data-component~=ui-button],.ui-button,[ui-button])').first();
    assert.equal(await button.evaluate(element => {
      (element as HTMLElement).style.setProperty("--ui-button-white-space", "nowrap");
      return getComputedStyle(element).whiteSpace;
    }), "nowrap", "explicit component wrapping still wins over the shared default");
    await page.evaluate(() => (window as unknown as { fixtureEditor: Editor }).fixtureEditor.setEditable(false));
    for (const body of ["data-looma-callout-body", "data-looma-expand-body"]) {
      assert.equal(await page.locator(`[${body}]`).evaluate(element => (element as HTMLElement).isContentEditable), false);
    }
    assert.deepEqual(await page.evaluate(() => (window as unknown as { fixtureEditor: Editor }).fixtureEditor.getJSON()), before);
    await page.evaluate(text => {
      const editor = (window as unknown as { fixtureEditor: Editor }).fixtureEditor;
      editor.setEditable(true);
      editor.commands.setContent({ type: "doc", content: [
        { type: "loomaExpand", attrs: { summary: "Nested", open: true }, content: [
          { type: "loomaCallout", attrs: { tone: "info" }, content: [{ type: "paragraph", content: [{ type: "text", text }] }] },
        ] },
        { type: "codeBlock", content: [{ type: "text", text }] },
      ] });
    }, text);
    const nested = page.locator('[data-looma-expand-body] :is([component~=ui-callout],[data-component~=ui-callout],.ui-callout,[ui-callout])');
    assert.equal(await nested.evaluate(element => getComputedStyle(element).whiteSpace), "normal");
    assert.equal(await nested.locator("p").evaluate(element => getComputedStyle(element).whiteSpace), "break-spaces");
    await expect.poll(() => nested.locator("p").textContent()).toBe(text);
    assert.match(await page.locator(".ProseMirror pre").evaluate(element => getComputedStyle(element).whiteSpace), /^(pre|pre-wrap|break-spaces)$/);
    await expect.poll(() => page.locator(".ProseMirror pre").textContent()).toBe(text);
    await page.close();
  });

  async function paintedCallout(page: Page, colorTone: string) {
    return page.evaluate(colorTone => {
      const element = document.querySelector('.ProseMirror :is([component~=ui-callout],[data-component~=ui-callout],.ui-callout,[ui-callout])')!;
      const style = getComputedStyle(element);
      const probe = document.body.appendChild(document.createElement("span"));
      const context = document.createElement("canvas").getContext("2d")!;
      const paint = (color: string, backdrop?: string) => {
        context.clearRect(0, 0, 1, 1);
        if (backdrop) { context.fillStyle = backdrop; context.fillRect(0, 0, 1, 1); }
        context.fillStyle = color; context.fillRect(0, 0, 1, 1);
        return [...context.getImageData(0, 0, 1, 1).data];
      };
      const resolve = (color: string) => { probe.style.color = color; return getComputedStyle(probe).color; };
      const perceptual = (rgb: number[]) => {
        const color = resolve(`oklch(from rgb(${rgb.slice(0, 3).join(" ")}) l c h)`);
        return (color.match(/[-+]?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
      };
      const luminance = (rgb: number[]) => {
        const [r, g, b] = rgb.slice(0, 3).map(value => { const channel = value / 255; return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4; });
        return .2126 * r! + .7152 * g! + .0722 * b!;
      };
      const paper = resolve("var(--ui-surface)");
      const rgba = paint(style.backgroundColor);
      const background = paint(style.backgroundColor, paper);
      const source = perceptual(paint(resolve(`var(--ui-${colorTone}-solid)`)));
      const rendered = perceptual(background);
      const ink = luminance(paint(style.color, `rgb(${background.slice(0, 3).join(" ")})`));
      const surface = luminance(background);
      probe.remove();
      return { rgba, rendered, source, contrast: (Math.max(ink, surface) + .05) / (Math.min(ink, surface) + .05) };
    }, colorTone);
  }

  it("keeps colored callouts perceptibly tinted, pale and readable in both themes", async () => {
    const page = await openCalloutFixture();
    for (const theme of ["light", "dark"]) for (const [tone, colorTone] of Object.entries({ info: "info", tip: "info", important: "accent", warning: "warning", success: "success", danger: "danger", caution: "danger" })) {
      await page.evaluate(({ theme, tone }) => {
        document.documentElement.dataset.theme = theme;
        document.body.style.backgroundColor = "var(--ui-surface)";
        (window as unknown as { fixtureEditor: Editor }).fixtureEditor.commands.setContent({ type: "doc", content: [{ type: "loomaCallout", attrs: { tone }, content: [{ type: "paragraph", content: [{ type: "text", text: "A notice." }] }] }] });
      }, { theme, tone });
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      const paint = await paintedCallout(page, colorTone);
      const [lightness, chroma, hue] = paint.rendered;
      const hueDistance = Math.abs(((hue! - paint.source[2]! + 540) % 360) - 180);
      assert.equal(paint.rgba[3], 255, `${theme}/${tone}: opacity must not wash the hue into the backdrop`);
      assert.ok(theme === "light" ? lightness! >= .92 : lightness! >= .30 && lightness! <= (hue! > 35 && hue! < 105 ? .44 : .39), `${theme}/${tone}: background lightness ${lightness}`);
      // Quiet surfaces use chroma .02 × .74; allow for the final 8-bit paint quantization.
      assert.ok(chroma! >= .02 * .74 - .001, `${theme}/${tone}: the painted tint must retain visible chroma ${chroma}`);
      assert.ok(hueDistance < 10, `${theme}/${tone}: painted hue follows its tone ${hueDistance}`);
      assert.ok(paint.contrast >= 4.5, `${theme}/${tone}: readable text contrast ${paint.contrast}`);
    }
    await page.close();
  });

  it("keeps a pale muted-green background restrained after painting", async () => {
    const page = await openCalloutFixture();
    await page.evaluate(() => {
      document.documentElement.dataset.theme = "light";
      document.documentElement.style.setProperty("--ui-success", "#4c702d");
      document.body.style.backgroundColor = "var(--ui-surface)";
      (window as unknown as { fixtureEditor: Editor }).fixtureEditor.commands.setContent({ type: "doc", content: [{ type: "loomaCallout", attrs: { tone: "success" }, content: [{ type: "paragraph", content: [{ type: "text", text: "A green notice." }] }] }] });
    });
    const { rendered: [lightness, chroma, hue], contrast } = await paintedCallout(page, "success");
    assert.ok(lightness! >= .94, `a light background must stay pale: ${lightness}`);
    assert.ok(Math.abs(chroma! - .02 * .74) <= .001, `green stays visibly tinted without exceeding the shared quiet chroma: ${chroma}`);
    assert.ok(hue! >= 125 && hue! <= 140, `the background retains the muted green hue: ${hue}`);
    assert.ok(contrast >= 4.5);
    await page.close();
  });

  it("preserves perceptual tint hue across custom source palettes", async () => {
    const page = await openCalloutFixture();
    await page.evaluate(() => {
      document.body.style.backgroundColor = "var(--ui-surface)";
      (window as unknown as { fixtureEditor: Editor }).fixtureEditor.commands.setContent({ type: "doc", content: [{ type: "loomaCallout", attrs: { tone: "tip" }, content: [{ type: "paragraph", content: [{ type: "text", text: "A colored notice." }] }] }] });
    });
    for (const theme of ["light", "dark"]) for (let hue = 0; hue < 360; hue += 30) {
      await page.evaluate(({ theme, hue }) => {
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.setProperty("--ui-info", `oklch(60% .1 ${hue})`);
      }, { theme, hue });
      const paint = await paintedCallout(page, "info");
      const hueDistance = Math.abs(((paint.rendered[2]! - paint.source[2]! + 540) % 360) - 180);
      assert.ok(hueDistance < 10, `${theme}/${hue}: gamut clipping must not shift the painted hue ${JSON.stringify(paint)}`);
      assert.ok(theme === "light" ? paint.rendered[0]! >= .94 : paint.rendered[0]! >= .30 && paint.rendered[0]! <= (hue > 35 && hue < 105 ? .44 : .39));
      assert.ok(paint.contrast >= 4.5);
    }
    await page.close();
  });

  it("draws editor callouts, older asides included, with Callout and saves them as Callout", async () => {
    const path = await bundle("converted-editor-callout", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiCallout as Callout } from "@looma-test/components";
      import { editorBrowserTarget } from "../../tests/editor-browser-target.ts";
      import { Extension, generateJSON } from "@tiptap/core";
      import { getDefaultEditorExtensions } from "@threadlabs/looma/editor/extensions";
      editorBrowserTarget().then(LoomaEditor => {
      window.saved = [];
      createScene({ render: () => sceneNode("div", [
        sceneNode(Callout, { id: "reference", tone: "tip", heading: "Before you start" }, () => "Reference"),
        sceneNode(LoomaEditor, {
          label: "Writing",
          content: generateJSON('<ui-callout tone="tip" heading="Before you start"><p>Install first.</p></ui-callout><aside data-looma-callout data-tone="warning"><p>Older.</p></aside>', getDefaultEditorExtensions()),
          extensions: () => [Extension.create({ name: "fixtureConsumer", onCreate() { const editor = this.editor; window.fixtureEditor = editor; } })],
        }),
      ]) }).mount("#app");
      });
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "theme-light.css")]);
    await page.waitForFunction(() => "fixtureEditor" in window);
    const callouts = page.locator(".ProseMirror :is([component~='ui-callout'], [data-component~='ui-callout'], .ui-callout, [ui-callout])");
    await expect.poll(() => callouts.count(), { message: "both callouts draw as Callout" }).toBe(2);
    const look = (locator: ReturnType<Page["locator"]>) => locator.evaluate(element => {
      const css = getComputedStyle(element);
      return { surface: css.backgroundColor, border: css.borderTopColor, radius: css.borderTopLeftRadius, heading: element.querySelector(".heading")?.textContent ?? "" };
    });
    assert.deepEqual(await look(callouts.first()), await look(page.locator("#reference")), "an editor callout looks like a page callout");
    await expect.poll(() => callouts.nth(1).getAttribute("data-ui-callout-prop-tone")).toBe("warning");
    const rhythm = await page.evaluate(() => {
      const [first, second] = [...document.querySelectorAll(".ProseMirror [data-looma-callout]")].map(element => element.getBoundingClientRect());
      return { gap: second.top - first.bottom, last: getComputedStyle(document.querySelector("[data-looma-callout-body] > :last-child")!).marginBottom };
    });
    assert.ok(rhythm.gap >= 12, `callouts keep the document's block gap (${rhythm.gap})`);
    assert.equal(rhythm.last, "0px", "a callout's last block adds no gap inside it");
    await callouts.first().locator("p").click();
    await page.keyboard.type(" Now");
    assert.equal(await page.evaluate(() => (window as unknown as { fixtureEditor: Editor }).fixtureEditor.getHTML()),
      '<ui-callout tone="tip" heading="Before you start"><p>Install first. Now</p></ui-callout><ui-callout tone="warning"><p>Older.</p></ui-callout>');
    await page.close();
  });
});
