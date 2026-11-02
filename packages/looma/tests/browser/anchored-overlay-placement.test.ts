import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import type { Editor } from "@tiptap/core";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Anchored overlay placement", () => {
  for (const adapter of ["HTML", "Converted"] as const) it(`supports manual popover activation with a replaceable anchor in ${adapter}`, async () => {
    const source = adapter === "HTML" ? `
      import "@looma-test/runtime";
      import { componentRegistry } from "@nextwebwg/html-next/runtime";
      window.setManualPopover = (values) => componentRegistry.update(document.querySelector('#manual-popup'), values);
    ` : `
      import { createScene, sceneNode, stateObject } from "@looma-test/scene";
      import { UiPopover as Popover } from "@looma-test/components";
      const props = stateObject({ for: 'first-anchor', open: false, trigger: 'manual' });
      window.setManualPopover = (values) => Object.assign(props, values);
      createScene({ render: () => sceneNode(Popover, { ...props, id: 'manual-popup' }, () => sceneNode('button', 'Inside')) }).mount('#app');
    `;
    const path = await bundle(`manual-popover-${adapter}`, source);
    const page = await open(path, `<button id="first-anchor">First</button><button id="second-anchor">Second</button>${adapter === "HTML" ? '<ui-popover id="manual-popup" for="first-anchor" trigger="manual"><button>Inside</button></ui-popover>' : '<div id="app"></div>'}`, [join(root, "tokens.css")]);
    try {
      await page.locator('#first-anchor').click();
      assert.equal(await page.locator('#manual-popup').evaluate(element => element.matches(':popover-open')), false);
      await page.evaluate(() => (window as any).setManualPopover({ open: true }));
      await page.waitForFunction(() => document.querySelector('#manual-popup')!.matches(':popover-open'));
      await page.locator('#first-anchor').click();
      assert.equal(await page.locator('#manual-popup').evaluate(element => element.matches(':popover-open')), true);
      await page.evaluate(() => (window as any).setManualPopover({ for: 'second-anchor' }));
      await page.waitForFunction(() => document.querySelector('#second-anchor')!.getAttribute('aria-expanded') === 'true');
      await expect.poll(() => page.locator('#first-anchor').getAttribute('aria-expanded')).not.toBe('true');
      await page.locator('#manual-popup button').focus(); await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('#manual-popup')!.matches(':popover-open'));
    } finally { await page.close(); }
  });

  it("presents an open popover and menu without for in the top layer at their written place, traveling with it", async () => {
    const path = await bundle("html-unanchored-popups", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <div style="height: 300px"></div>
      <div id="stage" style="margin-inline-start: 40px; padding: 20px"><ui-popover id="popover" open>Popover content</ui-popover></div>
      <div id="scroller" style="block-size: 200px; overflow: auto; padding: 10px">
        <ui-menu id="menu" open aria-label="Actions"><ui-menu-item value="alpha">Alpha</ui-menu-item></ui-menu>
        <div style="block-size: 600px"></div>
      </div>
      <div style="block-size: 2000px"></div>
    `, [join(root, "tokens.css")]);
    await page.waitForFunction(() => ["#popover", "#menu"].every((id) => document.querySelector(id)!.matches(":popover-open")));
    // Offsets from the written place: each holder's padding edge, less its own scroll.
    const offsets = () => page.evaluate(() => Object.fromEntries([["popover", "#stage"], ["menu", "#scroller"]].map(([id, holder]) => {
      const box = document.getElementById(id)!.getBoundingClientRect();
      const base = document.querySelector(holder)!;
      const rect = base.getBoundingClientRect();
      return [id, [Math.round(box.left - rect.left), Math.round(box.top - rect.top + base.scrollTop)]];
    })));
    const frames = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.deepEqual(await offsets(), { popover: [20, 20], menu: [10, 10] }, "not the viewport corner");
    await page.evaluate(() => { scrollTo(0, 100); document.querySelector("#scroller")!.scrollTop = 40; });
    await frames();
    assert.deepEqual(await offsets(), { popover: [20, 20], menu: [10, 10] }, "page and nested scrolling carry each popup with its place");
    await page.evaluate(() => document.querySelector("#stage")!.insertAdjacentHTML("beforebegin", '<div style="block-size: 100px"></div>'));
    await frames();
    assert.deepEqual(await offsets(), { popover: [20, 20], menu: [10, 10] }, "layout that moves the place carries each popup without a scroll");
    await page.close();
  });

  it("shares one viewport listener across HTML and converted popups, follows nested scrolling, and releases closed surfaces", async () => {
    const path = await bundle("mixed-overlay-coordinator", `
      import "@looma-test/runtime";
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiPopover as Popover } from "@looma-test/components";
      const visible = createState(false);
      window.frameworkPopupOpen = visible;
      createScene({ render: () => sceneNode(Popover, { id: "converted-popup", open: visible.value, for: "converted-anchor" }, () => "converted popup") }).mount("#app");
    `);
    const page = await open(path, `
      <script>
        window.viewportListeners = [];
        const add = window.addEventListener.bind(window);
        window.addEventListener = (type, listener, options) => {
          if (type === "scroll" && options?.signal) window.viewportListeners.push(options.signal);
          return add(type, listener, options);
        };
      </script>
      <div id="scroller" style="height: 400px; width: 900px; overflow: auto; transform: translateY(0)">
        <div style="height: 120px"></div>
        <button id="html-anchor" style="margin-left: 100px">HTML</button>
        <button id="converted-anchor" style="margin-left: 300px">converted</button>
        <ui-popover id="html-popup" for="html-anchor" open>HTML popup</ui-popover>
        <div id="app"></div>
        <div style="height: 1200px"></div>
      </div>
    `, [join(root, "tokens.css"), join(root, "theme-light.css")], { reducedMotion: "reduce" });
    await page.waitForFunction(() => document.querySelector("#html-popup")!.matches(":popover-open"));
    await page.evaluate(() => { (window as any).frameworkPopupOpen.value = true; });
    await page.waitForFunction(() => document.querySelector("#converted-popup")!.matches(":popover-open"));
    const activeListeners = () => page.evaluate(() => (window as any).viewportListeners.filter((signal: AbortSignal) => !signal.aborted).length);
    assert.equal(await activeListeners(), 1, "mixed adapters share one capture scroll listener");
    const before = await page.locator("#html-popup").boundingBox();
    await page.locator("#scroller").evaluate((element) => { element.scrollTop = 60; });
    await page.waitForFunction(() => {
      const anchor = document.querySelector("#html-anchor")!.getBoundingClientRect();
      const popup = document.querySelector("#html-popup")!.getBoundingClientRect();
      return Math.abs(popup.top - anchor.bottom - 4) <= 2;
    });
    const after = await page.locator("#html-popup").boundingBox();
    assert.ok(Math.abs(before!.y - after!.y - 60) <= 2, "attachment follows a nested scrolling container");
    for (const id of ["html-popup", "converted-popup"]) {
      assert.equal(await page.locator(`#${id}`).evaluate((element) => element.matches(":popover-open")), true);
    }
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("#converted-popup")!.matches(":popover-open"));
    assert.equal(await page.locator("#html-popup").evaluate((element) => element.matches(":popover-open")), true, "Escape closes only the top popup across adapters");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("#html-popup")!.matches(":popover-open") && !document.querySelector("#converted-popup")!.matches(":popover-open"));
    assert.equal(await activeListeners(), 0, "last close releases the shared listener");
    await page.close();
  });

  it("keeps an open popover at its last valid anchor when the trigger becomes unavailable", async () => {
    const path = await bundle("html-popover-unavailable-anchor", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <button id="anchor" style="position: fixed; left: 500px; top: 250px; width: 100px; height: 40px">Anchor</button>
      <ui-popover id="popover" for="anchor" open placement="bottom-start">Popover content</ui-popover>
    `, [join(root, "tokens.css")], { reducedMotion: "reduce" });
    await page.waitForFunction(() => document.querySelector("#popover")!.matches(":popover-open"));
    const previous = await page.locator("#popover").boundingBox();
    assert.ok(previous);
    for (const action of ["hide", "remove"]) {
      await page.locator("#anchor").evaluate((element, action) => {
        if (action === "hide") (element as HTMLElement).style.display = "none";
        else element.remove();
      }, action);
      await page.waitForTimeout(100);
      const current = await page.locator("#popover").boundingBox();
      assert.ok(current);
      assert.ok(Math.abs(current.x - previous.x) < 1, `${action} must not move the popover horizontally`);
      assert.ok(Math.abs(current.y - previous.y) < 1, `${action} must not move the popover vertically`);
    }
    await page.setViewportSize({ width: 375, height: 720 });
    await page.waitForFunction(() => {
      const rect = document.querySelector("#popover")!.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= window.innerWidth;
    });
    await page.close();
  });

  it("waits for a usable anchor instead of opening at zero-size trigger bounds", async () => {
    const path = await bundle("html-popover-hidden-anchor", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <button id="anchor" style="display: none; position: fixed; left: 500px; top: 250px; width: 100px; height: 40px">Anchor</button>
      <ui-popover id="popover" for="anchor" open placement="bottom-start">Popover content</ui-popover>
    `, [join(root, "tokens.css")], { reducedMotion: "reduce" });
    assert.equal(await page.locator("#popover").evaluate(element => element.matches(":popover-open")), false);
    await page.locator("#anchor").evaluate(element => { (element as HTMLElement).style.display = "block"; });
    await page.waitForFunction(() => document.querySelector("#popover")!.matches(":popover-open"));
    const current = await page.locator("#popover").boundingBox();
    assert.ok(current && current.x >= 499 && current.y >= 290);
    await page.close();
  });

  it("positions Popover and Tooltip on every side and alignment, then flips at an edge", async () => {
    const path = await bundle("html-overlay-placement", `import "@looma-test/runtime";`);
    const placements = ["top", "top-start", "top-end", "bottom", "bottom-start", "bottom-end", "left", "left-start", "left-end", "right", "right-start", "right-end"];
    for (const placement of placements) for (const tag of ["popover", "tooltip"]) {
      const page = await open(path, `
        <button id="anchor" style="position: fixed; left: 500px; top: 250px; width: 100px; height: 40px">Anchor</button>
        <ui-${tag} id="${tag}" for="anchor" open placement="${placement}">Overlay content</ui-${tag}>
      `, [join(root, "tokens.css")], { reducedMotion: "reduce" });
      await page.locator(`#${tag}`).waitFor({ state: "visible" });
      {
        const boxes = await page.evaluate((name) => {
          const anchor = document.querySelector("#anchor")!.getBoundingClientRect();
          const surface = document.querySelector(`#${name}`)!.getBoundingClientRect();
          return { anchor: { left: anchor.left, right: anchor.right, top: anchor.top, bottom: anchor.bottom }, surface: { left: surface.left, right: surface.right, top: surface.top, bottom: surface.bottom } };
        }, tag);
        const { anchor, surface } = boxes;
        const [side, align = "center"] = placement.split("-");
        if (side === "top") assert.ok(surface.bottom <= anchor.top, `${tag} ${placement}: ${JSON.stringify(boxes)}`);
        if (side === "bottom") assert.ok(surface.top >= anchor.bottom, `${tag} ${placement}: ${JSON.stringify(boxes)}`);
        if (side === "left") assert.ok(surface.right <= anchor.left, `${tag} ${placement}: ${JSON.stringify(boxes)}`);
        if (side === "right") assert.ok(surface.left >= anchor.right, `${tag} ${placement}: ${JSON.stringify(boxes)}`);
        const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) <= 3, `${tag} ${placement}: ${JSON.stringify(boxes)}`);
        if (side === "top" || side === "bottom") {
          if (align === "start") near(surface.left, anchor.left);
          else if (align === "end") near(surface.right, anchor.right);
          else near((surface.left + surface.right) / 2, (anchor.left + anchor.right) / 2);
        } else {
          if (align === "start") near(surface.top, anchor.top);
          else if (align === "end") near(surface.bottom, anchor.bottom);
          else near((surface.top + surface.bottom) / 2, (anchor.top + anchor.bottom) / 2);
        }
      }
      await page.close();
    }
    for (const tag of ["popover", "tooltip"]) {
    const rtl = await open(path, `
      <button id="anchor" dir="rtl" style="position: fixed; left: 500px; top: 250px; width: 100px; height: 40px">Anchor</button>
      <ui-${tag} id="${tag}" dir="rtl" for="anchor" open placement="top-start">Overlay content</ui-${tag}>
    `, [join(root, "tokens.css")], { reducedMotion: "reduce" });
    await rtl.locator(`#${tag}`).waitFor({ state: "visible" });
    {
      const distance = await rtl.evaluate((name) => document.querySelector("#anchor")!.getBoundingClientRect().right - document.querySelector(`#${name}`)!.getBoundingClientRect().right, tag);
      assert.ok(Math.abs(distance) <= 3, `${tag} top-start follows the RTL inline start`);
    }
    await rtl.close();
    const edge = await open(path, `
      <button id="anchor" style="position: fixed; left: 500px; top: calc(100vh - 45px); width: 100px; height: 40px">Anchor</button>
      <ui-${tag} id="${tag}" for="anchor" open placement="bottom">Overlay content</ui-${tag}>
    `, [join(root, "tokens.css")], { reducedMotion: "reduce" });
    await edge.locator(`#${tag}`).waitFor({ state: "visible" });
    {
      const flipped = await edge.evaluate((name) => document.querySelector(`#${name}`)!.getBoundingClientRect().bottom <= document.querySelector("#anchor")!.getBoundingClientRect().top, tag);
      assert.equal(flipped, true, `${tag} flips above the anchor when the bottom edge cannot fit it`);
    }
    await edge.close();
    }
  });

  it("keeps a Tooltip beside its trigger after an ancestor moves without resizing", async () => {
    const path = await bundle("html-tooltip-moving-anchor", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <div id="moving" style="position: fixed; left: 100px; top: 200px; transition: transform 100ms linear">
        <button id="anchor" style="width: 40px; height: 40px">Anchor</button>
      </div>
      <ui-tooltip id="tooltip" for="anchor" open placement="right">A helpful hint</ui-tooltip>
    `, [join(root, "tokens.css")], { reducedMotion: "reduce" });
    await page.evaluate(() => { document.querySelector<HTMLElement>("#moving")!.style.transform = "translateX(150px)"; });
    await page.waitForFunction(() => document.querySelector("#anchor")!.getBoundingClientRect().left >= 249);
    await page.waitForFunction(() => {
      const anchor = document.querySelector("#anchor")!.getBoundingClientRect();
      const hint = document.querySelector("#tooltip")!.getBoundingClientRect();
      return Math.abs(hint.left - anchor.right - 10) <= 1;
    }, undefined, { timeout: 2000 });
    await page.locator("#anchor").click();
    await page.close();
  });

  it("lets one Popover set its main-axis offset in CSS", async () => {
    const path = await bundle("html-popover-offset", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <button id="anchor" style="position: fixed; left: 500px; top: 250px; width: 100px; height: 40px">Anchor</button>
      <ui-popover id="popover" for="anchor" open placement="bottom" style="--ui-popover-offset: 20px">Offset content</ui-popover>
    `, [join(root, "tokens.css")], { reducedMotion: "reduce" });
    const gap = await page.evaluate(() => document.querySelector("#popover")!.getBoundingClientRect().top - document.querySelector("#anchor")!.getBoundingClientRect().bottom);
    assert.ok(Math.abs(gap - 20) <= 1, `Popover offset is ${gap}px`);
    await page.close();
  });

  it("shows the next Tooltip without another hover delay and reads its local offset", async () => {
    const path = await bundle("html-tooltip-warmup", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <button id="one" style="position: fixed; left: 300px; top: 200px">One</button>
      <button id="two" style="position: fixed; left: 500px; top: 200px">Two</button>
      <ui-tooltip id="first" for="one" show-delay="300" hide-delay="400">First hint</ui-tooltip>
      <ui-tooltip id="second" for="two" show-delay="300" hide-delay="0" placement="bottom" style="--ui-tooltip-offset: 16px">Second hint</ui-tooltip>
    `, [join(root, "tokens.css")], { reducedMotion: "reduce" });
    await page.locator("#one").hover();
    await page.waitForFunction(() => document.querySelector("#first")!.matches(":popover-open"));
    await page.locator("#two").hover();
    await page.waitForTimeout(80);
    assert.equal(await page.locator("#second").evaluate((element) => element.matches(":popover-open")), true);
    assert.equal(await page.locator("#first").evaluate((element) => element.matches(":popover-open")), false, "the previous tooltip closes as soon as the next opens");
    const gap = await page.evaluate(() => document.querySelector("#second")!.getBoundingClientRect().top - document.querySelector("#two")!.getBoundingClientRect().bottom);
    assert.ok(Math.abs(gap - 16) <= 1, `Tooltip offset is ${gap}px`);
    await page.close();
  });

  it("closes a tooltip when another popup opens and cancels delayed tooltips", async () => {
    const path = await bundle("html-tooltip-overlay-coordination", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <button id="hint-trigger">Hint</button>
      <ui-tooltip id="hint" for="hint-trigger" show-delay="0">Helpful hint</ui-tooltip>
      <button id="popup-trigger">Popup</button>
      <ui-popover id="popup" for="popup-trigger">Popup content</ui-popover>
    `, [join(root, "tokens.css")], { reducedMotion: "reduce" });
    await page.locator("#hint-trigger").hover();
    await page.waitForFunction(() => document.querySelector("#hint")!.matches(":popover-open"));
    await page.locator("#popup-trigger").evaluate((element: HTMLButtonElement) => element.click());
    await page.waitForFunction(() => document.querySelector("#popup")!.matches(":popover-open"));
    assert.equal(await page.locator("#hint").evaluate((element) => element.matches(":popover-open")), false, "opening a popup closes the tooltip");
    await page.close();

    const pending = await open(path, `
      <button id="hint-trigger">Hint</button>
      <ui-tooltip id="hint" for="hint-trigger" show-delay="150">Helpful hint</ui-tooltip>
      <button id="dialog-trigger">Dialog</button>
      <ui-dialog id="dialog" for="dialog-trigger" modal label="Dialog">Dialog content</ui-dialog>
    `, [join(root, "tokens.css")], { reducedMotion: "reduce" });
    await pending.locator("#hint-trigger").hover();
    await pending.locator("#dialog-trigger").evaluate((element: HTMLButtonElement) => element.click());
    await pending.waitForFunction(() => document.querySelector("#dialog")!.matches(":modal"));
    await pending.waitForTimeout(200);
    assert.equal(await pending.locator("#hint").evaluate((element) => element.matches(":popover-open")), false, "a queued tooltip does not appear over a modal");
    await pending.close();

    for (const [name, popup] of [
      ["search shell", `<ui-search-shell open modal label="Search"><input slot="search" aria-label="Search"></ui-search-shell>`],
      ["toast", `<ui-toast-region><ui-toast>Saved</ui-toast></ui-toast-region>`],
    ] as const) {
      const other = await open(path, `
        <button id="hint-trigger">Hint</button>
        <ui-tooltip id="hint" for="hint-trigger" open>Helpful hint</ui-tooltip>
      `, [join(root, "tokens.css")], { reducedMotion: "reduce" });
      await other.waitForFunction(() => document.querySelector("#hint")!.matches(":popover-open"));
      await other.evaluate(markup => document.body.insertAdjacentHTML("beforeend", markup), popup);
      await other.waitForFunction(() => document.querySelector("dialog")?.open || document.querySelector("ui-toast-region, :is([component~='ui-toast-region'], [data-component~='ui-toast-region'], .ui-toast-region, [ui-toast-region])")?.matches(":popover-open"));
      assert.equal(await other.locator("#hint").evaluate((element) => element.matches(":popover-open")), false, `${name} closes an existing tooltip`);
      await other.close();
    }

    const drawer = await open(path, `
      <button id="hint-trigger">Hint</button>
      <ui-tooltip id="hint" for="hint-trigger" open>Helpful hint</ui-tooltip>
      <ui-sidebar id="navigation" label="Navigation">Navigation content</ui-sidebar>
    `, [join(root, "tokens.css")], { viewport: { width: 600, height: 800 }, reducedMotion: "reduce" });
    await drawer.waitForFunction(() => document.querySelector("#navigation")?.hasAttribute("popover"));
    await drawer.locator("#navigation").evaluate((element: HTMLElement) => element.showPopover());
    await drawer.waitForFunction(() => document.querySelector("#navigation")?.matches(":popover-open"));
    assert.equal(await drawer.locator("#hint").evaluate((element) => element.matches(":popover-open")), false, "opening a sidebar drawer closes the tooltip");
    await drawer.close();
  });

  it("lets bare Popovers delegate their surface in HTML and converted", async () => {
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-bare-popover`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiPopover as Popover, UiEditorToolbar as EditorToolbar } from "@looma-test/components";
        createScene({ render: () => sceneNode(Popover, { id: "popup", open: true, bare: true }, () => sceneNode(EditorToolbar, { floating: true }, () => sceneNode("button", "Bold"))) }).mount("#app");
      `);
      const page = await open(path, adapter === "html" ? '<ui-popover id="popup" open bare><ui-editor-toolbar floating><button>Bold</button></ui-editor-toolbar></ui-popover>' : '<div id="app"></div>', [join(root, "tokens.css")], { reducedMotion: "reduce" });
      await page.waitForFunction(() => document.querySelector("#popup")?.matches(":popover-open"));
      const styles = await page.locator("#popup .surface").evaluate(element => {
        const style = getComputedStyle(element);
        return [style.padding, style.borderWidth, style.backgroundColor, style.boxShadow, style.overflow];
      });
      assert.deepEqual(styles, ["0px", "0px", "rgba(0, 0, 0, 0)", "none", "visible"]);
      await page.close();
    }
  });

  it("keeps selection toolbar shadows outside their positioning shell", async () => {
    const path = await bundle("converted-editor-toolbar-shadow", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { editorBrowserTarget } from "../../tests/editor-browser-target.ts";
      import { Extension, generateJSON } from "@tiptap/core";
      import { getDefaultEditorExtensions } from "@threadlabs/looma/editor/extensions";
      editorBrowserTarget().then(LoomaEditor => {
      createScene({ render: () => sceneNode(LoomaEditor, {
        toolbarMode: "contextual", compactToolbar: true,
        content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Select some words" }] }] },
        extensions: () => [Extension.create({ name: "fixtureConsumer", onCreate() { const editor = this.editor; window.fixtureEditor = editor; } })],
      }) }).mount("#app");
      });
    `);
    const page = await open(path, '<div id="app" style="margin: 150px 40px"></div>', [join(root, "tokens.css"), join(root, "theme-light.css")], { reducedMotion: "reduce" });
    await page.waitForFunction(() => Boolean((window as unknown as { fixtureEditor?: Editor }).fixtureEditor));
    await page.evaluate(() => (window as unknown as { fixtureEditor: Editor }).fixtureEditor.chain().focus().setTextSelection({ from: 8, to: 12 }).run());
    const shell = page.locator(".looma-editor__formatting-shell:popover-open");
    await shell.waitFor();
    assert.equal(await shell.evaluate(element => getComputedStyle(element).overflow), "visible", "the positioning shell must not crop the toolbar's rounded shadow");
    await page.close();
  });

  it("gives expanded and trigger-owned formatting one floating surface", async () => {
    for (const mode of ["contextual", "popover"]) {
      const path = await bundle(`converted-editor-format-surface-${mode}`, `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { editorBrowserTarget } from "../../tests/editor-browser-target.ts";
        import { Extension } from "@tiptap/core";
        editorBrowserTarget().then(LoomaEditor => {
        createScene({ render: () => sceneNode(LoomaEditor, {
          toolbarMode: "${mode}", compactToolbar: ${mode === "contextual"}, toolbarTriggerId: "format-trigger",
          content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Select some words" }] }] },
          extensions: () => [Extension.create({ name: "fixtureConsumer", onCreate() { const editor = this.editor; window.fixtureEditor = editor; } })],
        }) }).mount("#app");
        });
      `);
      const page = await open(path, '<button id="format-trigger" style="margin: 100px 40px 40px">Formatting tools</button><div id="app"></div>', [join(root, "tokens.css"), join(root, "theme-light.css")], { reducedMotion: "reduce" });
      if (mode === "contextual") {
        await page.waitForFunction(() => Boolean((window as unknown as { fixtureEditor?: Editor }).fixtureEditor));
    await page.evaluate(() => (window as unknown as { fixtureEditor: Editor }).fixtureEditor.chain().focus().setTextSelection({ from: 8, to: 12 }).run());
        await page.getByRole("button", { name: "Format", exact: true }).click();
      } else await page.locator("#format-trigger").click();
      const popup = page.locator(mode === "contextual" ? ".looma-editor__compact-formatting" : ".looma-editor__formatting-popover");
      await page.waitForFunction(selector => document.querySelector(selector)?.matches(":popover-open"), mode === "contextual" ? ".looma-editor__compact-formatting" : ".looma-editor__formatting-popover");
      const surface = await popup.evaluate(element => {
        const panel = element.querySelector(".surface")!;
        const style = getComputedStyle(panel), box = panel.getBoundingClientRect();
        const toolbar = panel.querySelector('[role="toolbar"]')!.getBoundingClientRect();
        return { padding: style.padding, border: style.borderWidth, shadow: style.boxShadow, overflow: style.overflow, background: style.backgroundColor, width: box.width - toolbar.width, height: box.height - toolbar.height };
      });
      assert.deepEqual(surface, { padding: "0px", border: "0px", shadow: "none", overflow: "visible", background: "rgba(0, 0, 0, 0)", width: 0, height: 0 }, `${mode}: the toolbar owns the sole surface and its shadow stays visible`);
      if (mode === "contextual") {
        await popup.getByRole("button", { name: "Heading 2", exact: true }).click();
        assert.equal(await page.evaluate(() => (window as unknown as { fixtureEditor: Editor }).fixtureEditor.isActive("heading", { level: 2 })), true);
      }
      await page.keyboard.press("Escape");
      await page.waitForFunction(selector => !document.querySelector(selector)?.matches(":popover-open"), mode === "contextual" ? ".looma-editor__compact-formatting" : ".looma-editor__formatting-popover");
      await page.close();
    }
  });

  it("closes a tooltip when the editor selection toolbar opens", async () => {
    const path = await bundle("converted-editor-tooltip-coordination", `
      import "@looma-test/runtime";
      import { createScene, sceneNode } from "@looma-test/scene";
      import { editorBrowserTarget } from "../../tests/editor-browser-target.ts";
      import { Extension } from "@tiptap/core";
      editorBrowserTarget().then(LoomaEditor => {
      createScene({ render: () => sceneNode(LoomaEditor, {
        label: "Writing",
        content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Select some words" }] }] },
        extensions: () => [Extension.create({ name: "fixtureConsumer", onCreate() { const editor = this.editor; window.fixtureEditor = editor; } })],
      }) }).mount("#app");
      });
    `);
    const page = await open(path, `
      <button id="hint-trigger">Hint</button>
      <ui-tooltip id="hint" for="hint-trigger" open>Helpful hint</ui-tooltip>
      <div id="app"></div>
    `, [join(root, "tokens.css"), join(root, "theme-light.css")], { reducedMotion: "reduce" });
    // Select "some" through the editor. Keys pressed right after focus race ProseMirror's post-focus
    // selection restore, which can put back the caret it last read and drop the selection.
    await page.waitForFunction(() => "fixtureEditor" in window);
    await page.waitForFunction(() => Boolean((window as unknown as { fixtureEditor?: Editor }).fixtureEditor));
    await page.evaluate(() => (window as unknown as { fixtureEditor: Editor }).fixtureEditor.chain().focus().setTextSelection({ from: 8, to: 12 }).run());
    await page.waitForFunction(() => document.querySelector(".looma-editor__floating-shell:popover-open")?.getBoundingClientRect().width);
    assert.equal(await page.locator("#hint").evaluate((element) => element.matches(":popover-open")), false);
    await page.close();
  });
});
