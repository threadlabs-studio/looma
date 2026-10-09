// Drives the built package (run `pnpm build` first) in Chromium, the way consumers use it: a Vue app
// importing @threadlabs/looma/vue, and a plain page registering the components with dist/index.js.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type BrowserContextOptions, type Page } from "playwright";
import { build } from "vite";
import { afterAll, beforeAll, describe, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let directory = "";
let browser: Browser;

async function bundle(name: string, source: string, mode = "production"): Promise<string> {
  const entry = join(directory, `${name}.js`);
  await writeFile(entry, source);
  await build({
    configFile: false,
    logLevel: "silent",
    root: directory,
    resolve: { alias: { "@threadlabs/looma": root } },
    define: { "process.env.NODE_ENV": JSON.stringify(mode) },
    build: {
      outDir: join(directory, name),
      minify: false,
      lib: { entry, formats: ["iife"], name: name.replace(/\W/g, "_"), fileName: () => "bundle.js" },
    },
  });
  return join(directory, name, "bundle.js");
}

async function open(bundlePath: string, body: string, css: readonly string[], options: BrowserContextOptions = {}, beforeLoad?: (page: Page) => Promise<void>): Promise<Page> {
  const page = await browser.newPage(options);
  await beforeLoad?.(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent(`<!doctype html><html><body>${body}</body></html>`);
  for (const path of css) await page.addStyleTag({ path });
  await page.addScriptTag({ path: bundlePath });
  await page.waitForTimeout(50);
  assert.deepEqual(errors, []);
  return page;
}

beforeAll(async () => {
  // Inside the package, so bundles resolve vue and the package's own dependencies.
  await mkdir(join(root, ".build"), { recursive: true });
  directory = await mkdtemp(join(root, ".build", "browser-"));
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});

describe("Pressed icon controls and circular marks", () => {
  it("keeps a readable Container bounded around scrolling content in HTML and Vue", async () => {
    for (const adapter of ["html", "vue"]) {
      const path = await bundle(`${adapter}-container-fill`, adapter === "html" ? `import "@threadlabs/looma";` : `
        import { createApp, h } from "vue";
        import { Container, Stack, ScrollArea, Button } from "@threadlabs/looma/vue";
        createApp({ render: () => h(Container, { id: "reading", fill: true }, () => h(Stack, { fill: true }, () => [
          h(ScrollArea, { id: "scroll", fill: true }, () => Array.from({ length: 50 }, (_, i) => h("p", "Reading line " + i))),
          h(Button, { id: "continue" }, () => "Continue")
        ])) }).mount("#app");
      `);
      const content = adapter === "html" ? `<ui-container id="reading" fill><ui-stack fill><ui-scroll-area id="scroll" fill>${Array.from({ length: 50 }, (_, i) => `<p>Reading line ${i}</p>`).join("")}</ui-scroll-area><ui-button id="continue">Continue</ui-button></ui-stack></ui-container>` : "";
      const page = await open(path, `<div id="app" style="display:grid;height:320px;width:100%">${content}</div>`,
        [join(root, "tokens.css"), ...(adapter === "vue" ? [join(root, "vue/components.css")] : [])]);
      await page.waitForSelector('#reading[data-component~="ui-container"]');
      for (const width of [1280, 375]) {
        await page.setViewportSize({ width, height: 720 });
        const geometry = await page.evaluate(() => {
          const frame = document.querySelector("#app")!.getBoundingClientRect(), reading = document.querySelector("#reading")!.getBoundingClientRect();
          const action = document.querySelector("#continue")!.getBoundingClientRect(), scroll = document.querySelector("#scroll")!;
          return { height: reading.height, frameHeight: frame.height, width: reading.width, frameWidth: frame.width,
            centered: Math.abs((reading.left + reading.right - frame.left - frame.right) / 2), actionBottom: action.bottom, frameBottom: frame.bottom,
            scrolls: scroll.scrollHeight > scroll.clientHeight };
        });
        assert.equal(geometry.height, geometry.frameHeight, `${adapter}/${width}: fills the bounded parent`);
        assert.ok(geometry.actionBottom <= geometry.frameBottom + 1, "action remains inside the panel");
        assert.ok(geometry.scrolls, "long content scrolls instead of expanding the panel");
        assert.ok(geometry.centered < 1, `${adapter}/${width}: reading column remains centered ${JSON.stringify(geometry)}`);
        assert.ok(width === 375 ? geometry.width <= geometry.frameWidth : geometry.width < geometry.frameWidth, "readable measure remains bounded");
      }
      await page.close();
    }
  });

  it("keeps an accent outline toggle pressed after release in HTML and Vue", async () => {
    for (const adapter of ["html", "vue"]) {
      const path = await bundle(`${adapter}-pressed-icon`, adapter === "html" ? `import "@threadlabs/looma";` : `
        import { createApp, h } from "vue";
        import { IconButton, Icon, Tooltip } from "@threadlabs/looma/vue";
        createApp({ render: () => [
          h(IconButton, { id: "toggle", label: "Notifications", variant: "outline", tone: "accent", anticipatory: true, "aria-pressed": true }, () => h(Icon, { name: "bell" })),
          h(IconButton, { id: "neutral", label: "Neutral", variant: "outline" }, () => h(Icon, { name: "bell" })),
          h(Tooltip, { for: "toggle" }, () => "Notifications")
        ] }).mount("#app");
      `);
      const page = await open(path, adapter === "html" ? `
        <ui-icon-button id="toggle" label="Notifications" variant="outline" tone="accent" anticipatory aria-pressed="true"><ui-icon name="bell"></ui-icon></ui-icon-button>
        <ui-icon-button id="neutral" label="Neutral" variant="outline"><ui-icon name="bell"></ui-icon></ui-icon-button>
        <ui-tooltip for="toggle">Notifications</ui-tooltip>
      ` : '<div id="app"></div>', [join(root, "tokens.css"), ...(adapter === "vue" ? [join(root, "vue/components.css")] : [])], { reducedMotion: "reduce" });
      const paint = (id: string) => page.locator(id).evaluate(element => {
        const style = getComputedStyle(element);
        return { border: style.borderColor, color: style.color, surface: style.backgroundColor, image: style.backgroundImage, shadow: style.boxShadow,
          iconOpacity: getComputedStyle(element.querySelector(".content")!).opacity };
      });
      await page.waitForSelector('#toggle[data-component~="ui-icon-button"]');
      const selected = await paint("#toggle");
      assert.ok(selected.shadow.includes("inset"), `${adapter}: selected control stays inset at rest`);
      assert.equal(selected.image, "none");
      assert.equal(selected.iconOpacity, "1", "selected anticipatory control remains visible");
      assert.notEqual(selected.border, (await paint("#neutral")).border);
      await page.locator("#toggle").click();
      assert.equal(await page.locator("#toggle").getAttribute("aria-pressed"), "true", "consumer owns toggle state");
      await page.mouse.move(300, 200);
      await page.locator("#toggle").blur();
      assert.ok((await paint("#toggle")).shadow.includes("inset"));
      await page.locator("#toggle").focus();
      assert.ok((await paint("#toggle")).shadow.includes("inset"), "focus keeps selected state");
      await page.getByRole("tooltip").waitFor({ state: "visible" });
      await page.locator("#toggle").evaluate(element => {
        element.setAttribute("aria-pressed", "false");
      });
      assert.notEqual((await paint("#toggle")).surface, selected.surface, "native state update releases the wash");
      await page.locator("#toggle").evaluate(element => element.setAttribute("aria-pressed", "true"));
      await page.emulateMedia({ forcedColors: "active" });
      assert.equal(await page.locator("#toggle").evaluate(element => getComputedStyle(element).outlineStyle), "solid", "pressed state survives forced colors");
      await page.emulateMedia({ forcedColors: "none" });
      await page.locator("#toggle").evaluate(element => { element.setAttribute("aria-pressed", "true"); (element as HTMLButtonElement).disabled = true; });
      assert.equal((await paint("#toggle")).shadow, "none", "disabled overrides selected elevation");
      await page.close();
    }
  });

  it("centers visible circular glyphs with fixed geometry in HTML and Vue", async () => {
    for (const adapter of ["html", "vue"]) {
      const path = await bundle(`${adapter}-circle-badge`, adapter === "html" ? `import "@threadlabs/looma";` : `
        import { createApp, h } from "vue";
        import { Badge, Icon } from "@threadlabs/looma/vue";
        createApp({ render: () => [h(Badge, { id: "small", shape: "circle", size: "xs", variant: "outline", "aria-label": "Category D" }, () => "D"),
          h(Badge, { id: "letter", shape: "circle", variant: "outline", "aria-label": "Category R" }, () => "R"),
          h(Badge, { id: "medium", shape: "circle", tone: "accent" }, () => h(Icon, { name: "check" }))] }).mount("#app");
      `);
      const page = await open(path, adapter === "html" ? '<ui-badge id="small" shape="circle" size="xs" variant="outline" aria-label="Category D">D</ui-badge><ui-badge id="letter" shape="circle" variant="outline" aria-label="Category R">R</ui-badge><ui-badge id="medium" shape="circle" tone="accent"><ui-icon name="check"></ui-icon></ui-badge>' : '<div id="app"></div>',
        [join(root, "tokens.css"), ...(adapter === "vue" ? [join(root, "vue/components.css")] : [])]);
      await page.waitForSelector('#small[data-component~="ui-badge"]');
      for (const width of [1280, 375]) {
        await page.setViewportSize({ width, height: 720 });
        for (const [id, expected] of [["small", 16], ["letter", 24], ["medium", 24]] as const) {
          const geometry = await page.locator(`#${id}`).evaluate(element => {
            const box = element.getBoundingClientRect(), label = element.querySelector(".label")!.getBoundingClientRect();
            return { width: box.width, height: box.height, x: (label.left + label.right - box.left - box.right) / 2, y: (label.top + label.bottom - box.top - box.bottom) / 2,
              clip: getComputedStyle(element.querySelector(".label")!).clipPath };
          });
          assert.equal(geometry.width, expected, `${adapter}/${width}/${id}`);
          assert.equal(geometry.height, expected, `${adapter}/${width}/${id}`);
          assert.ok(Math.abs(geometry.x) < 1 && Math.abs(geometry.y) < 1, `${adapter}/${width}/${id}: centered glyph ${JSON.stringify(geometry)}`);
          assert.equal(geometry.clip, "none", "circle content remains visible");
          if (id !== "medium") {
            const inkOffset = await page.locator(`#${id}`).evaluate(element => {
              const label = element.querySelector(".label")!, range = document.createRange();
              range.selectNodeContents(label);
              const text = range.getBoundingClientRect(), box = element.getBoundingClientRect();
              const canvas = document.createElement("canvas").getContext("2d")!;
              canvas.font = getComputedStyle(label).font;
              const metrics = canvas.measureText(label.textContent!);
              // A centered font line box alone does not prove that uppercase ink is centered.
              const baseline = text.bottom - metrics.fontBoundingBoxDescent;
              return baseline - (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2 - (box.top + box.bottom) / 2;
            });
            assert.ok(Math.abs(inkOffset) < 1, `${adapter}/${width}/${id}: uppercase ink offset ${inkOffset}`);
          }
        }
      }
      await page.close();
    }
  });
});

describe("Anchored overlay placement", () => {
  it("keeps an open popover at its last valid anchor when the trigger becomes unavailable", async () => {
    const path = await bundle("html-popover-unavailable-anchor", `import "@threadlabs/looma";`);
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
    const path = await bundle("html-popover-hidden-anchor", `import "@threadlabs/looma";`);
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
    const path = await bundle("html-overlay-placement", `import "@threadlabs/looma";`);
    const placements = ["top", "top-start", "top-end", "bottom", "bottom-start", "bottom-end", "left", "left-start", "left-end", "right", "right-start", "right-end"];
    for (const placement of placements) {
      const page = await open(path, `
        <button id="anchor" style="position: fixed; left: 500px; top: 250px; width: 100px; height: 40px">Anchor</button>
        <ui-popover id="popover" for="anchor" open placement="${placement}">Popover content</ui-popover>
        <ui-tooltip id="tooltip" for="anchor" open placement="${placement}">Tooltip content</ui-tooltip>
      `, [join(root, "tokens.css")], { reducedMotion: "reduce" });
      for (const tag of ["popover", "tooltip"]) {
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
    const rtl = await open(path, `
      <button id="anchor" dir="rtl" style="position: fixed; left: 500px; top: 250px; width: 100px; height: 40px">Anchor</button>
      <ui-popover id="popover" dir="rtl" for="anchor" open placement="top-start">Popover content</ui-popover>
      <ui-tooltip id="tooltip" dir="rtl" for="anchor" open placement="top-start">Tooltip content</ui-tooltip>
    `, [join(root, "tokens.css")], { reducedMotion: "reduce" });
    for (const tag of ["popover", "tooltip"]) {
      const distance = await rtl.evaluate((name) => document.querySelector("#anchor")!.getBoundingClientRect().right - document.querySelector(`#${name}`)!.getBoundingClientRect().right, tag);
      assert.ok(Math.abs(distance) <= 3, `${tag} top-start follows the RTL inline start`);
    }
    await rtl.close();
    const edge = await open(path, `
      <button id="anchor" style="position: fixed; left: 500px; top: calc(100vh - 45px); width: 100px; height: 40px">Anchor</button>
      <ui-popover id="popover" for="anchor" open placement="bottom">Popover content</ui-popover>
      <ui-tooltip id="tooltip" for="anchor" open placement="bottom">Tooltip content</ui-tooltip>
    `, [join(root, "tokens.css")], { reducedMotion: "reduce" });
    for (const tag of ["popover", "tooltip"]) {
      const flipped = await edge.evaluate((name) => document.querySelector(`#${name}`)!.getBoundingClientRect().bottom <= document.querySelector("#anchor")!.getBoundingClientRect().top, tag);
      assert.equal(flipped, true, `${tag} flips above the anchor when the bottom edge cannot fit it`);
    }
    await edge.close();
  });

  it("keeps a Tooltip beside its trigger after an ancestor moves without resizing", async () => {
    const path = await bundle("html-tooltip-moving-anchor", `import "@threadlabs/looma";`);
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
    const path = await bundle("html-popover-offset", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <button id="anchor" style="position: fixed; left: 500px; top: 250px; width: 100px; height: 40px">Anchor</button>
      <ui-popover id="popover" for="anchor" open placement="bottom" style="--ui-popover-offset: 20px">Offset content</ui-popover>
    `, [join(root, "tokens.css")], { reducedMotion: "reduce" });
    const gap = await page.evaluate(() => document.querySelector("#popover")!.getBoundingClientRect().top - document.querySelector("#anchor")!.getBoundingClientRect().bottom);
    assert.ok(Math.abs(gap - 20) <= 1, `Popover offset is ${gap}px`);
    await page.close();
  });

  it("shows the next Tooltip without another hover delay and reads its local offset", async () => {
    const path = await bundle("html-tooltip-warmup", `import "@threadlabs/looma";`);
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
    const path = await bundle("html-tooltip-overlay-coordination", `import "@threadlabs/looma";`);
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
        ${popup}
      `, [join(root, "tokens.css")], { reducedMotion: "reduce" });
      await other.waitForFunction(() => document.querySelector("dialog")?.open || document.querySelector("ui-toast-region, [data-component~='ui-toast-region']")?.matches(":popover-open"));
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

  it("closes a tooltip when the editor selection toolbar opens", async () => {
    const path = await bundle("vue-editor-tooltip-coordination", `
      import "@threadlabs/looma";
      import { createApp, h } from "vue";
      import { LoomaEditor } from "@threadlabs/looma/vue/editor";
      createApp({ render: () => h(LoomaEditor, {
        label: "Writing",
        modelValue: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Select some words" }] }] },
      }) }).mount("#app");
    `);
    const page = await open(path, `
      <button id="hint-trigger">Hint</button>
      <ui-tooltip id="hint" for="hint-trigger" open>Helpful hint</ui-tooltip>
      <div id="app"></div>
    `, [join(root, "tokens.css"), join(root, "theme-light.css"), join(root, "vue/components.css")], { reducedMotion: "reduce" });
    const editor = page.getByRole("textbox", { name: "Writing" });
    await editor.focus();
    // Set a known caret before selecting a real character.
    await editor.press("End");
    await editor.press("ArrowLeft");
    await editor.press("Shift+ArrowRight");
    await page.waitForFunction(() => (window.getSelection()?.toString().length ?? 0) > 0);
    await page.waitForFunction(() => document.querySelector("[data-tippy-root]")?.getBoundingClientRect().width);
    assert.equal(await page.locator("#hint").evaluate((element) => element.matches(":popover-open")), false);
    await page.close();
  });
});

describe("Table context menu placement", () => {
  // Owner model: a menu is shown at the place it is written and travels with that place; only a
  // menu written in a fixed or absolutely positioned box, as LoomaEditor places it, answers to the viewport.
  it("shows a menu at its written place and keeps a floating menu inside the viewport", async () => {
    const path = await bundle("html-table-context-menu", `import "@threadlabs/looma";`);
    const actions = `actions='["add-row-before","add-row-after","add-column-before","add-column-after","delete-table"]'`;
    const page = await open(path, `
      <div style="height: 1500px"></div>
      <div id="stage" style="position: relative; overflow: auto; padding: 20px">
        <ui-editor-table-context-menu id="inline" ${actions} open></ui-editor-table-context-menu>
      </div>
      <div style="height: 1500px"></div>
      <div style="position: fixed; top: 560px; left: 1000px">
        <ui-editor-table-context-menu id="floating" ${actions} open></ui-editor-table-context-menu>
      </div>
    `, [join(root, "tokens.css")], { viewport: { width: 1100, height: 600 } });
    await page.waitForFunction(() => document.querySelector<HTMLElement>("#floating")?.style.translate);
    const frames = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    // Offset from the written place: the stage's padding edge, whatever the scroll or viewport.
    const offset = () => page.locator("#inline").evaluate((element) => {
      const menu = element.getBoundingClientRect();
      const stage = element.parentElement!.getBoundingClientRect();
      return { x: menu.left - stage.left, y: menu.top - stage.top };
    });
    // A resize re-measures, as a full-page capture or a rotated phone does; the place below the fold stays put.
    await page.setViewportSize({ width: 1100, height: 640 });
    await frames();
    assert.deepEqual(await offset(), { x: 20, y: 20 }, "below the first screen, the menu is not pulled into the viewport");
    await page.evaluate(() => scrollTo(0, 1300));
    await frames();
    assert.deepEqual(await offset(), { x: 20, y: 20 }, "the menu travels with its place as the page scrolls");
    const floating = await page.locator("#floating").boundingBox();
    assert.ok(floating && floating.x + floating.width <= 1100 - 12 && floating.y + floating.height <= 640 - 12, `floating menu fits the viewport: ${JSON.stringify(floating)}`);
    await page.close();
  });

  it("separates sections only between them and fits fewer swatches to a row in a narrow menu", async () => {
    const path = await bundle("html-table-context-menu-sections", `import "@threadlabs/looma";`);
    const swatches = `actions='["background-none","background-gray","background-yellow","background-blue","background-green","background-red","add-row-after","delete-table"]'`;
    const page = await open(path, `
      <ui-editor-table-context-menu id="plain" actions='["add-row-after","delete-table"]' open></ui-editor-table-context-menu>
      <div style="position: fixed; top: 0; right: 0"><ui-editor-table-context-menu id="full" ${swatches} open></ui-editor-table-context-menu></div>
    `, [join(root, "tokens.css")]);
    await page.waitForFunction(() => document.querySelectorAll("#full .swatch-button").length === 6);
    const layout = (id: string) => page.locator(`#${id}`).evaluate((element) => {
      const buttons = [...element.querySelectorAll(".swatch-button")].map((button) => button.getBoundingClientRect());
      return {
        width: element.getBoundingClientRect().width,
        separators: [...element.querySelectorAll(".sep")].map((sep) => getComputedStyle(sep).display !== "none"),
        perRow: buttons.filter((button) => button.top === buttons[0]?.top).length,
        narrowest: Math.round(Math.min(...buttons.map((button) => button.width))),
      };
    });
    assert.deepEqual((await layout("plain")).separators, [false, true], "no separator above the first section");
    const full = await layout("full");
    assert.deepEqual({ width: full.width, separators: full.separators, perRow: full.perRow }, { width: 272, separators: [true, true], perRow: 3 });
    // A phone viewport narrows the menu to 100vw - 24px; its labels stay whole by fitting fewer to a row.
    await page.setViewportSize({ width: 251, height: 720 });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const narrow = await layout("full");
    assert.deepEqual({ width: narrow.width, perRow: narrow.perRow, narrowest: narrow.narrowest }, { width: 227, perRow: 2, narrowest: 80 });
    await page.close();
  });
});

describe("Touch input typography", () => {
  it("keeps editable fields readable inside caption typography", async () => {
    const path = await bundle("touch-caption-input", `
      import { createApp, h } from "vue";
      import { Input } from "@threadlabs/looma/vue";
      createApp({ render: () => h("div", { style: "font-size:12px" }, () => [
        h(Input, { id: "normal", placeholder: "Search people" }),
        h(Input, { id: "small", size: "sm", placeholder: "Search pages" }),
      ]) }).mount("#app");
    `);
    const page = await open(path, '<div id="app"></div>', [join(root, "tokens.css"), join(root, "vue/components.css")], {
      viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true,
    });
    for (const id of ["normal", "small"]) {
      const field = page.locator(`#${id}`);
      assert.ok(await field.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)) >= 16);
      await field.tap();
      await field.fill("Readable");
      assert.equal(await field.inputValue(), "Readable");
    }
    await page.close();
  });
});

describe("Tooltip shortcut", () => {
  it("shows a shortcut after the label behind a divider, and nothing when there is none", async () => {
    const path = await bundle("html-tooltip-shortcut", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <button id="one" style="position: fixed; left: 200px; top: 200px">Search</button>
      <button id="two" style="position: fixed; left: 500px; top: 200px">Close</button>
      <ui-tooltip id="with" for="one" open placement="bottom">Search<kbd slot="shortcut">⌘K</kbd></ui-tooltip>
      <ui-tooltip id="without" for="two" placement="bottom">Close</ui-tooltip>
    `, [join(root, "tokens.css")], { reducedMotion: "reduce" });
    const layout = await page.evaluate(() => {
      const tip = document.querySelector("#with")!;
      const surface = tip.querySelector(".surface")!;
      const kbd = tip.querySelector("kbd")!;
      const shortcut = kbd.closest(".shortcut")!;
      const label = document.createRange();
      label.selectNodeContents(document.createTreeWalker(surface, NodeFilter.SHOW_TEXT).nextNode()!);
      const style = getComputedStyle(shortcut);
      const empty = document.querySelector("#without .shortcut");
      return {
        afterLabel: kbd.getBoundingClientRect().left > label.getBoundingClientRect().right,
        sameLine: Math.abs((kbd.getBoundingClientRect().top + kbd.getBoundingClientRect().bottom) / 2 - (label.getBoundingClientRect().top + label.getBoundingClientRect().bottom) / 2) < 3,
        divider: style.borderInlineStartWidth,
        smaller: Number.parseFloat(style.fontSize) < Number.parseFloat(getComputedStyle(surface).fontSize),
        text: tip.textContent?.trim(),
        emptyHidden: !empty || getComputedStyle(empty).display === "none",
      };
    });
    assert.deepEqual(layout, { afterLabel: true, sameLine: true, divider: "1px", smaller: true, text: "Search⌘K", emptyHidden: true });
    await page.close();
  });

  it("sets a slotted kbd in the label's type, not the browser's monospace, in Vue", async () => {
    const path = await bundle("vue-shortcut-kbd", `
      import { createApp, h } from "vue";
      import { Menu, MenuItem, Tooltip } from "@threadlabs/looma/vue";
      createApp({ render: () => h("main", [
        h("button", { id: "one", style: { position: "fixed", left: "200px", top: "200px" } }, "Search"),
        h(Tooltip, { for: "one", open: true, placement: "bottom" }, { default: () => "Search", shortcut: () => h("kbd", "⌘K") }),
        h(Menu, { inline: true, "aria-label": "File" }, () => [
          h(MenuItem, { value: "new" }, { default: () => "New file", shortcut: () => h("kbd", "⌘N") }),
        ]),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")], { reducedMotion: "reduce" });
    const fonts = await page.evaluate(() => Array.from(document.querySelectorAll("kbd"), (kbd) => ({
      kbd: getComputedStyle(kbd).fontFamily,
      region: getComputedStyle(kbd.parentElement!).fontFamily,
    })));
    assert.equal(fonts.length, 2);
    for (const font of fonts) assert.equal(font.kbd, font.region);
    await page.close();
  });
});

describe("Toast composition and placement", () => {
  it("shows authored toasts, hides one on dismissal, and shows it again when hidden clears", async () => {
    const path = await bundle("html-authored-toast", `
      import "@threadlabs/looma";
      window.dismissals = [];
      document.querySelector("#region").addEventListener("dismiss", (event) => window.dismissals.push(event.detail));
    `);
    const page = await open(path, `
      <ui-toast-region id="region" placement="bottom-end">
        <ui-toast id="saved" tone="success">Saved <button slot="action">Undo</button></ui-toast>
        <ui-toast id="failed" tone="danger">Could not save</ui-toast>
      </ui-toast-region>
    `, [join(root, "tokens.css")]);
    const region = page.locator("#region");
    assert.equal(await region.evaluate((element) => element.matches(":popover-open")), true);
    assert.equal(await page.locator("#saved").getAttribute("role"), "status");
    assert.equal(await page.locator("#failed").getAttribute("role"), "alert");
    const position = await region.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { bottom: innerHeight - box.bottom, right: innerWidth - box.right };
    });
    assert.ok(position.bottom < 40 && position.right < 40, JSON.stringify(position));
    await page.getByRole("button", { name: "Undo" }).click();
    assert.deepEqual(await page.evaluate(() => (window as any).dismissals), [{ id: "saved", reason: "action", trigger: "pointer" }]);
    assert.equal(await page.locator("#saved").count(), 1, "authored content stays in the document");
    assert.equal(await page.locator("#saved").isHidden(), true, "a dismissed toast hides itself");
    await page.locator("#saved").evaluate((element: HTMLElement) => { element.hidden = false; });
    assert.equal(await page.locator("#saved").isVisible(), true, "clearing hidden shows it again");
    await page.getByRole("button", { name: "Undo" }).click();
    assert.equal((await page.evaluate(() => (window as any).dismissals)).length, 2, "a reshown toast dismisses again");
    await page.locator("#failed").getByRole("button", { name: "Dismiss notification" }).click();
    await page.waitForFunction(() => !document.querySelector("#region")!.matches(":popover-open"));
    await page.close();
  });

  it("pauses an authored duration on hover and dismisses after leaving", async () => {
    const path = await bundle("html-timed-toast", `
      import "@threadlabs/looma";
      window.dismissals = [];
      document.querySelector("#toast").addEventListener("dismiss", (event) => window.dismissals.push(event.detail));
    `);
    const page = await open(path, `<ui-toast-region><ui-toast id="toast" duration="250">Timed</ui-toast></ui-toast-region>`, [join(root, "tokens.css")]);
    await page.locator("#toast").hover();
    await page.waitForTimeout(300);
    assert.deepEqual(await page.evaluate(() => (window as any).dismissals), []);
    await page.mouse.move(0, 0);
    await page.waitForFunction(() => (window as any).dismissals.length === 1);
    assert.deepEqual(await page.evaluate(() => (window as any).dismissals), [{ id: "toast", reason: "timeout", trigger: "programmatic" }]);
    assert.equal(await page.locator("#toast").isHidden(), true, "a timed toast hides itself");
    await page.close();
  });

  it("pauses while an action has focus and supports keyboard dismissal across themes", async () => {
    const path = await bundle("html-toast-focus", `
      import "@threadlabs/looma";
      window.dismissals = [];
      document.querySelector("#toast").addEventListener("dismiss", (event) => window.dismissals.push(event.detail));
    `);
    const page = await open(path, `
      <button id="before">Before</button>
      <ui-toast-region><ui-toast id="toast" tone="danger" duration="250">
        Save failed <button slot="action">Retry</button>
      </ui-toast></ui-toast-region>
    `, ["tokens.css", "theme-light.css", "theme-dark.css", "theme-high-contrast.css"].map((file) => join(root, file)));
    for (const [attribute, value] of [["data-theme", "light"], ["data-theme", "dark"], ["data-contrast", "high"]] as const) {
      await page.evaluate(() => { document.documentElement.removeAttribute("data-theme"); document.documentElement.removeAttribute("data-contrast"); });
      await page.evaluate(([name, setting]) => document.documentElement.setAttribute(name, setting), [attribute, value]);
      assert.equal(await page.locator("#toast").getAttribute("role"), "alert");
      const colors = await page.locator("#toast").evaluate((element) => {
        const css = getComputedStyle(element);
        return { accent: css.borderInlineStartColor, surface: css.backgroundColor, text: css.color };
      });
      assert.notEqual(colors.accent, colors.surface, `${value}: danger accent is visible`);
      assert.notEqual(colors.text, colors.surface, `${value}: message is visible`);
    }
    await page.getByRole("button", { name: "Retry" }).focus();
    await page.waitForTimeout(300);
    assert.deepEqual(await page.evaluate(() => (window as any).dismissals), []);
    await page.getByRole("button", { name: "Retry" }).press("Tab");
    await page.getByRole("button", { name: "Dismiss notification" }).press("Enter");
    assert.deepEqual(await page.evaluate(() => (window as any).dismissals), [{ id: "toast", reason: "action", trigger: "keyboard" }]);
    await page.close();
  });

  it("adds generated messages with tone and duration through a native event", async () => {
    const path = await bundle("html-generated-toast", `import "@threadlabs/looma";`);
    const page = await open(path, `<ui-toast-region id="region" placement="top-start" duration="0"></ui-toast-region>`, [join(root, "tokens.css")]);
    await page.locator("#region").evaluate((element) => element.dispatchEvent(new CustomEvent("show-toast", {
      detail: { message: "Saved", id: "saved-notice", tone: "success", duration: 0 },
    })));
    assert.equal(await page.locator("#region #saved-notice").count(), 1);
    assert.equal(await page.locator("#region .toast[role='status'][data-tone='success']").count(), 1);
    const region = page.locator("#region");
    assert.equal(await region.evaluate((element) => element.matches(":popover-open")), true);
    const position = await region.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { top: box.top, left: box.left };
    });
    assert.ok(position.top < 40 && position.left < 40, JSON.stringify(position));
    await page.getByRole("button", { name: "Dismiss Saved" }).click();
    await page.waitForFunction(() => !document.querySelector("#region")!.matches(":popover-open"));
    await page.close();
  });
});

describe("Intrinsic layout limits", () => {
  it("caps Grid columns and stacks Switcher children above its count limit in HTML", async () => {
    const path = await bundle("html-layout-limits", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-grid id="grid" columns="3" min="sm" style="width: 1000px">
        <div>A</div><div>B</div><div>C</div><div>D</div><div>E</div>
      </ui-grid>
      <ui-switcher id="switcher" limit="3" style="width: 1000px">
        <div>A</div><div>B</div><div>C</div><div>D</div>
      </ui-switcher>
    `, [join(root, "tokens.css")]);
    const columns = () => page.locator("#grid").evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
    assert.equal(await columns(), 3);
    await page.locator("#grid").evaluate((element) => { element.style.width = "400px"; });
    assert.ok((await columns()) < 3, "the cap still allows fewer columns in a narrow container");
    const rows = () => page.locator("#switcher").evaluate((element) => Array.from(element.children).map((child) => Math.round(child.getBoundingClientRect().top)));
    assert.equal(new Set(await rows()).size, 4);
    await page.locator("#switcher > div").last().evaluate((element) => element.remove());
    await page.waitForFunction(() => {
      const children = Array.from(document.querySelector("#switcher")!.children);
      return children.length === 3 && children.every((child) => child.getBoundingClientRect().top === children[0]!.getBoundingClientRect().top);
    });
    assert.equal(new Set(await rows()).size, 1);
    await page.close();
  });

  it("passes Grid and Switcher limits through Vue", async () => {
    const path = await bundle("vue-layout-limits", `
      import { createApp, h } from "vue";
      import { Grid, Switcher } from "@threadlabs/looma/vue";
      createApp({ render: () => h("main", [
        h(Grid, { id: "grid", columns: 2, style: { width: "1000px" } }, () => [h("div", "A"), h("div", "B"), h("div", "C")]),
        h(Switcher, { id: "switcher", limit: 2, style: { width: "1000px" } }, () => [h("div", "A"), h("div", "B"), h("div", "C")]),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    assert.equal(await page.locator("#grid").evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length), 2);
    assert.equal(await page.locator("#switcher").evaluate((element) => new Set(Array.from(element.children, (child) => Math.round(child.getBoundingClientRect().top))).size), 3);
    await page.close();
  });
});

describe("Tabs activation", () => {
  it("moves focus without selecting in manual mode and selects on Enter or Space", async () => {
    const path = await bundle("html-manual-tabs", `
      import "@threadlabs/looma";
      window.selections = [];
      document.querySelector("#tabs").addEventListener("select", (event) => window.selections.push(event.detail));
    `);
    const page = await open(path, `
      <ui-tabs id="tabs" label="Views" activation="manual">
        <section id="overview" aria-label="Overview">Overview content</section>
        <section id="details" aria-label="Details">Details content</section>
        <section id="history" aria-label="History">History content</section>
      </ui-tabs>
    `, [join(root, "tokens.css")]);
    await page.getByRole("tab", { name: "Overview" }).focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.getByRole("tab", { name: "Details" }).getAttribute("aria-selected"), "false");
    assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), "Details");
    assert.equal(await page.locator("#overview").isVisible(), true);
    await page.keyboard.press("Enter");
    assert.equal(await page.getByRole("tab", { name: "Details" }).getAttribute("aria-selected"), "true");
    assert.equal(await page.locator("#details").isVisible(), true);
    await page.keyboard.press("End");
    assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), "History");
    assert.equal(await page.getByRole("tab", { name: "History" }).getAttribute("aria-selected"), "false");
    await page.keyboard.press("Space");
    assert.equal(await page.getByRole("tab", { name: "History" }).getAttribute("aria-selected"), "true");
    assert.deepEqual(await page.evaluate(() => (window as any).selections.map((event: any) => [event.value, event.trigger])), [["details", "keyboard"], ["history", "keyboard"]]);
    await page.close();
  });

  it("keeps automatic activation when the Vue prop is omitted", async () => {
    const path = await bundle("vue-auto-tabs", `
      import { createApp, h } from "vue";
      import { Tabs } from "@threadlabs/looma/vue";
      createApp({ render: () => h(Tabs, { id: "tabs", label: "Views" }, () => [
        h("section", { id: "overview", "aria-label": "Overview" }, "Overview content"),
        h("section", { id: "details", "aria-label": "Details" }, "Details content"),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await page.getByRole("tab", { name: "Overview" }).focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.getByRole("tab", { name: "Details" }).getAttribute("aria-selected"), "true");
    await page.close();
  });

  it("uses authored tab buttons with rich labels in HTML", async () => {
    const path = await bundle("html-rich-tabs", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-tabs label="Views">
        <button slot="tab" value="overview"><ui-icon name="check"></ui-icon> Overview</button>
        <button slot="tab" value="details">Details <span>(2)</span></button>
        <section id="overview" aria-label="Overview">Overview content</section>
        <section id="details" aria-label="Details">Details content</section>
      </ui-tabs>
    `, [join(root, "tokens.css")]);
    assert.equal(await page.getByRole("tab", { name: "Overview" }).count(), 1);
    assert.equal(await page.getByRole("tab", { name: "Details (2)" }).count(), 1);
    await page.getByRole("tab", { name: "Details (2)" }).click();
    assert.equal(await page.locator("#details").isVisible(), true);
    assert.equal(await page.locator("#details").getAttribute("aria-labelledby"), await page.getByRole("tab", { name: "Details (2)" }).getAttribute("id"));
    await page.close();
  });

  it("projects rich tab buttons through Vue", async () => {
    const path = await bundle("vue-rich-tabs", `
      import { createApp, h } from "vue";
      import { Tabs, Icon } from "@threadlabs/looma/vue";
      createApp({ render: () => h(Tabs, { label: "Views" }, {
        tab: () => [
          h("button", { value: "overview" }, [h(Icon, { name: "check" }), " Overview"]),
          h("button", { value: "details" }, ["Details ", h("span", "(2)")]),
        ],
        default: () => [
          h("section", { id: "overview", "aria-label": "Overview" }, "Overview content"),
          h("section", { id: "details", "aria-label": "Details" }, "Details content"),
        ],
      }) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    assert.equal(await page.getByRole("tab", { name: "Details (2)" }).count(), 1);
    await page.getByRole("tab", { name: "Details (2)" }).click();
    assert.equal(await page.locator("#details").isVisible(), true);
    await page.close();
  });
});

describe("Disclosure composition", () => {
  it("initializes required groups independently and transfers ownership when an open member is removed", async () => {
    const path = await bundle("html-disclosure-required", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-disclosure id="first" name="required" required-open summary="First"><a href="#first-link">First link</a></ui-disclosure>
      <ui-disclosure id="second" name="required" required-open summary="Second"><a href="#second-link">Second link</a></ui-disclosure>
      <ui-disclosure id="independent" name="other" required-open summary="Independent">Other</ui-disclosure>
      <ui-disclosure id="optional" name="optional" summary="Optional" open>Optional</ui-disclosure>
    `, [join(root, "tokens.css")], { reducedMotion: "reduce" });
    assert.equal(await page.locator("#first button").getAttribute("aria-expanded"), "true");
    assert.equal(await page.locator("#second button").getAttribute("aria-expanded"), "false");
    assert.equal(await page.locator("#independent button").getAttribute("aria-expanded"), "true");
    await page.locator("#first button").click();
    assert.equal(await page.locator("#first button").getAttribute("aria-expanded"), "true");
    await page.locator("#optional button").click();
    assert.equal(await page.locator("#optional button").getAttribute("aria-expanded"), "false");
    await page.evaluate(() => document.querySelector("#first")!.remove());
    await page.waitForFunction(() => document.querySelector("#second button")?.getAttribute("aria-expanded") === "true");
    await page.close();
  });

  it("shares neutral navigation colors, columns, typography, hover, and corners in HTML and Vue", async () => {
    for (const adapter of ["html", "vue"]) {
      const path = await bundle(`${adapter}-navigation-geometry`, adapter === "html" ? `import "@threadlabs/looma";` : `
        import { createApp, h } from "vue";
        import { Disclosure, NavItem, Icon } from "@threadlabs/looma/vue";
        createApp({ render: () => h("div", { style: "width:240px" }, [
          h(Disclosure, { id: "section", variant: "navigation", density: "compact", fill: true, open: true, summary: "Library" }, {
            leading: () => h(Icon, { name: "files" }), indicator: () => h(Icon, { name: "chevron-up" }),
          }),
          h(NavItem, { id: "destination", density: "compact" }, {
            leading: () => h(Icon, { name: "trash" }), trailing: () => h(Icon, { name: "chevrons-up-down" }), default: () => "Archived",
          }),
        ]) }).mount("#app");
      `);
      const page = await open(path, adapter === "html" ? `
        <div style="width:240px">
          <ui-disclosure id="section" variant="navigation" density="compact" fill open summary="Library"><ui-icon slot="leading" name="files"></ui-icon><ui-icon slot="indicator" name="chevron-up"></ui-icon></ui-disclosure>
          <ui-nav-item id="destination" density="compact"><ui-icon slot="leading" name="trash"></ui-icon>Archived<ui-icon slot="trailing" name="chevrons-up-down"></ui-icon></ui-nav-item>
        </div>
      ` : `<div id="app"></div>`, [join(root, "tokens.css"), ...(adapter === "vue" ? [join(root, "vue/components.css")] : [])], { reducedMotion: "reduce" });
      const geometry = await page.evaluate(() => {
        const summary = document.querySelector("#section button")!;
        const nav = document.querySelector("#destination")!;
        const center = (element: Element) => { const box = element.getBoundingClientRect(); return box.x + box.width / 2; };
        return {
          leading: [center(summary.querySelector(".leading")!), center(nav.querySelector(".leading")!)],
          trailing: [center(summary.querySelector(".indicator")!), center(nav.querySelector(".trailing")!)],
          label: [summary.querySelector(".summary")!.getBoundingClientRect().x, nav.querySelector(".label")!.getBoundingClientRect().x],
          radius: [getComputedStyle(summary).borderRadius, getComputedStyle(nav).borderRadius],
          weight: [getComputedStyle(summary).fontWeight, getComputedStyle(nav).fontWeight],
        };
      });
      for (const values of Object.values(geometry)) assert.equal(values[0], values[1], `${adapter}: ${JSON.stringify(geometry)}`);
      const neutral = await page.locator("#destination").evaluate(element => getComputedStyle(element).color);
      for (const selector of ["#section button", "#section .leading svg", "#section .indicator svg"]) {
        assert.equal(await page.locator(selector).evaluate(element => getComputedStyle(element).color), neutral);
      }
      await page.locator("#section button").click();
      await page.mouse.move(0, 0);
      assert.equal(await page.locator("#section button").evaluate(element => getComputedStyle(element).color), neutral);
      await page.locator("#section button").hover();
      const sectionHover = await page.locator("#section button").evaluate(element => getComputedStyle(element).backgroundColor);
      await page.locator("#destination").hover();
      assert.equal(await page.locator("#destination").evaluate(element => getComputedStyle(element).backgroundColor), sectionHover);
      await page.close();
    }
  });

  it("fills the remaining height with unboxed headers and a scrolling body in HTML and Vue", async () => {
    for (const adapter of ["html", "vue"]) {
      const source = adapter === "html" ? `import "@threadlabs/looma";` : `
        import { createApp, h } from "vue";
        import { Disclosure, Icon } from "@threadlabs/looma/vue";
        createApp({ render: () => h("div", { id: "panels", style: "display:flex;flex-direction:column;height:480px;width:240px" }, [
          h(Disclosure, { id: "first", fill: true, requiredOpen: true, name: "panels", summary: "Overview", open: true }, {
            indicator: () => h(Icon, { name: "chevron-down", "aria-hidden": "true" }),
            default: () => h("div", { id: "scroll", style: "flex:1;min-height:0;overflow:auto" }, h("p", { style: "height:1800px" }, "Overview content")),
          }),
          h(Disclosure, { id: "second", fill: true, requiredOpen: true, name: "panels", summary: "Library" }, () => h("p", "Library content")),
        ]) }).mount("#app");
      `;
      const path = await bundle(`${adapter}-disclosure-fill`, source);
      const body = adapter === "html" ? `
        <div id="panels" style="display:flex;flex-direction:column;height:480px;width:240px">
          <ui-disclosure id="first" fill required-open name="panels" summary="Overview" open>
            <ui-icon slot="indicator" name="chevron-down" aria-hidden="true"></ui-icon>
            <div id="scroll" style="flex:1;min-height:0;overflow:auto"><p style="height:1800px">Overview content</p></div>
          </ui-disclosure>
          <ui-disclosure id="second" fill required-open name="panels" summary="Library"><p>Library content</p></ui-disclosure>
        </div>` : `<div id="app"></div>`;
      const page = await open(path, body, [join(root, "tokens.css"), ...(adapter === "vue" ? [join(root, "vue/components.css")] : [])], { reducedMotion: "reduce" });
      assert.equal(await page.locator("#first .chevron").count(), 0, "custom indicator replaces the default");
      const measure = () => page.evaluate(() => {
        const first = document.querySelector("#first")!;
        const second = document.querySelector("#second")!;
        const trigger = first.querySelector("button")!;
        const scroll = document.querySelector("#scroll")!;
        return {
          first: first.getBoundingClientRect().height, second: second.getBoundingClientRect().height,
          width: first.getBoundingClientRect().width, triggerWidth: trigger.getBoundingClientRect().width,
          background: getComputedStyle(trigger).backgroundColor, shadow: getComputedStyle(trigger).boxShadow,
          scrollHeight: scroll.scrollHeight, visibleHeight: scroll.clientHeight,
        };
      });
      const opened = await measure();
      assert.ok(opened.first > 400 && opened.second < 64, `${adapter}: ${JSON.stringify(opened)}`);
      assert.equal(opened.width, opened.triggerWidth);
      assert.equal(opened.background, "rgba(0, 0, 0, 0)");
      assert.equal(opened.shadow, "none");
      assert.ok(opened.visibleHeight > 300 && opened.scrollHeight > opened.visibleHeight);
      await page.locator("#second button").focus();
      await page.keyboard.press("Enter");
      assert.equal(await page.locator("#first button").getAttribute("aria-expanded"), "false");
      assert.equal(await page.locator("#second button").getAttribute("aria-expanded"), "true");
      const swapped = await measure();
      assert.ok(swapped.second > 400 && swapped.first < 64);
      await page.locator("#second button").click();
      assert.equal(await page.locator("#second button").getAttribute("aria-expanded"), "true", "the required group keeps its final panel open");
      await page.close();
    }
  });

  it("animates bounded fill transfer and a persistent custom indicator", async () => {
    const path = await bundle("html-disclosure-motion", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <div style="display:flex;flex-direction:column;height:480px;width:240px;--ui-motion-layout:1000ms;--ui-motion-reveal:1000ms">
        <ui-disclosure id="first" fill name="motion" summary="Overview" open><p>Overview content</p></ui-disclosure>
        <ui-disclosure id="second" fill name="motion" summary="Library">
          <ui-icon slot="indicator" name="chevron-up"></ui-icon><p>Library content</p>
        </ui-disclosure>
      </div>
    `, [join(root, "tokens.css")], { reducedMotion: "no-preference" });
    await page.locator("#second button").click();
    await page.waitForTimeout(60);
    const intermediate = await page.evaluate(() => {
      const first = document.querySelector("#first")!;
      const second = document.querySelector("#second")!;
      return {
        first: first.getBoundingClientRect().height,
        second: second.getBoundingClientRect().height,
        indicatorAnimating: Boolean(second.querySelector(".indicator")?.getAnimations().length),
        panelAnimating: Boolean(second.querySelector(".panel")?.getAnimations().length),
      };
    });
    assert.ok(intermediate.first > 64 && intermediate.first < 440, JSON.stringify(intermediate));
    assert.ok(intermediate.second > 64 && intermediate.second < 440, JSON.stringify(intermediate));
    assert.equal(intermediate.indicatorAnimating, true);
    assert.equal(intermediate.panelAnimating, true);
    await page.locator("#first button").click();
    await page.waitForTimeout(1100);
    assert.equal(await page.locator("#first button").getAttribute("aria-expanded"), "true");
    assert.equal(await page.locator("#second button").getAttribute("aria-expanded"), "false");
    assert.ok((await page.locator("#first").boundingBox())!.height > 400);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator("#second button").click();
    assert.ok((await page.locator("#second").boundingBox())!.height > 400);
    await page.close();
  });

  it("reveals closed content when a fragment targets it and closes its named peer", async () => {
    const path = await bundle("html-disclosure-beforematch", `
      import "@threadlabs/looma";
      window.opens = [];
      document.querySelector("#target").addEventListener("open", (event) => window.opens.push(event.detail));
    `);
    for (const fill of [false, true]) {
      const page = await open(path, `
        <ui-disclosure ${fill ? "fill" : ""} id="peer" name="faq" summary="Peer" open><p>Peer answer</p></ui-disclosure>
        <ui-disclosure ${fill ? "fill" : ""} id="target" name="faq" summary="Target"><p id="answer">Findable answer</p></ui-disclosure>
      `, [join(root, "tokens.css")], { reducedMotion: "reduce" });
      assert.equal(await page.locator("#target .panel").getAttribute("hidden"), "until-found");
      await page.evaluate(() => { location.hash = "answer"; });
      await page.waitForFunction(() => document.querySelector("#target .trigger")?.getAttribute("aria-expanded") === "true");
      assert.equal(await page.locator("#target .panel").getAttribute("hidden"), null);
      assert.equal(await page.locator("#peer .trigger").getAttribute("aria-expanded"), "false");
      assert.deepEqual(await page.evaluate(() => (window as any).opens), [{ open: true, reason: "programmatic", trigger: "programmatic" }]);
      await page.close();
    }
  });

  it("uses named exclusive groups, a rich summary, and an optional heading in HTML", async () => {
    const path = await bundle("html-disclosure-group", `
      import "@threadlabs/looma";
      window.closes = [];
      document.querySelector("#first").addEventListener("close", (event) => window.closes.push(event.detail));
    `);
    const page = await open(path, `
      <ui-disclosure id="first" name="faq" summary="First" heading-level="3"><p>First answer</p></ui-disclosure>
      <ui-disclosure id="second" name="faq" summary="Second" heading-level="3">
        <strong slot="summary">Second <em>updated</em></strong><p>Second answer</p>
      </ui-disclosure>
      <ui-disclosure id="independent" name="other" summary="Independent"><p>Other answer</p></ui-disclosure>
    `, [join(root, "tokens.css")]);
    assert.equal(await page.getByRole("heading", { level: 3, name: "First" }).count(), 1);
    assert.equal(await page.getByRole("heading", { level: 3, name: "Second updated" }).count(), 1);
    assert.equal(await page.locator("#second .summary strong em").count(), 1);
    await page.locator("#first .trigger").click();
    await page.locator("#independent .trigger").click();
    await page.locator("#second .trigger").click();
    assert.equal(await page.locator("#first .trigger").getAttribute("aria-expanded"), "false");
    assert.equal(await page.locator("#second .trigger").getAttribute("aria-expanded"), "true");
    assert.equal(await page.locator("#independent .trigger").getAttribute("aria-expanded"), "true");
    assert.deepEqual(await page.evaluate(() => (window as any).closes), [{ open: false, reason: "action", trigger: "pointer" }]);
    await page.close();
  });

  it("keeps named groups and summary slots through Vue", async () => {
    const path = await bundle("vue-disclosure-group", `
      import { createApp, h } from "vue";
      import { Disclosure } from "@threadlabs/looma/vue";
      createApp({ render: () => h("div", [
        h(Disclosure, { id: "first", name: "faq", summary: "First", headingLevel: 2 }, () => h("p", "First answer")),
        h(Disclosure, { id: "second", name: "faq", summary: "Second", headingLevel: 2 }, {
          summary: () => h("strong", "Rich second"),
          default: () => h("p", "Second answer"),
        }),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    assert.equal(await page.getByRole("heading", { level: 2, name: "Rich second" }).count(), 1);
    await page.locator("#first .trigger").click();
    await page.locator("#second .trigger").click();
    assert.equal(await page.locator("#first .trigger").getAttribute("aria-expanded"), "false");
    await page.close();
  });
});

describe("Menu structure and navigation", () => {
  it("dismisses only the top menu when Escape bubbles through its containing popover", async () => {
    const path = await bundle("html-nested-menu-escape", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-button id="settings-trigger">Settings</ui-button>
      <ui-popover id="settings" for="settings-trigger">
        <ui-button id="format-trigger">Formatting</ui-button>
        <ui-menu id="format" for="format-trigger" aria-label="Formatting">
          <ui-menu-item value="plain" type="radio">Plain</ui-menu-item>
          <ui-menu-item value="numbered" type="radio">Numbered</ui-menu-item>
        </ui-menu>
      </ui-popover>
    `, [join(root, "tokens.css")]);
    await page.locator("#settings-trigger").click();
    await page.locator("#format-trigger").click();
    await page.getByRole("menuitemradio", { name: "Plain" }).focus();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#format-trigger").getAttribute("aria-expanded"), "false");
    assert.equal(await page.locator("#settings-trigger").getAttribute("aria-expanded"), "true");
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#settings-trigger").getAttribute("aria-expanded"), "false");
    await page.close();
  });

  it("spaces slotted icons and keeps ghost triggers pressed while overlays are open", async () => {
    const path = await bundle("html-menu-icon-and-ghost-trigger", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-icon-button id="menu-trigger" variant="ghost" label="Page actions"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="5" /></svg></ui-icon-button>
      <ui-menu id="actions" for="menu-trigger" density="compact" aria-label="Page actions">
        <ui-menu-item id="move" value="move"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><path d="M2 8h12" /></svg>Move to…</ui-menu-item>
      </ui-menu>
      <ui-button id="popover-trigger" variant="ghost">Details</ui-button>
      <ui-popover id="details" for="popover-trigger">More details.</ui-popover>
    `, [join(root, "tokens.css")]);
    const menuTrigger = page.locator("#menu-trigger");
    const popoverTrigger = page.locator("#popover-trigger");
    const background = (selector: string) => page.locator(selector).evaluate((element) => getComputedStyle(element).backgroundColor);
    const menuRest = await background("#menu-trigger");
    const popoverRest = await background("#popover-trigger");

    await menuTrigger.click();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(250);
    assert.equal(await menuTrigger.getAttribute("aria-expanded"), "true");
    assert.notEqual(await background("#menu-trigger"), menuRest, "open menu keeps the ghost trigger pressed");
    const gap = await page.locator("#move .label").evaluate((label) => {
      const icon = label.querySelector("svg")!;
      const text = Array.from(label.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())!;
      const range = document.createRange();
      range.selectNodeContents(text);
      return range.getBoundingClientRect().left - icon.getBoundingClientRect().right;
    });
    assert.ok(gap >= 6, `menu icon and label need a visible gap, got ${gap}px`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
    assert.equal(await menuTrigger.getAttribute("aria-expanded"), "false");
    assert.equal(await background("#menu-trigger"), menuRest);

    await popoverTrigger.click();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(250);
    assert.equal(await popoverTrigger.getAttribute("aria-expanded"), "true");
    assert.notEqual(await background("#popover-trigger"), popoverRest, "open popover keeps the ghost trigger pressed");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
    assert.equal(await popoverTrigger.getAttribute("aria-expanded"), "false");
    assert.equal(await background("#popover-trigger"), popoverRest);
    await page.close();
  });

  it("clears trigger expansion when a Vue menu or popover unmounts", async () => {
    const path = await bundle("vue-overlay-trigger-cleanup", `
      import { createApp, h, ref } from "vue";
      import { Button, IconButton, Menu, MenuItem, Popover } from "@threadlabs/looma/vue";
      const menuVisible = ref(true);
      const popoverVisible = ref(true);
      window.hideOverlays = () => { menuVisible.value = false; popoverVisible.value = false; };
      createApp({ render: () => h("div", [
        h(IconButton, { id: "menu-trigger", label: "Actions", variant: "ghost" }, () => "…"),
        menuVisible.value ? h(Menu, { id: "menu", for: "menu-trigger", open: true }, () => h(MenuItem, { value: "edit" }, () => "Edit")) : null,
        h(Button, { id: "popover-trigger", variant: "ghost" }, () => "Details"),
        popoverVisible.value ? h(Popover, { id: "popover", for: "popover-trigger", open: true }, () => "Details") : null,
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const menuTrigger = page.locator("#menu-trigger");
    const popoverTrigger = page.locator("#popover-trigger");
    assert.equal(await menuTrigger.getAttribute("aria-expanded"), "true");
    assert.equal(await popoverTrigger.getAttribute("aria-expanded"), "true");
    await page.evaluate(() => (window as any).hideOverlays());
    await page.waitForFunction(() => !document.querySelector("#menu") && !document.querySelector("#popover"));
    assert.notEqual(await menuTrigger.getAttribute("aria-expanded"), "true");
    assert.notEqual(await popoverTrigger.getAttribute("aria-expanded"), "true");
    await page.close();
  });

  it("keeps link semantics, groups and separators, and moves through enabled items in HTML", async () => {
    const path = await bundle("html-menu-structure", `
      import "@threadlabs/looma";
      window.selections = [];
      document.querySelector("#menu").addEventListener("select", (event) => window.selections.push(event.detail));
    `);
    const page = await open(path, `
      <ui-menu id="menu" open aria-label="Actions">
        <ui-menu-group label="Files">
          <ui-menu-item id="alpha" value="alpha">Alpha <kbd slot="shortcut">⌘A</kbd></ui-menu-item>
          <ui-menu-item id="disabled" value="disabled" href="#disabled" disabled>Blocked</ui-menu-item>
          <ui-menu-item id="bravo" value="bravo" href="#details">Bravo</ui-menu-item>
        </ui-menu-group>
        <hr id="separator">
        <ui-menu-item id="charlie" value="charlie">Charlie</ui-menu-item>
      </ui-menu>
    `, [join(root, "tokens.css")]);
    const menu = page.locator("#menu");
    assert.equal(await menu.getByRole("group", { name: "Files" }).count(), 1);
    assert.equal(await menu.getByRole("separator").count(), 1);
    assert.equal(await page.locator("#bravo").evaluate((element) => element.localName), "a");
    assert.equal(await page.locator("#disabled").getAttribute("href"), null);
    assert.equal(await menu.locator(".shortcut").first().getAttribute("aria-hidden"), "true");
    await page.locator("#alpha").focus();
    const active = () => page.evaluate(() => document.activeElement?.id);
    await page.keyboard.press("ArrowDown");
    assert.equal(await active(), "bravo", "disabled items are skipped");
    await page.keyboard.press("End");
    assert.equal(await active(), "charlie");
    await page.keyboard.press("ArrowDown");
    assert.equal(await active(), "alpha", "arrows wrap");
    await page.keyboard.press("c");
    assert.equal(await active(), "charlie", "typeahead uses the item label, not its shortcut");
    await page.keyboard.press("Home");
    assert.equal(await active(), "alpha");
    await page.locator("#bravo").click();
    await page.waitForFunction(() => location.hash === "#details");
    assert.deepEqual(await page.evaluate(() => (window as any).selections), [{ value: "bravo", trigger: "pointer" }]);
    await page.close();
  });

  it("projects groups and links through Vue and navigates a context menu", async () => {
    const path = await bundle("vue-menu-structure", `
      import { createApp, h } from "vue";
      import { ContextMenu, MenuGroup, MenuItem } from "@threadlabs/looma/vue";
      createApp({ render: () => h(ContextMenu, { id: "menu", open: true, for: "target" }, () => [
        h(MenuGroup, { label: "View" }, () => [
          h(MenuItem, { id: "one", value: "one" }, () => "One"),
          h(MenuItem, { id: "two", href: "#two", value: "two" }, () => "Two"),
        ]),
        h(MenuItem, { id: "three", value: "three" }, () => "Three"),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<button id="target">Target</button><div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const menu = page.locator("#menu");
    assert.equal(await menu.getByRole("group", { name: "View" }).count(), 1);
    assert.equal(await page.locator("#two").evaluate((element) => element.localName), "a");
    await page.locator("#one").focus();
    await page.keyboard.press("End");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "three");
    await page.keyboard.press("ArrowDown");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "one");
    await page.close();
  });

  it("toggles checkboxes and keeps radio choices exclusive within their groups", async () => {
    const path = await bundle("html-menu-checks", `
      import "@threadlabs/looma";
      window.menuEvents = [];
      document.querySelector("#menu").addEventListener("select", (event) => window.menuEvents.push(["select", event.detail]));
      document.addEventListener("change", (event) => { if (event.target.closest("#menu")) window.menuEvents.push(["change", event.detail]); });
    `);
    const page = await open(path, `
      <ui-menu id="menu" open aria-label="View options">
        <ui-menu-item id="grid" type="checkbox" value="grid">Show grid</ui-menu-item>
        <ui-menu-group label="Sort">
          <ui-menu-item id="name" type="radio" value="name" checked>Name</ui-menu-item>
          <ui-menu-item id="date" type="radio" value="date">Date</ui-menu-item>
        </ui-menu-group>
        <ui-menu-group label="Direction">
          <ui-menu-item id="ascending" type="radio" value="ascending" checked>Ascending</ui-menu-item>
          <ui-menu-item id="descending" type="radio" value="descending">Descending</ui-menu-item>
        </ui-menu-group>
      </ui-menu>
    `, [join(root, "tokens.css")]);
    const menu = page.locator("#menu");
    assert.equal(await page.locator("#grid").getAttribute("role"), "menuitemcheckbox");
    assert.equal(await page.locator("#name").getAttribute("role"), "menuitemradio");
    assert.equal(await page.locator("#name").getAttribute("aria-checked"), "true");
    for (const id of ["grid", "date"]) {
      const indicator = page.locator(`#${id} .indicator`);
      assert.equal(await indicator.evaluate((element) => getComputedStyle(element).borderStyle), "solid", `${id} shows an unchecked control`);
      assert.ok((await indicator.boundingBox())?.width, `${id} reserves a visible control`);
    }
    await page.locator("#grid").click();
    assert.equal(await page.locator("#grid").getAttribute("aria-checked"), "true");
    assert.equal(await menu.evaluate((element) => getComputedStyle(element).display === "none"), false, "checkable choice keeps menu open");
    await page.locator("#grid").focus();
    await page.keyboard.press("Space");
    assert.equal(await page.locator("#grid").getAttribute("aria-checked"), "false");
    await page.locator("#date").click();
    assert.equal(await page.locator("#date").getAttribute("aria-checked"), "true");
    assert.equal(await page.locator("#name").getAttribute("aria-checked"), "false");
    assert.equal(await page.locator("#ascending").getAttribute("aria-checked"), "true", "another group keeps its radio choice");
    assert.deepEqual(await page.evaluate(() => (window as any).menuEvents), [
      ["change", { checked: true, value: "grid", type: "checkbox", trigger: "pointer" }],
      ["select", { value: "grid", checked: true, trigger: "pointer" }],
      ["change", { checked: false, value: "grid", type: "checkbox", trigger: "keyboard" }],
      ["select", { value: "grid", checked: false, trigger: "keyboard" }],
      ["change", { checked: false, value: "name", type: "radio", trigger: "pointer" }],
      ["change", { checked: true, value: "date", type: "radio", trigger: "pointer" }],
      ["select", { value: "date", checked: true, trigger: "pointer" }],
    ]);
    await page.close();
  });

  it("keeps a controlled Vue check item in sync inside a context menu", async () => {
    const path = await bundle("vue-menu-check", `
      import { createApp, h, ref } from "vue";
      import { ContextMenu, MenuItem } from "@threadlabs/looma/vue";
      const checked = ref(false);
      window.changes = [];
      createApp({ render: () => h(ContextMenu, { id: "menu", open: true, for: "target" }, () =>
        h(MenuItem, { id: "grid", type: "checkbox", checked: checked.value, value: "grid", onChange: (event) => { window.changes.push(event.detail); checked.value = event.detail.checked; } }, () => "Show grid"))
      }).mount("#app");
    `);
    const page = await open(path, `<button id="target">Target</button><div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await page.locator("#grid").click();
    assert.equal(await page.locator("#grid").getAttribute("aria-checked"), "true");
    assert.deepEqual(await page.evaluate(() => (window as any).changes), [{ checked: true, value: "grid", type: "checkbox", trigger: "pointer" }]);
    await page.close();
  });

  it("keeps checked indicators and keyboard focus visible across themes", async () => {
    const path = await bundle("html-menu-themes", `import "@threadlabs/looma";`);
    const css = ["tokens.css", "theme-light.css", "theme-dark.css", "theme-high-contrast.css"].map((file) => join(root, file));
    const page = await open(path, `<ui-menu open aria-label="Options"><ui-menu-item id="grid" type="checkbox" checked>Show grid</ui-menu-item><ui-menu-item id="date" type="radio" checked>Date</ui-menu-item></ui-menu>`, css);
    for (const [attribute, value] of [["data-theme", "light"], ["data-theme", "dark"], ["data-contrast", "high"]] as const) {
      await page.evaluate(() => { document.documentElement.removeAttribute("data-theme"); document.documentElement.removeAttribute("data-contrast"); });
      await page.evaluate(([attribute, value]) => document.documentElement.setAttribute(attribute, value), [attribute, value]);
      const result = await page.locator("#grid").evaluate((item) => {
        const color = (value: string) => value.match(/[\d.]+/g)!.slice(0, 3).map(Number);
        const luminance = (value: string) => {
          const [red, green, blue] = color(value).map((channel) => {
            const scaled = channel / 255;
            return scaled <= 0.04045 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
          });
          return red! * 0.2126 + green! * 0.7152 + blue! * 0.0722;
        };
        const indicator = luminance(getComputedStyle(item.querySelector(".indicator")!).backgroundColor);
        const surface = luminance(getComputedStyle(item.closest(".surface")!).backgroundColor);
        return { ratio: (Math.max(indicator, surface) + 0.05) / (Math.min(indicator, surface) + 0.05), icon: Boolean(item.querySelector(".indicator svg")) };
      });
      assert.equal(result.icon, true);
      assert.ok(result.ratio >= 3, `${value} checked indicator has ${result.ratio.toFixed(2)}:1 contrast`);
    }
    await page.emulateMedia({ forcedColors: "active" });
    await page.locator("#grid").focus();
    await page.keyboard.press("ArrowDown");
    const focus = await page.locator("#date").evaluate((item) => ({ style: getComputedStyle(item).outlineStyle, width: getComputedStyle(item).outlineWidth, active: document.activeElement?.id, visible: item.matches(":focus-visible") }));
    assert.equal(focus.style, "solid", JSON.stringify(focus));
    assert.equal(focus.width, "2px");
    await page.close();
  });
});

describe("Dialog close policy and presentation", () => {
  for (const adapter of ["html", "vue"]) {
    it(`keeps ${adapter} dialog content inset and actions equally padded with early or late CSS`, async () => {
      const path = await bundle(`${adapter}-dialog-spacing`, adapter === "html" ? `import "@threadlabs/looma";` : `
        import { createApp, h } from "vue";
        import { Button, Dialog } from "@threadlabs/looma/vue";
        createApp({ render: () => h(Dialog, { id: "dialog", open: true, modal: true, label: "Publish changes?" }, {
          default: () => h("p", { id: "message" }, "Your edits will be visible to everyone with access to this project."),
          actions: () => [h(Button, { variant: "outline" }, () => "Cancel"), h(Button, {}, () => "Publish")],
        }) }).mount("#app");
      `);
      const css = [join(root, "tokens.css"), join(root, "theme-light.css"), ...(adapter === "vue" ? [join(root, "vue/components.css")] : [])];
      for (const width of [1024, 375]) {
        for (const late of [false, true]) {
          const page = await open(path, adapter === "html" ? `
            <ui-dialog id="dialog" open modal label="Publish changes?">
              <p id="message">Your edits will be visible to everyone with access to this project.</p>
              <ui-button slot="actions" variant="outline">Cancel</ui-button><ui-button slot="actions">Publish</ui-button>
            </ui-dialog>
          ` : '<div id="app"></div>', late ? [] : css, { viewport: { width, height: 720 }, reducedMotion: "reduce" });
          if (late) for (const stylesheet of css) await page.addStyleTag({ path: stylesheet });
          await page.waitForFunction(() => document.querySelector<HTMLDialogElement>("#dialog")?.open);
          const geometry = await page.locator("#dialog").evaluate(element => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            const message = element.querySelector("#message")!.getBoundingClientRect();
            const title = element.querySelector(".title")!.getBoundingClientRect();
            const footer = element.querySelector("footer")!;
            const action = footer.lastElementChild!.getBoundingClientRect();
            const body = element.querySelector(".body")!.getBoundingClientRect();
            return {
              left: message.left - rect.left - parseFloat(style.borderLeftWidth),
              right: rect.right - message.right - parseFloat(style.borderRightWidth),
              title: title.left - rect.left - parseFloat(style.borderLeftWidth),
              actionRight: rect.right - action.right - parseFloat(style.borderRightWidth),
              actionBottom: rect.bottom - action.bottom - parseFloat(style.borderBottomWidth),
              bodyTop: message.top - body.top, bodyBottom: body.bottom - message.bottom,
              gutter: parseFloat(getComputedStyle(footer).paddingInlineEnd),
              height: rect.height, viewportHeight: innerHeight, scroll: element.scrollHeight - element.clientHeight,
            };
          });
          const near = (actual: number, expected: number, message: string) => assert.ok(Math.abs(actual - expected) < 1, `${adapter}, ${width}px, late CSS ${late}: ${message}: ${JSON.stringify(geometry)}`);
          near(geometry.left, geometry.gutter, "body aligns with the title and footer gutter");
          near(geometry.right, geometry.gutter, "body has equal side padding");
          near(geometry.title, geometry.gutter, "title aligns with the body");
          near(geometry.actionRight, geometry.gutter, "actions keep their end gutter");
          near(geometry.actionBottom, geometry.gutter, "actions have equal bottom and side gutters");
          near(geometry.bodyTop, 12, "paragraph's outer top margin does not inflate the body inset");
          near(geometry.bodyBottom, geometry.gutter, "paragraph's outer bottom margin does not inflate the body inset");
          assert.ok(geometry.height < geometry.viewportHeight / 2, "short content stays compact");
          assert.equal(geometry.scroll, 0, "the outer dialog does not scroll");
          await page.close();
        }
      }
    });

    it(`keeps ${adapter} dialog chrome pinned while the body grows, scrolls, and shrinks`, async () => {
      const path = await bundle(`${adapter}-dialog-scroll`, adapter === "html" ? `import "@threadlabs/looma";` : `
        import { createApp, h } from "vue";
        import { Button, Dialog } from "@threadlabs/looma/vue";
        createApp({ render: () => h(Dialog, { id: "dialog", open: true, modal: true, label: "Review changes" }, {
          default: () => h("div", { id: "content" }, "Short content"),
          actions: () => h(Button, {}, () => "Accept"),
        }) }).mount("#app");
      `);
      const page = await open(path, adapter === "html" ? `
        <ui-dialog id="dialog" open modal label="Review changes"><div id="content">Short content</div><ui-button slot="actions">Accept</ui-button></ui-dialog>
      ` : '<div id="app"></div>', [join(root, "tokens.css"), ...(adapter === "vue" ? [join(root, "vue/components.css")] : [])],
        { viewport: { width: 375, height: 600 }, reducedMotion: "reduce" });
      const dialog = page.locator("#dialog");
      const short = await dialog.boundingBox();
      await page.locator("#content").evaluate(element => { element.innerHTML = "<p>Review this change.</p>".repeat(80); });
      const tall = await dialog.boundingBox();
      assert.ok(short && tall && tall.height > short.height && tall.y >= 16 && tall.y + tall.height <= 584, "growth stops at both viewport gutters");
      const scroller = page.locator('#dialog [data-component~="ui-scroll-area"]');
      assert.equal(await scroller.evaluate(element => element.scrollHeight > element.clientHeight), true, "long content scrolls inside Scroll Area");
      const pinned = await page.locator("#dialog header, #dialog footer").evaluateAll(elements => elements.map(element => element.getBoundingClientRect().y));
      await scroller.evaluate(element => { element.scrollTop = element.scrollHeight; });
      assert.ok(await scroller.evaluate(element => element.scrollTop) > 0);
      assert.deepEqual(await page.locator("#dialog header, #dialog footer").evaluateAll(elements => elements.map(element => element.getBoundingClientRect().y)), pinned, "header and actions stay pinned while scrolling");
      await page.locator("#content").evaluate(element => { element.textContent = "Short content"; });
      const shrunk = await dialog.boundingBox();
      assert.ok(shrunk && Math.abs(shrunk.height - short!.height) < 1, "removing long content restores the compact height");
      await page.close();
    });
  }

  const isOpen = (id: string) => `document.querySelector("#${id}").open`;

  it("keeps nested modal dialogs open with only one visible backdrop", async () => {
    const path = await bundle("html-dialog-nested-backdrops", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-dialog id="parent" open modal label="Parent">
        <button id="child-trigger">Open child</button>
        <ui-dialog id="child" for="child-trigger" modal label="Child">Child content</ui-dialog>
      </ui-dialog>
    `, [join(root, "tokens.css"), join(root, "theme-light.css"), join(root, "styles/ui-dialog.css")], { reducedMotion: "reduce" });
    await page.locator("#child-trigger").click();
    await page.waitForFunction(() => document.querySelector("#child")!.matches(":modal"));
    const backdrops = () => page.evaluate(() => ["parent", "child"].map((id) => getComputedStyle(document.getElementById(id)!, "::backdrop").backgroundColor));
    const [parent, child] = await backdrops();
    assert.equal(parent, "rgba(0, 0, 0, 0)", "the lower modal backdrop is transparent");
    assert.notEqual(child, "rgba(0, 0, 0, 0)", "the top modal supplies the backdrop");
    assert.equal(await page.locator("#parent").evaluate((element) => (element as HTMLDialogElement).open), true);
    await page.locator("#child").getByRole("button", { name: "Close" }).click();
    await page.waitForFunction(() => !document.querySelector("#child")!.matches(":modal"));
    assert.notEqual((await backdrops())[0], "rgba(0, 0, 0, 0)", "the parent backdrop returns when the child closes");
    await page.locator("#child-trigger").click();
    await page.waitForFunction(() => document.querySelector("#child")!.matches(":modal"));
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("#child")!.matches(":modal"));
    assert.equal(await page.locator("#parent").evaluate((element) => (element as HTMLDialogElement).open), true, "Escape closes only the top modal");
    await page.close();
  });

  it("shares one backdrop when a modal Search Shell opens inside a modal Dialog", async () => {
    const path = await bundle("html-dialog-search-shell-backdrop", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-dialog id="parent" open modal label="Parent">
        <ui-search-shell id="search" open modal label="Search"><input slot="search" aria-label="Query"></ui-search-shell>
      </ui-dialog>
    `, [join(root, "tokens.css"), join(root, "theme-light.css"), join(root, "styles/ui-dialog.css"), join(root, "styles/ui-search-shell.css")], { reducedMotion: "reduce" });
    const search = page.locator("#search dialog");
    await page.waitForFunction(() => document.querySelector("#search dialog")?.matches(":modal"));
    assert.equal(await page.locator("#parent").evaluate((element) => getComputedStyle(element, "::backdrop").backgroundColor), "rgba(0, 0, 0, 0)");
    assert.notEqual(await search.evaluate((element) => getComputedStyle(element, "::backdrop").backgroundColor), "rgba(0, 0, 0, 0)");
    assert.equal(await search.evaluate((element) => getComputedStyle(element).backgroundColor), "rgba(0, 0, 0, 0)");
    await search.evaluate((element: HTMLDialogElement) => element.close());
    await page.waitForFunction(() => !document.querySelector("#search dialog")?.open);
    await page.waitForFunction(() => getComputedStyle(document.querySelector("#parent")!, "::backdrop").backgroundColor !== "rgba(0, 0, 0, 0)");
    assert.notEqual(await page.locator("#parent").evaluate((element) => getComputedStyle(element, "::backdrop").backgroundColor), "rgba(0, 0, 0, 0)");
    await page.close();
  });

  it("is non-modal by default, like native show(): no backdrop, no scroll lock, Escape and outside presses do not close it", async () => {
    const path = await bundle("html-dialog-default", `
      import "@threadlabs/looma";
      const dialog = document.querySelector("#dialog");
      window.dialogEvents = [];
      dialog.addEventListener("open", (event) => window.dialogEvents.push({ type: "open", ...event.detail }));
      dialog.addEventListener("close", (event) => window.dialogEvents.push({ type: "close", ...event.detail }));
    `);
    const page = await open(path, `<ui-button id="trigger">Open</ui-button><button id="outside">Outside</button><ui-dialog id="dialog" for="trigger" label="Details"><button id="inside">Inside</button></ui-dialog>`, [join(root, "tokens.css")]);
    await page.locator("#trigger").click();
    const dialog = page.locator("#dialog");
    await page.waitForFunction(isOpen("dialog"));
    assert.equal(await dialog.evaluate((element) => element.matches(":modal")), false);
    assert.equal(await dialog.getAttribute("closedby"), "none");
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute("data-ui-scroll-lock")), false);
    // Focus moves into the dialog, and the rest of the page stays usable.
    assert.equal(await page.evaluate(() => document.querySelector("#dialog")!.contains(document.activeElement)), true);
    await page.keyboard.press("Escape");
    await page.locator("#outside").click();
    assert.equal(await page.evaluate(() => document.activeElement?.id), "outside");
    assert.equal(await dialog.evaluate((element) => (element as HTMLDialogElement).open), true);
    // The header close button is the visible exit.
    await dialog.getByRole("button", { name: "Close" }).click();
    await page.waitForFunction(`!${isOpen("dialog")}`);
    assert.equal(await page.evaluate(() => document.activeElement?.closest("#trigger") !== null), true, "focus returns to the trigger");
    assert.deepEqual(await page.evaluate(() => (window as any).dialogEvents), [
      { type: "open", open: true, reason: "action", trigger: "pointer" },
      { type: "close", open: false, reason: "action", trigger: "pointer" },
    ]);
    await page.close();
  });

  it("opens modally with modal, locks scroll, closes on Escape, returns focus, and reports trigger and close events", async () => {
    const path = await bundle("html-dialog-close-policy", `
      import "@threadlabs/looma";
      const dialog = document.querySelector("#dialog");
      window.dialogEvents = [];
      dialog.addEventListener("open", (event) => window.dialogEvents.push({ type: "open", ...event.detail }));
      dialog.addEventListener("close", (event) => window.dialogEvents.push({ type: "close", ...event.detail }));
    `);
    const page = await open(path, `<ui-button id="trigger">Open</ui-button><ui-dialog id="dialog" for="trigger" modal label="Details"><button id="inside">Inside</button></ui-dialog>`, [join(root, "tokens.css")]);
    await page.locator("#trigger").click();
    const dialog = page.locator("#dialog");
    assert.equal(await dialog.evaluate((element) => element.matches(":modal")), true);
    assert.equal(await dialog.getAttribute("closedby"), "closerequest");
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute("data-ui-scroll-lock")), true);
    assert.equal(await page.evaluate(() => document.querySelector("#dialog")!.contains(document.activeElement)), true);
    await page.keyboard.press("Escape");
    await page.waitForFunction(`!${isOpen("dialog")}`);
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute("data-ui-scroll-lock")), false);
    assert.equal(await page.evaluate(() => document.activeElement?.closest("#trigger") !== null), true);
    assert.deepEqual(await page.evaluate(() => (window as any).dialogEvents), [
      { type: "open", open: true, reason: "action", trigger: "pointer" },
      { type: "close", open: false, reason: "escape", trigger: "keyboard" },
    ]);
    await page.close();
  });

  it("keeps modeless as a no-op: non-modal alone, and modal wins when both are set", async () => {
    const path = await bundle("html-dialog-modeless", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-dialog id="modeless" open modeless label="Modeless">Body</ui-dialog>
      <ui-dialog id="both" open modal modeless label="Both">Body</ui-dialog>
    `, [join(root, "tokens.css")]);
    assert.equal(await page.locator("#modeless").evaluate((element) => element.matches(":modal")), false);
    assert.equal(await page.locator("#modeless").getAttribute("closedby"), "none");
    assert.equal(await page.locator("#both").evaluate((element) => element.matches(":modal")), true);
    assert.equal(await page.locator("#both").getAttribute("closedby"), "closerequest");
    await page.close();
  });

  it("follows closedby in each mode", async () => {
    const path = await bundle("html-dialog-closedby", `import "@threadlabs/looma";`);
    for (const modal of [false, true]) {
      const attribute = modal ? " modal" : "";
      const page = await open(path, `
        <ui-dialog id="any" open${attribute} closedby="any" label="Any">Body</ui-dialog>
        <ui-dialog id="request" open${attribute} closedby="closerequest" label="Request">Body</ui-dialog>
        <ui-dialog id="none" open${attribute} closedby="none" label="None">Body</ui-dialog>
      `, [join(root, "tokens.css")]);
      // The last opened dialog is on top of the stack; each close uncovers the next.
      await page.keyboard.press("Escape");
      await page.mouse.click(4, 4);
      assert.equal(await page.evaluate(isOpen("none")), true, `closedby="none" ignores Escape and outside presses (modal: ${modal})`);
      await page.locator("#none").getByRole("button", { name: "Close" }).click();
      await page.waitForFunction(`!${isOpen("none")}`);
      await page.mouse.click(4, 4);
      await page.waitForTimeout(50);
      assert.equal(await page.evaluate(isOpen("request")), true, `closedby="closerequest" ignores outside presses (modal: ${modal})`);
      await page.keyboard.press("Escape");
      await page.waitForFunction(`!${isOpen("request")}`);
      await page.mouse.click(4, 4);
      await page.waitForFunction(`!${isOpen("any")}`);
      await page.close();
    }
  });

  it("switches between non-modal and modal while open in Vue, and keeps the close default in step", async () => {
    const path = await bundle("vue-dialog-modal-switch", `
      import { createApp, h, ref } from "vue";
      import { Dialog } from "@threadlabs/looma/vue";
      const modal = ref(false);
      window.dialogModal = modal;
      createApp({ render: () => h(Dialog, { id: "dialog", open: true, modal: modal.value, label: "Switch" }, () => "Body") }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const dialog = page.locator("#dialog");
    assert.equal(await dialog.evaluate((element) => element.matches(":modal")), false);
    assert.equal(await dialog.getAttribute("closedby"), "none");
    await page.evaluate(() => { (window as any).dialogModal.value = true; });
    await page.waitForFunction(() => document.querySelector("#dialog")!.matches(":modal"));
    assert.equal(await dialog.getAttribute("closedby"), "closerequest");
    await page.evaluate(() => { (window as any).dialogModal.value = false; });
    await page.waitForFunction(() => !document.querySelector("#dialog")!.matches(":modal"));
    assert.equal(await dialog.getAttribute("closedby"), "none");
    assert.equal(await page.evaluate(isOpen("dialog")), true);
    await page.close();
  });

  it("separates outside dismissal from Escape and keeps alerts modal and action-only when requested", async () => {
    const path = await bundle("html-dialog-alert", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-dialog id="dialog" open modal closedby="any" label="Info">Body</ui-dialog>
      <ui-button id="alert-trigger">Show alert</ui-button>
      <ui-dialog id="alert" for="alert-trigger" alert closedby="none" label="Delete?">Body<button commandfor="alert" command="close">Cancel</button></ui-dialog>
      <ui-button id="alert-default-trigger">Discard</ui-button>
      <ui-dialog id="alert-default" for="alert-default-trigger" alert label="Discard?">Body</ui-dialog>
    `, [join(root, "tokens.css")]);
    await page.mouse.click(4, 4);
    await page.waitForFunction(`!${isOpen("dialog")}`);
    const alert = page.locator("#alert");
    await page.locator("#alert-trigger").click();
    assert.equal(await alert.getAttribute("role"), "alertdialog");
    assert.equal(await alert.evaluate((element) => element.matches(":modal")), true);
    assert.equal(await alert.locator(".close").evaluate((element) => getComputedStyle(element).display), "none");
    await page.keyboard.press("Escape");
    assert.equal(await alert.evaluate((element) => (element as HTMLDialogElement).open), true);
    await alert.getByText("Cancel").click();
    await page.waitForFunction(`!${isOpen("alert")}`);
    // An alert without modal is still modal, with the modal close default.
    await page.locator("#alert-default-trigger").click();
    await page.waitForFunction(isOpen("alert-default"));
    assert.equal(await page.locator("#alert-default").evaluate((element) => element.matches(":modal")), true);
    assert.equal(await page.locator("#alert-default").getAttribute("closedby"), "closerequest");
    await page.close();
  });

  it("supports size choices while retaining the local width hook", async () => {
    const path = await bundle("html-dialog-size", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-dialog id="small" open size="sm" label="Small">Body</ui-dialog>
      <ui-dialog id="large" open size="lg" label="Large">Body</ui-dialog>
      <ui-dialog id="custom" open size="sm" style="--ui-dialog-max-width: 520px" label="Custom">Body</ui-dialog>
      <ui-dialog id="full" open size="fullscreen" label="Full">Body</ui-dialog>
    `, [join(root, "tokens.css")]);
    const measure = async (id: string) => page.locator(id).evaluate((element) => ({ modal: element.matches(":modal"), width: Number.parseFloat(getComputedStyle(element).width), height: Number.parseFloat(getComputedStyle(element).height) }));
    const small = await measure("#small");
    const large = await measure("#large");
    const custom = await measure("#custom");
    const full = await measure("#full");
    assert.equal(small.modal, false);
    assert.ok(small.width < large.width && large.width < full.width);
    assert.ok(custom.width > small.width && custom.width < large.width);
    assert.ok(Math.abs(full.height - (await page.evaluate(() => window.innerHeight))) < 2);
    await page.close();
  });

  it("reports a controlled Vue open once when the consumer changes it", async () => {
    const path = await bundle("vue-dialog-open", `
      import { createApp, h, ref } from "vue";
      import { Dialog } from "@threadlabs/looma/vue";
      const open = ref(false);
      window.dialogEvents = [];
      createApp({ render: () => [
        h("button", { id: "show", onClick: () => { open.value = true; } }, "Show"),
        h(Dialog, { id: "dialog", open: open.value, label: "Details", onOpen: (event) => window.dialogEvents.push(event.detail) }, () => "Body"),
      ] }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    assert.deepEqual(await page.evaluate(() => (window as any).dialogEvents), []);
    await page.locator("#show").click();
    await page.waitForFunction(() => (document.querySelector("#dialog") as HTMLDialogElement).open);
    assert.equal(await page.locator("#dialog").evaluate((element) => element.matches(":modal")), false);
    assert.deepEqual(await page.evaluate(() => (window as any).dialogEvents), [{ open: true, reason: "programmatic", trigger: "programmatic" }]);
    await page.close();
  });
});

describe("Editable constraints", () => {
  it("keeps invalid drafts open and uses authored action labels in HTML", async () => {
    const path = await bundle("html-editable-constraints", `import "@threadlabs/looma";`);
    const page = await open(path, `<ui-editable id="name" value="Old" label="Name" actions required max-length="4" save-label="Apply" cancel-label="Discard" placeholder="Name"></ui-editable>`, [join(root, "tokens.css")]);
    const editable = page.locator("#name");
    await editable.locator(".preview").click();
    const input = editable.locator("input");
    assert.equal(await input.getAttribute("placeholder"), "Name");
    assert.equal(await input.getAttribute("maxlength"), "4");
    await input.fill("");
    await editable.getByRole("button", { name: "Apply" }).click();
    assert.equal(await input.evaluate((element) => getComputedStyle(element).visibility), "visible");
    assert.equal(await editable.locator(".text").textContent(), "Old");
    await input.evaluate((element) => {
      (element as HTMLInputElement).value = "Valid";
      element.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await editable.getByRole("button", { name: "Apply" }).click();
    assert.equal(await editable.locator(".text").textContent(), "Old", "overlong text does not commit");
    await input.fill("New");
    await editable.getByRole("button", { name: "Apply" }).click();
    assert.equal(await editable.locator(".text").textContent(), "New");
    await page.close();
  });
});

describe("Form Field error visibility", () => {
  it("shows and describes an authored error only while invalid in HTML", async () => {
    const path = await bundle("html-form-field-error", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-form-field id="valid"><label slot="label">Name</label><ui-input aria-label="Name"></ui-input><small slot="help">A short name.</small><small slot="error" id="valid-error">Required.</small></ui-form-field>
      <ui-form-field id="invalid" invalid><label slot="label">Email</label><ui-input aria-label="Email"></ui-input><small slot="error" id="invalid-error">Enter an email.</small></ui-form-field>
    `, [join(root, "tokens.css")]);
    const valid = page.locator("#valid");
    const invalid = page.locator("#invalid");
    assert.equal(await valid.locator(".error").evaluate((element) => getComputedStyle(element).display), "none");
    assert.ok(!(await valid.locator("input").getAttribute("aria-describedby"))?.includes("valid-error"));
    assert.equal(await invalid.locator(".error").evaluate((element) => getComputedStyle(element).display), "contents");
    assert.ok((await invalid.locator("input").getAttribute("aria-describedby"))?.includes("invalid-error"));
    await page.close();
  });
});

describe("Textarea autosize", () => {
  it("keeps rows as the minimum and grows and shrinks with input in HTML", async () => {
    const path = await bundle("html-textarea-autosize", `import "@threadlabs/looma";`);
    const page = await open(path, `<ui-textarea id="note" aria-label="Note" autosize rows="3"></ui-textarea>`, [join(root, "tokens.css")]);
    const textarea = page.locator("#note");
    const dimensions = () => textarea.evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight),
    }));
    const empty = await dimensions();
    assert.ok(empty.height >= empty.lineHeight * 3, "rows still establishes the minimum height");
    await textarea.fill(Array.from({ length: 12 }, (_, index) => `Line ${index + 1}`).join("\n"));
    const filled = await dimensions();
    assert.ok(filled.height > empty.height + empty.lineHeight * 6, "the control grows to reveal text");
    await textarea.fill("");
    assert.ok(Math.abs((await dimensions()).height - empty.height) < 2, "the control shrinks to its row minimum");
    await page.close();
  });

  it("passes autosize and rows through the Vue projection", async () => {
    const path = await bundle("vue-textarea-autosize", `
      import { createApp, h } from "vue";
      import { Textarea } from "@threadlabs/looma/vue";
      createApp({ render: () => h(Textarea, { id: "note", "aria-label": "Note", autosize: true, rows: 2 }) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const textarea = page.locator("#note");
    const initial = await textarea.evaluate((element) => element.getBoundingClientRect().height);
    await textarea.fill("One\nTwo\nThree\nFour\nFive\nSix");
    assert.ok((await textarea.evaluate((element) => element.getBoundingClientRect().height)) > initial);
    await page.close();
  });
});

describe("Choice invalid states", () => {
  const verify = async (page: Page) => {
    const checkbox = page.locator("#terms input");
    const group = page.locator('#choice [role="radiogroup"], #choice[role="radiogroup"]').first();
    assert.equal(await checkbox.getAttribute("aria-invalid"), "true");
    assert.equal(await group.getAttribute("aria-invalid"), "true");
    assert.equal(await checkbox.evaluate((element) => getComputedStyle(element).borderTopColor), "rgb(146, 36, 64)");
    assert.equal(await page.locator("#choice legend").evaluate((element) => getComputedStyle(element).color), "rgb(146, 36, 64)");
  };

  it("exposes and styles invalid choices in HTML", async () => {
    const path = await bundle("html-invalid-choices", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <div style="--ui-field-danger: rgb(146, 36, 64)">
        <ui-checkbox id="terms" invalid>Accept terms</ui-checkbox>
        <ui-radio-group id="choice" label="Choose" invalid><ui-radio value="one">One</ui-radio></ui-radio-group>
      </div>
    `, [join(root, "tokens.css")]);
    await verify(page);
    await page.close();
  });

  it("exposes and styles invalid choices in Vue", async () => {
    const path = await bundle("vue-invalid-choices", `
      import { createApp, h } from "vue";
      import { Checkbox, Radio, RadioGroup } from "@threadlabs/looma/vue";
      createApp({ render: () => h("div", { style: "--ui-field-danger: rgb(146, 36, 64)" }, [
        h(Checkbox, { id: "terms", invalid: true }, () => "Accept terms"),
        h(RadioGroup, { id: "choice", label: "Choose", invalid: true }, () => h(Radio, { value: "one" }, () => "One")),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await verify(page);
    await page.close();
  });
});

describe("Combobox option modes", () => {
  const verify = async (page: Page) => {
    const input = page.locator("#fruit input[role=combobox]");
    await input.focus();
    assert.equal(await input.getAttribute("aria-expanded"), "true");
    assert.equal(await input.getAttribute("aria-invalid"), "true");
    await input.fill("Ap");
    assert.equal(await page.locator('#fruit [role="option"]').count(), 2, "filter none leaves both authored options visible");
    await input.blur();
    assert.equal(await input.getAttribute("aria-invalid"), "true", "external invalid state survives native validation");
  };

  it("opens on focus, leaves externally filtered options visible, and keeps invalid in HTML", async () => {
    const path = await bundle("html-combobox-option-modes", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-combobox id="fruit" label="Fruit" filter="none" open-on-focus invalid>
        <option value="apple">Apple</option><option value="pear">Pear</option>
      </ui-combobox>
    `, [join(root, "tokens.css")]);
    await verify(page);
    await page.close();
  });

  it("passes option modes through Vue", async () => {
    const path = await bundle("vue-combobox-option-modes", `
      import { createApp, h } from "vue";
      import { Combobox } from "@threadlabs/looma/vue";
      createApp({ render: () => h(Combobox, { id: "fruit", label: "Fruit", filter: "none", openOnFocus: true, invalid: true }, () => [
        h("option", { value: "apple" }, "Apple"), h("option", { value: "pear" }, "Pear"),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await verify(page);
    await page.close();
  });

  it("announces loading and shows an authored empty state when settled in HTML", async () => {
    const path = await bundle("html-combobox-loading", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-combobox id="fruit" label="Fruit" loading open-on-focus>
        <span slot="empty">No fruit found</span>
      </ui-combobox>
    `, [join(root, "tokens.css")]);
    const input = page.locator("#fruit input[role=combobox]");
    await input.focus();
    assert.equal(await input.getAttribute("aria-busy"), "true");
    assert.equal(await page.locator('#fruit [role="listbox"]').getAttribute("aria-busy"), "true");
    assert.equal(await page.getByText("No fruit found").isVisible(), false);
    await page.close();

    const settled = await open(path, `
      <ui-combobox id="fruit" label="Fruit" open-on-focus><span slot="empty">No fruit found</span></ui-combobox>
    `, [join(root, "tokens.css")]);
    await settled.locator("#fruit input[role=combobox]").focus();
    assert.equal(await settled.getByText("No fruit found").isVisible(), true);
    assert.equal(await settled.locator("#fruit input[role=combobox]").getAttribute("aria-busy"), "false");
    await settled.close();
  });

  it("follows a Vue consumer's loading state", async () => {
    const path = await bundle("vue-combobox-loading", `
      import { createApp, h, ref } from "vue";
      import { Combobox } from "@threadlabs/looma/vue";
      const loading = ref(true);
      window.finishLoading = () => { loading.value = false; };
      createApp({ render: () => h(Combobox, { id: "fruit", label: "Fruit", openOnFocus: true, loading: loading.value }, {
        empty: () => h("span", "No fruit found"),
      }) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const input = page.locator("#fruit input[role=combobox]");
    await input.focus();
    assert.equal(await input.getAttribute("aria-busy"), "true");
    await page.evaluate(() => (window as unknown as { finishLoading: () => void }).finishLoading());
    await page.getByText("No fruit found").waitFor({ state: "visible" });
    assert.equal(await input.getAttribute("aria-busy"), "false");
    await page.close();
  });
});

describe("Loading actions", () => {
  it("keeps focus and labels while blocking button submits, icon clicks, and link navigation in HTML", async () => {
    const path = await bundle("html-loading-actions", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <form id="form"><ui-button id="save" type="submit" loading><span>Save</span></ui-button></form>
      <ui-icon-button id="more" label="More" loading><ui-icon name="ellipsis"></ui-icon></ui-icon-button>
      <ui-button id="link" as="a" href="#target" loading>Open</ui-button>
    `, [join(root, "tokens.css")]);
    await page.evaluate(() => {
      (window as unknown as { activations: number }).activations = 0;
      for (const id of ["save", "more", "link"]) document.getElementById(id)?.addEventListener("click", () => (window as unknown as { activations: number }).activations++);
      document.getElementById("form")?.addEventListener("submit", (event) => { event.preventDefault(); (window as unknown as { activations: number }).activations++; });
    });
    for (const id of ["save", "more", "link"]) {
      const action = page.locator(`#${id}`);
      assert.equal(await action.getAttribute("aria-disabled"), "true");
      assert.equal(await action.getAttribute("aria-busy"), "true");
      assert.equal(await action.locator("ui-spinner, [data-component='ui-spinner']").count(), 1);
      await action.focus();
      assert.equal(await action.evaluate((element) => element === document.activeElement), true);
      const box = await action.boundingBox();
      assert.ok(box);
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
    assert.equal(await page.locator("#save").textContent().then((value) => value?.includes("Save")), true);
    assert.equal(await page.locator("#more").getAttribute("aria-label"), "More");
    assert.equal(await page.locator("#link").getAttribute("href"), null);
    assert.equal(await page.locator("#link").getAttribute("tabindex"), "0");
    const spinner = await page.locator("#save ui-spinner, #save [data-component='ui-spinner']").boundingBox();
    const spinnerWrap = await page.locator("#save .spinner-wrap").boundingBox();
    const label = await page.locator("#save span").last().boundingBox();
    assert.ok(spinner && spinnerWrap && label);
    assert.ok(Math.abs(spinnerWrap.width - spinnerWrap.height) < 1, "spinner rotates inside a square box");
    const arc = page.locator("#save [data-component~='ui-spinner'] svg .arc");
    assert.equal(await arc.evaluate((element) => getComputedStyle(element).strokeLinecap), "round");
    assert.equal(await arc.evaluate((element) => getComputedStyle(element).animationName), "ui-spinner-dash");
    assert.ok(label.x - (spinnerWrap.x + spinnerWrap.width) >= 7, "loading spinner has space before the label");
    assert.equal(await page.evaluate(() => (window as unknown as { activations: number }).activations), 0);
    assert.equal(await page.evaluate(() => location.hash), "");
    await page.close();
  });

  it("reactivates when a Vue consumer clears loading", async () => {
    const path = await bundle("vue-loading-actions", `
      import { createApp, h, ref } from "vue";
      import { Button, IconButton } from "@threadlabs/looma/vue";
      const loading = ref(true);
      window.finish = () => { loading.value = false; };
      createApp({ render: () => h("div", [
        h(Button, { id: "save", loading: loading.value }, () => "Save"),
        h(IconButton, { id: "more", label: "More", loading: loading.value }, () => h("svg", { viewBox: "0 0 24 24" })),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await page.evaluate(() => {
      (window as unknown as { activations: number }).activations = 0;
      for (const id of ["save", "more"]) document.getElementById(id)?.addEventListener("click", () => (window as unknown as { activations: number }).activations++);
    });
    await page.locator("#save").evaluate((element) => (element as HTMLElement).click());
    await page.locator("#more").evaluate((element) => (element as HTMLElement).click());
    assert.equal(await page.evaluate(() => (window as unknown as { activations: number }).activations), 0);
    await page.evaluate(() => (window as unknown as { finish: () => void }).finish());
    await page.locator("#save").click();
    await page.locator("#more").click();
    assert.equal(await page.evaluate(() => (window as unknown as { activations: number }).activations), 2);
    assert.equal(await page.locator("#save").getAttribute("aria-disabled"), null);
    await page.close();
  });
});

describe("Disabled action appearance", () => {
  it("uses a flat neutral palette instead of retaining active button tones", async () => {
    const path = await bundle("html-disabled-actions", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-button id="active">Publish</ui-button>
      <ui-button id="outline" disabled>Publish</ui-button>
      <ui-button id="danger" variant="danger" disabled>Delete</ui-button>
      <ui-icon-button id="icon" label="More" variant="outline" disabled><ui-icon name="ellipsis"></ui-icon></ui-icon-button>
    `, [join(root, "tokens.css"), join(root, "theme-light.css")]);
    const style = (id: string) => page.locator(`#${id}`).evaluate((element) => {
      const css = getComputedStyle(element);
      return { color: css.color, background: css.backgroundColor, border: css.borderTopColor, shadow: css.boxShadow };
    });
    const active = await style("active");
    const outline = await style("outline");
    const danger = await style("danger");
    const icon = await style("icon");
    assert.notEqual(outline.color, active.color);
    assert.notEqual(outline.border, active.border);
    assert.equal(outline.color, danger.color);
    assert.equal(outline.background, danger.background);
    assert.equal(icon.color, outline.color);
    assert.equal(outline.shadow, "none");
    await page.close();
  });
});

describe("Avatar fallbacks and counts", () => {
  it("shows a person glyph, supports square and decorative avatars, and counts unauthored people in HTML", async () => {
    const path = await bundle("html-avatar-coverage", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-avatar id="anonymous"></ui-avatar>
      <ui-avatar id="decorative" name="Ada Lovelace" decorative></ui-avatar>
      <ui-avatar-group id="group" max="2" total="7" overflow-label="{count} other contributors">
        <ui-avatar id="square" name="Ada Lovelace" shape="square"></ui-avatar>
        <ui-avatar name="Grace Hopper"></ui-avatar>
      </ui-avatar-group>
    `, [join(root, "tokens.css")]);
    assert.equal(await page.locator("#anonymous").getAttribute("aria-label"), "Avatar");
    assert.equal(await page.locator('#anonymous [data-component="ui-icon"]').count(), 1);
    assert.equal(await page.locator("#anonymous .fallback ui-icon, #anonymous .fallback [data-component='ui-icon']").first().isVisible(), true, await page.locator("#anonymous .fallback").evaluate((element) => element.outerHTML));
    assert.equal(await page.locator("#anonymous .fallback > span:first-child").isVisible(), false);
    assert.equal(await page.locator("#decorative").getAttribute("aria-hidden"), "true");
    assert.equal(await page.locator("#decorative").getAttribute("role"), null);
    assert.equal(await page.locator("#square").evaluate((element) => getComputedStyle(element).borderTopLeftRadius), "8px");
    assert.equal(await page.locator("#group .overflow").textContent(), "+5");
    assert.equal(await page.locator("#group .overflow").getAttribute("aria-label"), "5 other contributors");
    await page.close();
  });

  it("passes decorative, shape, total, and overflow label through Vue", async () => {
    const path = await bundle("vue-avatar-coverage", `
      import { createApp, h } from "vue";
      import { Avatar, AvatarGroup } from "@threadlabs/looma/vue";
      createApp({ render: () => h(AvatarGroup, { id: "group", max: 1, total: 4, overflowLabel: "{count} more teammates" }, () => [
        h(Avatar, { id: "square", name: "Ada Lovelace", shape: "square", decorative: true }),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    assert.equal(await page.locator("#square").getAttribute("aria-hidden"), "true");
    assert.equal(await page.locator("#square").evaluate((element) => getComputedStyle(element).borderTopLeftRadius), "8px");
    assert.equal(await page.locator("#group .overflow").getAttribute("aria-label"), "3 more teammates");
    await page.close();
  });
});

describe("Vue components", () => {
  it("update a v-model prop once per choice, though the choice is two events", async () => {
    const path = await bundle("vue-radio-model", `
      import { createApp, h, ref } from "vue";
      import { Radio, RadioGroup } from "@threadlabs/looma/vue";
      const choice = ref("open");
      const updates = [];
      window.updates = updates;
      createApp({
        render: () => h(RadioGroup, {
          id: "access",
          label: "Access",
          value: choice.value,
          "onUpdate:value": (value) => { updates.push(value); choice.value = value; },
        }, () => [
          h(Radio, { value: "open" }, () => "Open"),
          h(Radio, { value: "private" }, () => "Private"),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);

    // A choice is reported as select and as change; a v-model consumer hears it once.
    await page.locator('#access input[value="private"]').click();
    assert.deepEqual(await page.evaluate(() => (window as unknown as { updates: string[] }).updates), ["private"]);
    await page.locator('#access input[value="open"]').click();
    assert.deepEqual(await page.evaluate(() => (window as unknown as { updates: string[] }).updates), ["private", "open"]);
    await page.close();
  });

  it("name a choice by its label and describe it by its description", async () => {
    const path = await bundle("vue-radio-description", `
      import { createApp, h } from "vue";
      import { Radio, RadioGroup } from "@threadlabs/looma/vue";
      createApp({
        render: () => [
          h(RadioGroup, { label: "Who can open it", value: "open" }, () => [
            h(Radio, { value: "open" }, { default: () => "Open", description: () => "Everyone on the site can open it." }),
            h(Radio, { value: "private" }, () => "Private"),
          ]),
        ],
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);

    // The description is on its own line and is not part of the name.
    const open_ = page.getByRole("radio", { name: "Open", exact: true });
    assert.equal(await open_.count(), 1);
    const description = await open_.evaluate((input) => document.getElementById(input.getAttribute("aria-describedby") ?? "")?.textContent);
    assert.equal(description, "Everyone on the site can open it.");
    const [label, line] = await page.locator("label", { has: open_ }).evaluate((label) =>
      [".label", ".description"].map((part) => label.querySelector(part)!.getBoundingClientRect().top));
    assert.ok(line > label, "the description sits under the label");
    // A choice with no description shows no empty line.
    assert.equal(await page.locator("label", { has: page.getByRole("radio", { name: "Private" }) }).locator(".description").isVisible(), false);
    await page.close();
  });

  it("frames a multiline textarea and its bottom action in one accessible input group", async () => {
    const path = await bundle("vue-multiline-input-group", `
      import { createApp, h } from "vue";
      import { Button, Textarea, InputGroup } from "@threadlabs/looma/vue";
      createApp({ render: () => h("form", { id: "form" }, [
        h(InputGroup, { id: "multiline", multiline: true }, {
          default: () => h(Textarea, { id: "message", name: "message", rows: 3, value: "A draft", "aria-label": "Message" }),
          suffix: () => "Plain text",
          action: () => h(Button, { id: "send", type: "submit" }, () => "Send"),
        }),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")], { viewport: { width: 375, height: 812 } });
    await page.addStyleTag({ content: "* { transition: none !important; }" });
    const group = page.locator("#multiline"), textarea = page.getByRole("textbox", { name: "Message" });
    assert.equal(await textarea.evaluate(element => getComputedStyle(element).borderTopWidth), "0px", "the textarea shares the outer frame");
    const frame = (await group.boundingBox())!, field = (await textarea.boundingBox())!, action = (await page.locator("#send").boundingBox())!;
    assert.ok(action.y >= field.y + field.height, "the action sits below the text");
    assert.ok(action.x >= frame.x && action.x + action.width <= frame.x + frame.width, "the action stays inside the frame");
    await group.locator(".action").click({ position: { x: 2, y: 2 } });
    assert.equal(await textarea.evaluate(element => element === document.activeElement), true, "a press around the action focuses the textarea");
    const focusShadow = await group.evaluate(element => getComputedStyle(element).boxShadow);
    assert.notEqual(focusShadow, "none");
    await textarea.evaluate(element => element.setAttribute("aria-invalid", "true"));
    assert.notEqual(await group.evaluate(element => getComputedStyle(element).boxShadow), focusShadow, "invalid focus reaches the frame");
    await page.emulateMedia({ forcedColors: "active" });
    assert.equal(await group.evaluate(element => getComputedStyle(element).outlineStyle), "solid");
    await page.emulateMedia({ forcedColors: "none" });
    await textarea.evaluate(element => { element.removeAttribute("aria-invalid"); (element as HTMLTextAreaElement).disabled = true; });
    assert.equal(await group.evaluate(element => getComputedStyle(element).cursor), "not-allowed");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.close();
  });

  it("put an input group's action at its end, inside its border, at the field's height", async () => {
    const path = await bundle("vue-input-group-action", `
      import { createApp, h } from "vue";
      import { Button, Input, InputGroup } from "@threadlabs/looma/vue";
      createApp({
        render: () => [
          h(InputGroup, { id: "plain" }, { default: () => h(Input, { "aria-label": "Site" }), suffix: () => ".example.com" }),
          h(InputGroup, { id: "with-action" }, {
            default: () => h(Input, { "aria-label": "Site" }),
            suffix: () => ".example.com",
            action: () => h(Button, { id: "go", size: "sm", variant: "solid" }, () => "Continue"),
          }),
        ],
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const box = (selector: string) => page.locator(selector).evaluate((element) => element.getBoundingClientRect().toJSON());
    const plain = await box("#plain");
    const group = await box("#with-action");
    const button = await box("#go");
    assert.equal(group.height, plain.height, "a small action keeps the field's height");
    assert.ok(button.right <= group.right && button.right > group.right - 8, "the action sits at the end, inside the border");
    // Focusing the action does not light the field's focus ring; focusing the input does.
    const shadow = (selector: string) => page.locator(selector).evaluate((element) => getComputedStyle(element).boxShadow);
    const resting = await shadow("#with-action");
    await page.locator("#go").focus();
    assert.equal(await shadow("#with-action"), resting, "a focused action leaves the field's ring off");
    await page.locator("#with-action input").focus();
    assert.notEqual(await shadow("#with-action"), resting, "a focused input lights it");
    await page.close();
  });

  it("ring an active avatar, and not another", async () => {
    const path = await bundle("vue-avatar-active", `
      import { createApp, h } from "vue";
      import { Avatar, AvatarGroup } from "@threadlabs/looma/vue";
      createApp({
        render: () => [h(AvatarGroup, { label: "On this page" }, () => [
          h(Avatar, { id: "editing", name: "Ada Lovelace", alt: "Ada Lovelace, editing", active: true }),
          h(Avatar, { id: "viewing", name: "Grace Hopper", size: "sm" }),
        ]), h(AvatarGroup, { id: "small", label: "Small", size: "sm", max: 1 }, () => [
          h(Avatar, { id: "small-first", name: "Ada Lovelace", size: "sm" }),
          h(Avatar, { id: "small-second", name: "Grace Hopper", size: "sm" }),
        ])],
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const outline = (id: string) => page.locator(`#${id}`).evaluate((element) => getComputedStyle(element).outlineStyle);
    assert.equal(await outline("editing"), "solid");
    assert.equal(await outline("viewing"), "none");
    assert.equal(await page.locator("#editing").getAttribute("aria-label"), "Ada Lovelace, editing");
    const width = (id: string) => page.locator(`#${id}`).evaluate((element) => element.getBoundingClientRect().width);
    assert.ok(await width("viewing") < await width("editing"), "sm is smaller than md");
    // A small group's +N badge is as small as its avatars.
    const badge = await page.locator("#small").getByRole("img", { name: "1 more" }).evaluate((element) => element.getBoundingClientRect().width);
    assert.equal(Math.round(badge), Math.round(await width("small-first")));
    await page.close();
  });

  it("render, style, and behave with no HTML Next runtime", async () => {
    const path = await bundle("vue-app", `
      import { createApp, h, ref } from "vue";
      import { Button, Checkbox, Tabs, Combobox, Callout, Stack, Input, trackInputModality } from "@threadlabs/looma/vue";
      trackInputModality(document);
      const checked = ref(false);
      const name = ref("Ada");
      window.name_ = name;
      const changes = [];
      window.changes = changes;
      createApp({
        render: () => h(Stack, { gap: "s" }, () => [
          h(Button, { id: "save", variant: "solid", class: "consumer" }, () => "Save"),
          h(Checkbox, { id: "agree", checked: checked.value, onChange: (event) => changes.push(event.detail) }, () => "Agree"),
          h(Tabs, { id: "tabs", label: "Views" }, () => [
            h("section", { "aria-label": "One" }, "First"),
            h("section", { "aria-label": "Two" }, "Second"),
          ]),
          h(Combobox, { id: "fruit", label: "Fruit" }, () => [
            h("option", { value: "apple" }, "Apple"),
            h("option", { value: "pear" }, "Pear"),
          ]),
          h(Callout, { tone: "warning" }, () => "Careful"),
          h(Input, { id: "name", modelValue: name.value, "onUpdate:modelValue": (value) => { name.value = value; } }),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);

    const button = page.locator("#save");
    assert.equal(await button.evaluate((element) => element.localName), "button");
    assert.equal(await button.getAttribute("class"), "consumer");
    assert.equal(await button.getAttribute("data-component"), "ui-button");
    // The state's tokens, not their order: the order follows how the adapter applied them.
    assert.deepEqual(
      (await button.getAttribute("data-ui-button-state"))?.split(" ").toSorted(),
      ["align", "align=center", "shape", "shape=rounded", "size", "size=md", "tone", "tone=accent", "variant", "variant=solid"]
    );
    assert.notEqual(await button.evaluate((element) => getComputedStyle(element).backgroundColor), "rgba(0, 0, 0, 0)");
    assert.equal(await page.evaluate(() => "HtmlRuntime" in window), false);

    const modality = () => page.evaluate(() => document.documentElement.getAttribute("data-ui-input-modality"));
    assert.equal(await modality(), null);
    await page.evaluate(() => document.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "touch" })));
    assert.equal(await modality(), "touch");

    await page.locator("#agree input").click();
    assert.equal(await page.locator("#agree input").isChecked(), true);
    assert.deepEqual(await page.evaluate(() => (window as unknown as { changes: unknown[] }).changes), [
      { checked: true, value: "on", trigger: "pointer" },
    ]);

    const tabs = page.locator('#tabs [role="tab"]');
    assert.deepEqual(await tabs.allTextContents(), ["One", "Two"]);
    await tabs.nth(1).click();
    assert.equal(await tabs.nth(1).getAttribute("aria-selected"), "true");
    assert.equal(await page.locator('#tabs section[aria-label="One"]').isHidden(), true);

    // v-model on a native form-control root.
    assert.equal(await page.locator("#name").inputValue(), "Ada");
    await page.locator("#name").fill("Grace");
    assert.equal(await page.evaluate(() => (window as unknown as { name_: { value: string } }).name_.value), "Grace");
    await page.evaluate(() => { (window as unknown as { name_: { value: string } }).name_.value = "Hopper"; });
    await page.waitForFunction(() => (document.querySelector("#name") as HTMLInputElement).value === "Hopper");

    await page.locator("#fruit input").click();
    await page.locator("#fruit input").fill("pe");
    const options = page.locator('#fruit [role="option"]');
    assert.deepEqual(await options.allTextContents(), ["Pear"]);
    await options.first().click();
    assert.equal(await page.locator("#fruit input").inputValue(), "Pear");
    await page.close();
  });
});

describe("Button layout", () => {
  it("lays content out from the start and stretches to its container when asked", async () => {
    const path = await bundle("vue-button-layout", `
      import { createApp, h } from "vue";
      import { Button } from "@threadlabs/looma/vue";
      createApp({
        render: () => h("div", { style: "inline-size: 300px" }, [
          h(Button, { id: "option", variant: "ghost", align: "start", stretch: true }, () => "New page"),
          h(Button, { id: "plain" }, () => "Save"),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const layout = (id: string) => page.locator(id).evaluate((element) => {
      const style = getComputedStyle(element);
      return { width: (element as HTMLElement).offsetWidth, justify: style.justifyContent, text: style.textAlign };
    });
    assert.deepEqual(await layout("#option"), { width: 300, justify: "flex-start", text: "start" });
    const plain = await layout("#plain");
    assert.ok(plain.width < 300, "a default button keeps its content width");
    assert.equal(plain.justify, "center");
    await page.close();
  });
});

// The look a link must share with its button: every variant at rest and hovered, and disabled.
const LOOK = ["display", "backgroundColor", "color", "borderColor", "boxShadow", "minHeight", "paddingTop", "paddingLeft",
  "textDecorationLine", "cursor"] as const;
const look = (page: Page, selector: string) => page.locator(selector).evaluate((element, keys) => {
  const style = getComputedStyle(element);
  return Object.fromEntries(keys.map((key) => [key, style[key as keyof CSSStyleDeclaration]]));
}, LOOK as unknown as string[]);

describe("Button as a link", () => {
  it("renders a real link that looks and responds exactly like the button", async () => {
    const variants = ["outline", "solid", "danger", "ghost", "link"];
    const path = await bundle("vue-button-link", `
      import { createApp, h } from "vue";
      import { Button } from "@threadlabs/looma/vue";
      const pair = (id, props) => [
        h(Button, { id: id + "-button", ...props }, () => "Go"),
        h(Button, { id: id + "-link", as: "a", href: "#next", ...props }, () => "Go"),
      ];
      createApp({
        render: () => h("div", [
          ${JSON.stringify(variants)}.flatMap((variant) => pair(variant, { variant })),
          ...pair("large", { size: "lg", tone: "success" }),
          ...pair("off", { variant: "solid", disabled: true }),
          ...pair("off-ghost", { variant: "ghost", disabled: true }),
          h(Button, { id: "new-tab", as: "a", href: "https://example.com/", target: "_blank", rel: "noreferrer" }, () => "Docs"),
          h(Button, { id: "submit", type: "submit" }, () => "Send"),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    // End states, not the transition between them.
    await page.addStyleTag({ content: "* { transition: none !important; }" });

    const link = page.locator("#solid-link");
    assert.equal(await link.evaluate((element) => element.localName), "a");
    assert.equal(await link.getAttribute("href"), "#next");
    assert.equal(await link.getAttribute("data-component"), "ui-button");
    for (const attribute of ["type", "disabled", "aria-disabled", "role"]) {
      assert.equal(await link.getAttribute(attribute), null, `a link carries no ${attribute}`);
    }
    assert.equal(await page.locator("#solid-button").getAttribute("type"), "button");
    assert.equal(await page.locator("#submit").getAttribute("type"), "submit");
    assert.equal(await page.locator("#new-tab").getAttribute("target"), "_blank");
    assert.equal(await page.locator("#new-tab").getAttribute("rel"), "noreferrer");

    for (const id of [...variants, "large"]) {
      assert.deepEqual(await look(page, `#${id}-link`), await look(page, `#${id}-button`), `${id} at rest`);
      await page.hover(`#${id}-button`);
      const hovered = await look(page, `#${id}-button`);
      await page.hover(`#${id}-link`);
      assert.deepEqual(await look(page, `#${id}-link`), hovered, `${id} hovered`);
    }
    assert.equal((await look(page, "#outline-link")).textDecorationLine, "none");
    assert.equal((await look(page, "#link-link")).textDecorationLine, "underline");

    // A disabled link cannot be followed or focused; it says so, and it looks like a disabled button.
    const off = page.locator("#off-link");
    assert.equal(await off.getAttribute("href"), null);
    assert.equal(await off.getAttribute("aria-disabled"), "true");
    assert.equal(await off.getAttribute("disabled"), null);
    assert.equal(await page.locator("#off-button").getAttribute("aria-disabled"), null);
    for (const id of ["off", "off-ghost"]) {
      await page.hover(`#${id}-button`, { force: true });
      const disabled = await look(page, `#${id}-button`);
      await page.hover(`#${id}-link`);
      assert.deepEqual(await look(page, `#${id}-link`), disabled, `${id} disabled`);
    }

    await page.focus("#solid-button");
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "solid-link");
    assert.equal(await link.evaluate((element) => element.matches(":focus-visible")), true);
    assert.match((await look(page, "#solid-link")).boxShadow, /,/, "the focus halo layers on the shadow");
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => location.hash === "#next");
    await page.close();
  });

  it("lowers to a link from HTML", async () => {
    const path = await bundle("html-button-link", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-button id="button" variant="solid">Go</ui-button>
      <ui-button id="link" as="a" href="#next" variant="solid">Go</ui-button>
      <ui-button id="off" as="a" href="#next" variant="solid" disabled>Go</ui-button>
      <ui-button id="submit" type="submit">Send</ui-button>
    `, [join(root, "tokens.css")]);
    await page.waitForSelector('#off[data-component="ui-button"]');
    assert.equal(await page.locator("#link").evaluate((element) => element.localName), "a");
    assert.equal(await page.locator("#link").getAttribute("href"), "#next");
    assert.equal(await page.locator("#link").getAttribute("type"), null);
    assert.deepEqual(await look(page, "#link"), await look(page, "#button"));
    assert.equal(await page.locator("#off").getAttribute("href"), null);
    assert.equal(await page.locator("#off").getAttribute("aria-disabled"), "true");
    assert.equal(await page.locator("#button").getAttribute("type"), "button");
    assert.equal(await page.locator("#submit").getAttribute("type"), "submit");
    await page.close();
  });
});

describe("Badge shape", () => {
  it("draws a tag flat at the start and pointed at the end, leaving the pill as it was", async () => {
    const path = await bundle("html-badge-shape", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-badge id="pill">Pill</ui-badge>
      <ui-badge id="tag" shape="tag">Tag</ui-badge>
      <ui-badge id="rtl" shape="tag" dir="rtl">Tag</ui-badge>
    `, [join(root, "tokens.css")]);
    await page.waitForSelector('#rtl[data-component="ui-badge"]');
    const shape = (selector: string) => page.locator(selector).evaluate((element) => {
      const style = getComputedStyle(element);
      return { clip: style.clipPath, radius: style.borderTopLeftRadius, border: style.borderTopColor, end: style.paddingInlineEnd, start: style.paddingInlineStart };
    });
    const pill = await shape("#pill"), tag = await shape("#tag"), rtl = await shape("#rtl");
    assert.equal(pill.clip, "none");
    assert.notEqual(pill.radius, "0px");
    assert.match(tag.clip, /^polygon\(/);
    assert.equal(tag.radius, "0px");
    assert.equal(tag.border, "rgba(0, 0, 0, 0)");
    // The point takes room of its own, so the label never runs into it.
    assert.ok(parseFloat(tag.end) > parseFloat(tag.start));
    assert.ok(parseFloat(rtl.start) > parseFloat(rtl.end));
    assert.notEqual(rtl.clip, tag.clip);
    await page.close();
  });

  it("keeps an outline around pill and pointed tag shapes in light, dark, and forced colours", async () => {
    const path = await bundle("html-badge-outline", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-badge id="pill" variant="outline" tone="danger">Danger</ui-badge>
      <ui-badge id="tag" variant="outline" shape="tag" tone="danger">Danger</ui-badge>
      <ui-badge id="rtl" variant="outline" shape="tag" tone="danger" dir="rtl">Danger</ui-badge>
      ${["neutral", "accent", "info", "success", "warning", "danger"].map((tone) => `<ui-badge id="tone-${tone}" variant="outline" tone="${tone}">${tone}</ui-badge>`).join("")}
    `, [join(root, "tokens.css"), join(root, "theme-light.css"), join(root, "theme-dark.css"), join(root, "theme-high-contrast.css")]);
    const paint = (selector: string) => page.locator(selector).evaluate((element) => ({
      border: getComputedStyle(element).borderTopColor,
      outer: getComputedStyle(element).backgroundColor,
      inner: getComputedStyle(element, "::before").backgroundColor,
      innerClip: getComputedStyle(element, "::before").clipPath,
    }));
    for (const theme of ["light", "dark", "high contrast"]) {
      await page.evaluate((value) => {
        document.documentElement.removeAttribute("data-theme");
        document.documentElement.removeAttribute("data-contrast");
        document.documentElement.setAttribute(value === "high contrast" ? "data-contrast" : "data-theme", value === "high contrast" ? "high" : value);
      }, theme);
      const pill = await paint("#pill");
      const tag = await paint("#tag");
      const rtl = await paint("#rtl");
      assert.notEqual(pill.border, pill.outer, `${theme}: pill draws an outline`);
      assert.equal(tag.outer, pill.border, `${theme}: tag's outer shape uses the border colour`);
      assert.equal(tag.inner, pill.outer, `${theme}: tag's inner shape uses the surface colour`);
      assert.notEqual(tag.innerClip, rtl.innerClip, `${theme}: the pointed inner edge mirrors in RTL`);
      const ratios = await page.evaluate(() => {
        const context = document.createElement("canvas").getContext("2d")!;
        const luminance = (colour: string) => {
          context.clearRect(0, 0, 1, 1);
          context.fillStyle = colour;
          context.fillRect(0, 0, 1, 1);
          const channels = [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)].map((value) => {
            const channel = value / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
        };
        return ["neutral", "accent", "info", "success", "warning", "danger"].map((tone) => {
          const style = getComputedStyle(document.getElementById(`tone-${tone}`)!);
          const [bright, dim] = [luminance(style.color), luminance(style.backgroundColor)].sort((a, b) => b - a);
          return { tone, ratio: (bright! + 0.05) / (dim! + 0.05) };
        });
      });
      for (const { tone, ratio } of ratios) assert.ok(ratio >= 4.5, `${theme}: ${tone} outline text is ${ratio.toFixed(2)}:1`);
    }
    await page.emulateMedia({ forcedColors: "active" });
    const pill = await paint("#pill"), tag = await paint("#tag");
    assert.notEqual(pill.border, pill.outer, "forced colours: pill keeps an edge");
    assert.notEqual(tag.outer, tag.inner, "forced colours: tag keeps its pointed edge");
    await page.close();
  });
});

describe("Badge colour", () => {
  // --ui-badge-color derives a wash and an ink from one colour: it beats the tone, the explicit hooks
  // beat it, and its text keeps 4.5:1 for any hue in every variant and theme.
  const hues = { teal: "teal", violet: "#7c3aed", amber: "#f59e0b", paleYellow: "#fef9c3", black: "black", white: "white" };
  const variants = ["subtle", "solid", "outline"];

  it("overrides the tone, yields to explicit hooks, and keeps text contrast", async () => {
    const path = await bundle("html-badge-color", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-badge id="tone" tone="danger">Tone</ui-badge>
      <ui-badge id="neutral">Plain</ui-badge>
      <ui-badge id="coloured" tone="danger" style="--ui-badge-color: teal">Coloured</ui-badge>
      <ui-badge id="explicit" tone="danger" style="--ui-badge-color: teal; --ui-badge-surface: rgb(1, 2, 3); --ui-badge-text: rgb(4, 5, 6); --ui-badge-border: rgb(7, 8, 9)">Explicit</ui-badge>
      <div style="--ui-badge-color: teal"><ui-badge id="nested">Nested</ui-badge></div>
      ${Object.entries(hues).flatMap(([name, hue]) => variants.map((variant) =>
        `<ui-badge id="${name}-${variant}" class="hue" variant="${variant}" style="--ui-badge-color: ${hue}">${name}</ui-badge>`)).join("")}
    `, [join(root, "tokens.css"), join(root, "theme-light.css"), join(root, "theme-dark.css")]);
    await page.waitForSelector('#explicit[data-component~="ui-badge"]');
    const paint = (selector: string) => page.locator(selector).evaluate((element) => {
      const style = getComputedStyle(element);
      return { surface: style.backgroundColor, text: style.color, border: style.borderTopColor };
    });
    const tone = await paint("#tone"), coloured = await paint("#coloured");
    assert.notEqual(coloured.surface, tone.surface, "the colour replaces the tone's surface");
    assert.notEqual(coloured.text, tone.text, "the colour replaces the tone's text");
    assert.notEqual(coloured.border, coloured.surface, "a coloured subtle badge has a stronger edge than its fill");
    assert.deepEqual(await paint("#explicit"), { surface: "rgb(1, 2, 3)", text: "rgb(4, 5, 6)", border: "rgb(7, 8, 9)" });
    assert.deepEqual(await paint("#nested"), await paint("#neutral"), "the hook styles only the badge it is set on");

    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => document.documentElement.setAttribute("data-theme", value), theme);
      const ratios = await page.locator(".hue").evaluateAll((badges) => {
        const context = document.createElement("canvas").getContext("2d")!;
        const luminance = (colour: string) => {
          context.clearRect(0, 0, 1, 1);
          context.fillStyle = colour;
          context.fillRect(0, 0, 1, 1);
          const channels = [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)].map((value) => {
            const channel = value / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
        };
        return badges.map((badge) => {
          const style = getComputedStyle(badge);
          const [bright, dim] = [luminance(style.color), luminance(style.backgroundColor)].sort((a, b) => b - a);
          return { badge: badge.id, ratio: (bright! + 0.05) / (dim! + 0.05) };
        });
      });
      assert.equal(ratios.length, Object.keys(hues).length * variants.length);
      for (const { badge, ratio } of ratios) assert.ok(ratio >= 4.5, `${theme}: ${badge} text is ${ratio.toFixed(2)}:1`);
    }

    await page.emulateMedia({ forcedColors: "active" });
    const forced = await paint("#coloured");
    assert.notEqual(forced.border, forced.surface, "forced colours draw a coloured badge's edge");
    await page.close();
  });
});

describe("Badge box", () => {
  const tones = ["neutral", "accent", "info", "success", "warning", "danger"];
  const variants = ["subtle", "solid"];

  // Sizes to its label in a plain block (a table cell), as in a flex row. Subtle variants have a
  // distinct edge; solid variants carry their fill to the edge. Forced colors draw every edge.
  async function checkBadges(page: Page) {
    await page.waitForSelector('#flex [data-component~="ui-badge"]');
    const compact = await page.locator('#compact [data-component~="ui-badge"]').boundingBox();
    assert.ok(compact && compact.height <= 18 && compact.width <= 18, `compact count badge is ${JSON.stringify(compact)}`);
    const width = (selector: string) => page.locator(selector).evaluate((element) => element.getBoundingClientRect().width);
    const sizes = async () => {
      const block = await width('#block [data-component~="ui-badge"]');
      assert.ok(block < 200, `a badge in a 400px block is ${block}px wide`);
      assert.ok(Math.abs(block - await width('#flex [data-component~="ui-badge"]')) < 0.5, "a badge in a block is as wide as in a flex row");
      // max-width: 100% still caps a long label (the host is content-box, so padding sits outside it).
      assert.equal(await page.locator('#narrow [data-component~="ui-badge"]').evaluate((element) => getComputedStyle(element).width), "60px");
    };
    assert.equal(await page.evaluate(() => CSS.supports("text-box-trim: trim-both")), true);
    await sizes();

    const edges = () => page.locator('#tones [data-component~="ui-badge"]').evaluateAll((elements) => elements.map((element) => {
      const style = getComputedStyle(element);
      const badge = element.getAttribute("data-ui-badge-state") ?? element.outerHTML;
      return { badge, border: style.borderTopColor, surface: style.backgroundColor };
    }));
    const drawn = await edges();
    assert.equal(drawn.length, tones.length * variants.length);
    for (const { badge, border, surface } of drawn) {
      if (badge.includes("variant=subtle") || badge.includes("tone=neutral")) assert.notEqual(border, surface, `${badge} has a defined edge`);
      else assert.equal(border, surface, `${badge} carries its solid fill to the edge`);
    }

    await page.emulateMedia({ forcedColors: "active" });
    for (const { badge, border, surface } of await edges()) {
      assert.notEqual(border, surface, `${badge} has no edge in forced colors`);
      assert.notEqual(border, "rgba(0, 0, 0, 0)", `${badge} has no edge in forced colors`);
    }
    await page.emulateMedia({ forcedColors: "none" });

    // A browser without text-box-trim skips the @supports block: drop it and measure again.
    await page.evaluate(() => {
      const drop = (list: CSSRuleList, remove: (index: number) => void) => {
        for (let index = list.length - 1; index >= 0; index -= 1) {
          const rule = list[index];
          if (rule instanceof CSSSupportsRule && rule.conditionText.includes("text-box-trim")) remove(index);
          else if (rule instanceof CSSGroupingRule) drop(rule.cssRules, (at) => rule.deleteRule(at));
          else if (rule instanceof CSSStyleRule && rule.cssRules.length) drop(rule.cssRules, (at) => rule.deleteRule(at));
        }
      };
      for (const sheet of [...document.styleSheets, ...document.adoptedStyleSheets]) drop(sheet.cssRules, (at) => sheet.deleteRule(at));
    });
    assert.notEqual(await page.locator('#block [data-component~="ui-badge"]').evaluate((element) => getComputedStyle(element).textBoxTrim), "trim-both");
    await sizes();
  }

  const body = (badge: (attributes: string, label: string) => string) => `
    <div id="compact">${badge('size="xs" variant="solid" tone="warning"', "1")}</div>
    <div id="block" style="width: 400px">${badge("", "Open")}</div>
    <div id="flex" style="display: flex; width: 400px">${badge("", "Open")}</div>
    <div id="narrow" style="width: 60px">${badge("", "A label longer than its container")}</div>
    <div id="tones">${variants.flatMap((variant) => tones.map((tone) => badge(`variant="${variant}" tone="${tone}"`, tone))).join("")}</div>`;

  it("spaces and centers ordinary SVG plus text children in badges and buttons", async () => {
    const icon = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4 10-10" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
    for (const adapter of ["html", "vue"]) {
      const path = await bundle(`${adapter}-ordinary-icon-text`, adapter === "html" ? `import "@threadlabs/looma";` : `
        import { createApp, h } from "vue";
        import { Badge, Button } from "@threadlabs/looma/vue";
        const icon = () => h("svg", { width: 16, height: 16, viewBox: "0 0 24 24", "aria-hidden": "true" }, [h("path", { d: "m5 12 4 4 10-10", fill: "none", stroke: "currentColor", "stroke-width": 2 })]);
        createApp({ render: () => [h(Badge, { id: "ordinary-badge" }, () => [icon(), "Ready"]), h(Button, { id: "ordinary-button" }, () => [icon(), "Save"]), h(Badge, { id: "ordinary-square", shape: "square" }, () => icon()), h(Badge, { id: "slot-square", shape: "square" }, { icon })] }).mount("#app");
      `);
      const page = await open(path, adapter === "html" ? `<ui-badge id="ordinary-badge">${icon}Ready</ui-badge><ui-button id="ordinary-button">${icon}Save</ui-button><ui-badge id="ordinary-square" shape="square">${icon}</ui-badge><ui-badge id="slot-square" shape="square">${icon.replace('<svg', '<svg slot="icon"')}</ui-badge>` : '<div id="app"></div>', [join(root, "tokens.css"), ...(adapter === "vue" ? [join(root, "vue/components.css")] : [])]);
      await page.waitForSelector('[data-component~="ui-badge"]');
      for (const width of [1280, 375]) {
        await page.setViewportSize({ width, height: 720 });
        for (const id of ['ordinary-badge', 'ordinary-button']) {
          const geometry = await page.locator(`#${id}`).evaluate(element => {
            const label = element.querySelector('.label') ?? element;
            const text = [...label.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())!;
            const range = document.createRange(); range.selectNodeContents(text);
            const word = range.getBoundingClientRect(), icon = element.querySelector('svg')!.getBoundingClientRect(), clip = label.getBoundingClientRect();
            return { alignment: Math.abs((word.top + word.bottom) / 2 - (icon.top + icon.bottom) / 2), gap: word.left - icon.right, top: icon.top - clip.top, bottom: clip.bottom - icon.bottom };
          });
          assert.ok(geometry.alignment <= 2, `${adapter}/${width}/${id}: ordinary icon aligns with text: ${JSON.stringify(geometry)}`);
          assert.ok(geometry.gap >= 3, `${adapter}/${width}/${id}: ordinary icon has spacing: ${JSON.stringify(geometry)}`);
          assert.ok(geometry.top >= -1 && geometry.bottom >= -1, `${adapter}/${width}/${id}: ordinary icon is fully visible: ${JSON.stringify(geometry)}`);
        }
        for (const id of ['ordinary-square', 'slot-square']) {
          const centering = await page.locator(`#${id}`).evaluate(element => {
            const icon = element.querySelector('svg')!.getBoundingClientRect(), badge = element.getBoundingClientRect();
            return { x: Math.abs((icon.left + icon.right - badge.left - badge.right) / 2), y: Math.abs((icon.top + icon.bottom - badge.top - badge.bottom) / 2) };
          });
          assert.ok(centering.x < 1 && centering.y < 1, `${adapter}/${width}/${id}: an icon without text is centered: ${JSON.stringify(centering)}`);
        }
      }
      await page.close();
    }
  });

  it("keeps an icon centered and unclipped beside chip text in HTML and Vue", async () => {
    const svg = '<svg slot="icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4 10-10" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
    for (const adapter of ["html", "vue"]) {
      const path = await bundle(`${adapter}-badge-icon-label`, adapter === "html" ? `import "@threadlabs/looma";` : `
        import { createApp, h } from "vue";
        import { Badge } from "@threadlabs/looma/vue";
        createApp({ render: () => h(Badge, { id: "chip", tone: "success" }, { icon: () => h("svg", { width: 16, height: 16, viewBox: "0 0 24 24", "aria-hidden": "true" }, [h("path", { d: "m5 12 4 4 10-10", fill: "none", stroke: "currentColor", "stroke-width": 2 })]), default: () => "Yes" }) }).mount("#app");
      `);
      const page = await open(path, adapter === "html" ? `<ui-badge id="chip" tone="success">${svg} Yes</ui-badge>` : '<div id="app"></div>', [join(root, "tokens.css"), ...(adapter === "vue" ? [join(root, "vue/components.css")] : [])]);
      await page.waitForSelector('#chip[data-component~="ui-badge"]');
      for (const width of [1280, 375]) {
        await page.setViewportSize({ width, height: 720 });
        const geometry = await page.locator('#chip').evaluate(element => {
          const label = element.querySelector('.label')!;
          const word = label.getBoundingClientRect(), icon = element.querySelector('svg')!.getBoundingClientRect(), clip = element.getBoundingClientRect();
          return { alignment: Math.abs((word.top + word.bottom) / 2 - (icon.top + icon.bottom) / 2), iconTop: icon.top, iconBottom: icon.bottom, clipTop: clip.top, clipBottom: clip.bottom, gap: word.left - icon.right };
        });
        assert.ok(geometry.alignment <= 2, `${adapter}: icon and text share a center: ${JSON.stringify(geometry)}`);
        assert.ok(geometry.iconTop >= geometry.clipTop - 1 && geometry.iconBottom <= geometry.clipBottom + 1, `${adapter}: icon is not clipped: ${JSON.stringify(geometry)}`);
        assert.ok(geometry.gap >= 3, `${adapter}: icon has visible separation from text: ${JSON.stringify(geometry)}`);
        const constrained = await page.locator('#chip').evaluate(element => {
          const label = element.querySelector('.label')!;
          label.textContent = 'A long label with descenders gjpqy';
          (element as HTMLElement).style.maxWidth = '110px';
          const icon = element.querySelector('svg')!.getBoundingClientRect(), chip = element.getBoundingClientRect();
          const result = { clipped: label.scrollWidth > label.clientWidth, overflow: getComputedStyle(label).textOverflow, visible: icon.left >= chip.left && icon.right <= chip.right && icon.top >= chip.top && icon.bottom <= chip.bottom };
          label.textContent = 'Yes'; (element as HTMLElement).style.maxWidth = '';
          return result;
        });
        assert.equal(constrained.clipped, true);
        assert.equal(constrained.overflow, 'ellipsis');
        assert.equal(constrained.visible, true, 'only the label truncates; the leading icon stays whole');
      }
      await page.close();
    }
  });


  it("sizes to its label and shades subtle edges in every tone, in HTML", async () => {
    const path = await bundle("html-badge-box", `import "@threadlabs/looma";`);
    const page = await open(path, body((attributes, label) => `<ui-badge ${attributes}>${label}</ui-badge>`), [join(root, "tokens.css")]);
    await checkBadges(page);
    await page.close();
  });

  it("sizes to its label and shades subtle edges in every tone, in Vue", async () => {
    const path = await bundle("vue-badge-box", `
      import { createApp, h } from "vue";
      import { Badge } from "@threadlabs/looma/vue";
      const tones = ${JSON.stringify(tones)}, variants = ${JSON.stringify(variants)};
      createApp({ render: () => [
        h("div", { id: "compact" }, [h(Badge, { size: "xs", variant: "solid", tone: "warning" }, () => "1")]),
        h("div", { id: "block", style: "width: 400px" }, [h(Badge, null, () => "Open")]),
        h("div", { id: "flex", style: "display: flex; width: 400px" }, [h(Badge, null, () => "Open")]),
        h("div", { id: "narrow", style: "width: 60px" }, [h(Badge, null, () => "A label longer than its container")]),
        h("div", { id: "tones" }, variants.flatMap((variant) => tones.map((tone) => h(Badge, { variant, tone }, () => tone)))),
      ] }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await checkBadges(page);
    await page.close();
  });
});

describe("Combobox validation message", () => {
  it("shows its validation message in HTML, not only in Vue", async () => {
    const path = await bundle("html-combobox-validation", `import "@threadlabs/looma";`);
    const page = await open(path, `<ui-combobox id="fruit" label="Fruit" required></ui-combobox>`, [join(root, "tokens.css")]);
    await page.waitForSelector('#fruit[data-component~="ui-combobox"]');
    assert.equal(await page.locator('#fruit input[role="combobox"]').evaluate((input) => {
      (input as HTMLInputElement).focus();
      return input.ownerDocument.activeElement === input;
    }), true);
    const validation = await page.locator("#fruit").evaluate((element) => new Promise<{ status: string }>((resolve) => {
      const onValidation = (event: Event) => {
        const detail = (event as CustomEvent<{ status: string }>).detail;
        if (detail.status === "pending") return;
        element.removeEventListener("validation-change", onValidation);
        resolve(detail);
      };
      element.addEventListener("validation-change", onValidation);
      element.dispatchEvent(new CommandEvent("command", { command: "--validate" }));
    }));
    assert.equal(validation.status, "error");
    const message = page.locator("#fruit [id$=\"-validation\"]");
    await message.waitFor({ state: "visible" });
    assert.match((await message.textContent()) ?? "", /A value is required/);
    await page.close();
  });
});

// Whether each edge of a scroller shows the shared scroll fade: "1" while that edge hides content.
function scrollFades(page: Page, selector: string) {
  return page.locator(selector).evaluate((element) => {
    const style = getComputedStyle(element);
    const on = (name: string) => (parseFloat(style.getPropertyValue(name)) > 0 ? "1" : "0");
    return { start: on("--_ui-scroll-fade-start"), end: on("--_ui-scroll-fade-end") };
  });
}

describe("Scroll area", () => {
  it("trims only projected edge margins when requested in HTML and Vue", async () => {
    for (const adapter of ["html", "vue"]) {
      const path = await bundle(`${adapter}-scroll-area-trim`, adapter === "html" ? `import "@threadlabs/looma";` : `
        import { createApp, h } from "vue";
        import { ScrollArea } from "@threadlabs/looma/vue";
        createApp({ render: () => [false, true].map(trim => h(ScrollArea, { id: trim ? "trimmed" : "default", trim },
          () => [h("p", "First"), h("section", [h("p", "Nested")]), h("p", "Last")])) }).mount("#app");
      `);
      const content = '<p>First</p><section><p>Nested</p></section><p>Last</p>';
      const page = await open(path, adapter === "html" ? `<ui-scroll-area id="default">${content}</ui-scroll-area><ui-scroll-area id="trimmed" trim>${content}</ui-scroll-area>` : '<div id="app"></div>',
        [join(root, "tokens.css"), ...(adapter === "vue" ? [join(root, "vue/components.css")] : [])]);
      await page.addStyleTag({ content: "p { margin-block: 20px }" });
      const margins = async (id: string) => page.locator(`#${id} p`).evaluateAll(elements => elements.map(element => {
        const style = getComputedStyle(element);
        return [parseFloat(style.marginTop), parseFloat(style.marginBottom)];
      }));
      assert.deepEqual(await margins("default"), [[20, 20], [20, 20], [20, 20]], "default scroll areas preserve authored margins");
      assert.deepEqual(await margins("trimmed"), [[0, 20], [20, 20], [20, 0]], "trim removes only the outside margins, preserving nested content");
      await page.close();
    }
  });

  const items = Array.from({ length: 30 }, (_, index) => `<p>Item ${index}</p>`).join("");
  const settle = (page: Page) => page.waitForTimeout(250);

  async function checkFades(page: Page) {
    const area = page.locator("#area");
    await area.waitFor();
    await settle(page);
    assert.equal(await area.evaluate((element) => getComputedStyle(element).overflowY), "auto");
    assert.deepEqual(await scrollFades(page, "#area"), { start: "0", end: "1" }, "only the end hides content at first");
    assert.notEqual(await area.evaluate((element) => getComputedStyle(element).maskImage), "none");

    await area.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await settle(page);
    assert.deepEqual(await scrollFades(page, "#area"), { start: "1", end: "0" }, "scrolled to the end, only the start hides content");

    await area.evaluate((element) => { element.scrollTop = (element.scrollHeight - element.clientHeight) / 2; });
    await settle(page);
    assert.deepEqual(await scrollFades(page, "#area"), { start: "1", end: "1" }, "in the middle, both edges hide content");

    await area.evaluate((element) => { (element as HTMLElement).style.height = "5000px"; });
    await settle(page);
    assert.deepEqual(await scrollFades(page, "#area"), { start: "0", end: "0" }, "content that fits shows no fade");
  }

  it("fades only the edges that hide content, in HTML", async () => {
    const path = await bundle("html-scroll-area", `import "@threadlabs/looma";`);
    const page = await open(path, `<ui-scroll-area id="area" style="height: 120px">${items}</ui-scroll-area>`, [join(root, "tokens.css")]);
    await page.waitForSelector('#area[data-component~="ui-scroll-area"]');
    await checkFades(page);
    await page.close();
  });

  it("fades only the edges that hide content, in Vue", async () => {
    const path = await bundle("vue-scroll-area", `
      import { createApp, h } from "vue";
      import { ScrollArea } from "@threadlabs/looma/vue";
      createApp({ render: () => h(ScrollArea, { id: "area", style: "height: 120px" },
        () => Array.from({ length: 30 }, (_, index) => h("p", "Item " + index))) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await checkFades(page);
    await page.close();
  });

  it("fades sideways, from the start edge, in a right-to-left horizontal area", async () => {
    const path = await bundle("html-scroll-area-rtl", `import "@threadlabs/looma";`);
    const page = await open(path, `<div dir="rtl"><ui-scroll-area id="area" orientation="horizontal" style="width: 200px"><p style="width: 2000px">Wide</p></ui-scroll-area></div>`, [join(root, "tokens.css")]);
    await page.waitForSelector('#area[data-component~="ui-scroll-area"]');
    await settle(page);
    assert.deepEqual(await scrollFades(page, "#area"), { start: "0", end: "1" });
    assert.match(await page.locator("#area").evaluate((element) => getComputedStyle(element).maskImage), /^linear-gradient\(to left/);
    await page.close();
  });
});

describe("Authoring warnings", () => {
  // Each case is a field with one mistake; #good and #wrapped are authored correctly.
  const html = `
    <ui-form-field><label slot="label" for="good">Good</label><ui-input id="good"></ui-input></ui-form-field>
    <ui-form-field><label slot="label">Wrapped <input id="wrapped"></label></ui-form-field>
    <ui-form-field><label slot="label" id="linked-label">Linked</label><ui-input></ui-input></ui-form-field>
    <ui-form-field><label slot="label" for="twice">Twice</label><ui-input id="twice"></ui-input></ui-form-field>
    <span id="twice"></span>
    <input id="elsewhere" aria-label="Elsewhere">
    <ui-form-field><label slot="label" for="elsewhere">Stray</label><ui-input id="stray"></ui-input></ui-form-field>
    <ui-input-group id="group"><ui-input id="site" aria-label="Site"></ui-input><span slot="suffix">.example.com</span></ui-input-group>`;

  async function warnings(mode: string): Promise<string[]> {
    const path = await bundle(`html-authoring-${mode}`, `import "@threadlabs/looma";`, mode);
    const page = await browser.newPage();
    const messages: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "warning" && message.text().startsWith("ui-")) messages.push(message.text());
    });
    await page.setContent(`<!doctype html><html><body>${html}</body></html>`);
    await page.addScriptTag({ path });
    // Wait for both controllers to have linked their fields.
    await page.waitForFunction(() => document.querySelector("#linked-label")?.hasAttribute("for") && document.querySelector("#site")?.hasAttribute("aria-describedby"));
    // A copy of a linked group keeps its affix's id.
    await page.evaluate(() => {
      const copy = document.querySelector("#group")!.cloneNode(true) as Element;
      copy.id = "copy";
      copy.querySelector("input")!.id = "copy-site";
      document.body.append(copy);
    });
    await page.waitForTimeout(200);
    await page.close();
    return messages.map((message) => message.split(",")[0]).sort();
  }

  it("say what a field worked around, once each, in development", async () => {
    assert.deepEqual(await warnings("development"), [
      "ui-form-field: the input's id \"twice\" is used by another element in the same document or shadow root",
      "ui-form-field: the label has no for",
      "ui-form-field: the label's for=\"elsewhere\" does not point at this field's input",
      "ui-input-group: the affix id \"ui-input-group-affix-1\" is used by another element in the same document or shadow root",
    ]);
  });

  it("say nothing in a production build", async () => {
    assert.deepEqual(await warnings("production"), []);
  });
});

describe("Input group", () => {
  async function checkGroup(page: Page) {
    const group = page.locator("#group");
    await group.waitFor();
    // The input inside is still the form's field, affixes and all.
    await page.locator("#site").fill("acme");
    assert.deepEqual(await page.locator("#form").evaluate((form) => [...new FormData(form as HTMLFormElement).entries()]), [["site", "acme"]]);
    // The group draws the frame and the focus ring; the input inside draws neither.
    const input = await page.locator("#site").evaluate((element) => ({ border: getComputedStyle(element).borderTopColor, shadow: getComputedStyle(element).boxShadow }));
    assert.equal(input.border, "rgba(0, 0, 0, 0)");
    assert.equal(input.shadow, "none");
    await page.locator("#site").focus();
    await page.waitForTimeout(200);
    assert.match(await group.evaluate((element) => getComputedStyle(element).boxShadow), /3px/);
    assert.equal(await page.locator("#group").getByText(".example.com").count(), 1);
    // An invalid input marks the whole group, not a second border inside it; its error is danger.
    await page.locator("#site").evaluate((element) => element.setAttribute("aria-invalid", "true"));
    await page.locator("#site").blur();
    await page.waitForTimeout(200);
    assert.equal(await page.locator("#site").evaluate((element) => getComputedStyle(element).borderTopColor), "rgba(0, 0, 0, 0)");
    const danger = await page.evaluate(() => { const probe = document.createElement("span"); probe.style.color = "var(--ui-danger-solid)"; document.body.append(probe); const color = getComputedStyle(probe).color; probe.remove(); return color; });
    assert.equal(await group.evaluate((element) => getComputedStyle(element).borderTopColor), danger);
  }

  it("frames an input and its affixes as one field, in HTML", async () => {
    const path = await bundle("html-input-group", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <form id="form">
        <ui-input-group id="group"><ui-input id="site" name="site"></ui-input><span slot="suffix">.example.com</span></ui-input-group>
      </form>`, [join(root, "tokens.css")]);
    await checkGroup(page);
    await page.close();
  });

  it("frames an input and its affixes as one field, in Vue", async () => {
    const path = await bundle("vue-input-group", `
      import { createApp, h } from "vue";
      import { Input, InputGroup } from "@threadlabs/looma/vue";
      createApp({ render: () => h("form", { id: "form" }, [
        h(InputGroup, { id: "group" }, { default: () => h(Input, { id: "site", name: "site" }), suffix: () => h("span", ".example.com") }),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await checkGroup(page);
    await page.close();
  });
});

describe("Multiline input group behavior", () => {
  for (const adapter of ["HTML", "Vue"] as const) {
    it(`reserves textarea text space for a top-end action in ${adapter}, including changing labels at narrow widths`, async () => {
      const source = adapter === "HTML" ? `import "@threadlabs/looma";` : `
        import { createApp, h, ref } from "vue";
        import { Button, InputGroup, Textarea } from "@threadlabs/looma/vue";
        const pending = ref(false);
        window.setPending = value => { pending.value = value; };
        createApp({ render: () => h(InputGroup, { id: "group", multiline: true, actionPosition: "top-end" }, {
          default: () => h(Textarea, { id: "message", rows: 4, "aria-label": "Message" }),
          action: () => h(Button, { id: "send", pending: pending.value }, () => "Send"),
        }) }).mount("#app");`;
      const path = await bundle(`top-end-${adapter}`, source);
      const page = await open(path, adapter === "HTML" ? `
        <ui-input-group id="group" multiline action-position="top-end">
          <ui-textarea id="message" rows="4" aria-label="Message"></ui-textarea>
          <ui-button id="send" slot="action">Send</ui-button>
        </ui-input-group>` : `<div id="app"></div>`, adapter === "HTML" ? [join(root, "tokens.css")] : [join(root, "tokens.css"), join(root, "vue/components.css")]);
      const field = page.getByRole("textbox", { name: "Message" }), send = page.locator("#send");
      for (const width of [800, 375, 240]) {
        await page.setViewportSize({ width, height: 812 });
        await field.fill("A long first line that must wrap before it reaches the action.\nAnother line.");
        for (const label of ["Send", "Send message", "En cours…"]) {
          await send.evaluate((element, text) => { element.textContent = text; }, label);
          await page.waitForTimeout(50);
          const textBox = (await field.boundingBox())!, action = (await send.boundingBox())!;
          assert.ok(action.y >= textBox.y && action.y < textBox.y + 16, "action is inside the textarea at its top");
          assert.ok(action.x >= textBox.x && action.x + action.width <= textBox.x + textBox.width, "action is inside its right edge");
          const padding = await field.evaluate(element => parseFloat(getComputedStyle(element).paddingRight));
          assert.ok(textBox.x + textBox.width - padding < action.x, "textarea text ends before the action");
          assert.ok(action.y + action.height < textBox.y + textBox.height - 16, "native bottom-right resize grip remains clear");
          assert.equal(await field.evaluate(element => getComputedStyle(element).resize), "vertical");
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        }
      }
      await page.evaluate(native => {
        if (native) document.querySelector("#send")!.setAttribute("pending", "");
        else (window as unknown as { setPending: (value: boolean) => void }).setPending(true);
      }, adapter === "HTML");
      await page.waitForTimeout(50);
      const pendingField = (await field.boundingBox())!, pendingAction = (await send.boundingBox())!;
      const pendingPadding = await field.evaluate(element => parseFloat(getComputedStyle(element).paddingRight));
      assert.ok(pendingField.x + pendingField.width - pendingPadding < pendingAction.x, "actual pending indicator has reserved space");
      await page.locator("#group").evaluate(element => element.setAttribute("dir", "rtl"));
      await page.waitForTimeout(50);
      const rtlField = (await field.boundingBox())!, rtlAction = (await send.boundingBox())!;
      const rtlPadding = await field.evaluate(element => parseFloat(getComputedStyle(element).paddingLeft));
      assert.ok(rtlField.x + rtlPadding > rtlAction.x + rtlAction.width, "logical end padding follows RTL placement");
      await page.locator("#group .action").evaluate(element => element.remove());
      await page.waitForTimeout(50);
      assert.ok(await field.evaluate(element => parseFloat(getComputedStyle(element).paddingLeft)) < 20, "removing the action restores normal text space");
      await field.focus();
      assert.notEqual(await page.locator("#group").evaluate(element => getComputedStyle(element).boxShadow), "none");
      await page.close();
    });
  }

  it("shares frame, labeling and native form behavior for a multiline HTML textarea at 375px", async () => {
    const path = await bundle("html-multiline-input-group", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <form id="form">
        <label for="message">Message</label>
        <ui-input-group id="multiline" multiline>
          <ui-textarea id="message" name="message" rows="3" value="A draft"></ui-textarea>
          <span slot="suffix">Plain text</span>
          <ui-button id="send" slot="action" type="submit">Send</ui-button>
        </ui-input-group>
      </form>
      <ui-textarea id="standalone" aria-label="Standalone"></ui-textarea>
    `, [join(root, "tokens.css")], { viewport: { width: 375, height: 812 } });
    await page.addStyleTag({ content: "* { transition: none !important; }" });
    const group = page.locator("#multiline"), textarea = page.getByRole("textbox", { name: "Message" });
    assert.equal(await textarea.evaluate(element => getComputedStyle(element).borderTopWidth), "0px");
    assert.notEqual(await page.getByRole("textbox", { name: "Standalone" }).evaluate(element => getComputedStyle(element).borderTopWidth), "0px", "standalone textarea framing is unchanged");
    const frame = (await group.boundingBox())!, field = (await textarea.boundingBox())!, action = (await page.locator("#send").boundingBox())!;
    assert.ok(action.y >= field.y + field.height);
    assert.ok(action.x >= frame.x && action.x + action.width <= frame.x + frame.width);
    await group.locator(".action").click({ position: { x: 2, y: 2 } });
    assert.equal(await textarea.evaluate(element => element === document.activeElement), true);
    assert.match(await textarea.getAttribute("aria-describedby") ?? "", /affix/);
    const focusShadow = await group.evaluate(element => getComputedStyle(element).boxShadow);
    assert.notEqual(focusShadow, "none");
    await textarea.fill("First line\nSecond line");
    assert.equal(await page.locator("#form").evaluate(element => new FormData(element as HTMLFormElement).get("message")), "First line\nSecond line");
    await page.locator("#form").evaluate(element => {
      element.addEventListener("submit", event => { event.preventDefault(); element.setAttribute("data-submitted", "true"); });
    });
    await page.getByRole("button", { name: "Send", exact: true }).click();
    assert.equal(await page.locator("#form").getAttribute("data-submitted"), "true");
    await textarea.focus();
    await textarea.evaluate(element => element.setAttribute("aria-invalid", "true"));
    assert.notEqual(await group.evaluate(element => getComputedStyle(element).boxShadow), focusShadow);
    await page.emulateMedia({ forcedColors: "active" });
    assert.equal(await group.evaluate(element => getComputedStyle(element).outlineStyle), "solid");
    await page.emulateMedia({ forcedColors: "none" });
    await textarea.evaluate(element => { element.removeAttribute("aria-invalid"); (element as HTMLTextAreaElement).disabled = true; });
    assert.equal(await group.evaluate(element => getComputedStyle(element).cursor), "not-allowed");
    assert.equal(await page.locator("#form").evaluate(element => new FormData(element as HTMLFormElement).has("message")), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.close();
  });
});

describe("Input group behavior", () => {
  const long = "a-value-long-enough-to-scroll-inside-a-narrow-field";
  // Each field is an Input in a group, bar #plain; ids name the inner inputs.
  const html = `
    <button id="before">Before</button>
    <form id="form">
      <label id="site-label" for="site">Website</label>
      <ui-input-group id="g-site"><span slot="prefix" class="prefix">https://</span><ui-input id="site" name="site" value="example.com" autocomplete="url" aria-describedby="site-hint" data-testid="site"></ui-input></ui-input-group>
      <p id="site-hint">Your public address.</p>
      <ui-input-group id="g-sub"><ui-input id="sub" name="sub" aria-label="Subdomain" required></ui-input><span slot="suffix" class="suffix">.example.com</span></ui-input-group>
      <ui-input-group id="g-both"><span slot="prefix" class="prefix">https://</span><ui-input id="both" name="both" aria-label="Both"></ui-input><span slot="suffix" class="suffix">.example.com</span></ui-input-group>
      <ui-input id="plain" name="plain" aria-label="Plain"></ui-input>
    </form>
    <ui-input-group id="g-invalid"><ui-input id="invalid" invalid aria-label="Invalid"></ui-input><span slot="suffix" class="suffix">.example.com</span></ui-input-group>
    <ui-input-group id="g-disabled"><ui-input id="disabled" disabled aria-label="Disabled"></ui-input><span slot="suffix" class="suffix">.example.com</span></ui-input-group>
    <ui-input-group id="g-readonly"><ui-input id="readonly" readonly value="fixed" aria-label="Read only"></ui-input><span slot="suffix" class="suffix">.example.com</span></ui-input-group>
    <ui-input id="plain-invalid" invalid aria-label="Plain invalid"></ui-input>
    <ui-input id="plain-disabled" disabled aria-label="Plain disabled"></ui-input>
    <ui-form-field id="field">
      <label slot="label">Workspace</label>
      <ui-input-group><ui-input id="ff" name="ff"></ui-input><span slot="suffix" class="suffix">.example.com</span></ui-input-group>
      <span slot="help">Letters and hyphens.</span>
    </ui-form-field>
    <div dir="rtl" style="width: 375px">
      <ui-input-group id="g-rtl"><span slot="prefix" class="prefix">https://</span><ui-input id="rtl" aria-label="RTL" value="${long}"></ui-input><span slot="suffix" class="suffix">.example.com</span></ui-input-group>
    </div>
    <ui-input-group><ui-input id="auto" aria-label="Autofocus" autofocus></ui-input><span slot="suffix" class="suffix">.example.com</span></ui-input-group>`;
  const vue = `
    import { createApp, h, ref } from "vue";
    import { FormField, Input, InputGroup } from "@threadlabs/looma/vue";
    const site = ref("example.com");
    const log = [];
    const siteRef = ref(null);
    Object.assign(window, { site, log, siteRef });
    // Affixes are slots: a prefix and a suffix span beside the Input.
    const affixes = ({ prefix, suffix }) => ({
      ...(prefix ? { prefix: () => h("span", { class: "prefix" }, prefix) } : {}),
      ...(suffix ? { suffix: () => h("span", { class: "suffix" }, suffix) } : {}),
    });
    const grouped = (id, text, input) => h(InputGroup, { id }, { default: () => h(Input, input), ...affixes(text) });
    createApp({
      render: () => [
        h("button", { id: "before" }, "Before"),
        h("form", { id: "form" }, [
          h("label", { id: "site-label", for: "site" }, "Website"),
          grouped("g-site", { prefix: "https://" }, {
            id: "site", name: "site", modelValue: site.value, "onUpdate:modelValue": (value) => { site.value = value; },
            autocomplete: "url", "aria-describedby": "site-hint", "data-testid": "site", ref: siteRef,
            onInput: () => log.push("input"), onBlur: () => log.push("blur"),
          }),
          h("p", { id: "site-hint" }, "Your public address."),
          grouped("g-sub", { suffix: ".example.com" }, { id: "sub", name: "sub", "aria-label": "Subdomain", required: true }),
          grouped("g-both", { prefix: "https://", suffix: ".example.com" }, { id: "both", name: "both", "aria-label": "Both" }),
          h(Input, { id: "plain", name: "plain", "aria-label": "Plain" }),
        ]),
        grouped("g-invalid", { suffix: ".example.com" }, { id: "invalid", invalid: true, "aria-label": "Invalid" }),
        grouped("g-disabled", { suffix: ".example.com" }, { id: "disabled", disabled: true, "aria-label": "Disabled" }),
        grouped("g-readonly", { suffix: ".example.com" }, { id: "readonly", readonly: true, value: "fixed", "aria-label": "Read only" }),
        h(Input, { id: "plain-invalid", invalid: true, "aria-label": "Plain invalid" }),
        h(Input, { id: "plain-disabled", disabled: true, "aria-label": "Plain disabled" }),
        h(FormField, { id: "field" }, {
          label: () => h("label", "Workspace"),
          default: () => grouped(undefined, { suffix: ".example.com" }, { id: "ff", name: "ff" }),
          help: () => h("span", "Letters and hyphens."),
        }),
        h("div", { dir: "rtl", style: "width: 375px" }, [
          grouped("g-rtl", { prefix: "https://", suffix: ".example.com" }, { id: "rtl", "aria-label": "RTL", value: ${JSON.stringify(long)} }),
        ]),
        grouped(undefined, { suffix: ".example.com" }, { id: "auto", "aria-label": "Autofocus", autofocus: true }),
      ],
    }).mount("#app");
  `;

  const style = (page: Page, selector: string, property: string) =>
    page.locator(selector).evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property);
  const active = (page: Page) => page.evaluate(() => document.activeElement?.id ?? "");
  const box = async (page: Page, selector: string) => (await page.locator(selector).boundingBox())!;
  const entries = (page: Page) => page.locator("#form").evaluate((form) =>
    Array.from(new FormData(form as HTMLFormElement), ([name, value]) => [name, String(value)]));

  // The accessibility tree Chromium gives assistive technology: each textbox's name and description.
  async function textboxes(page: Page) {
    const client = await page.context().newCDPSession(page);
    const { nodes } = await client.send("Accessibility.getFullAXTree");
    await client.detach();
    return Object.fromEntries(nodes
      .filter((node) => node.role?.value === "textbox" && !node.ignored)
      .map((node) => [String(node.name?.value ?? ""), String(node.description?.value ?? "")]));
  }

  async function checkInputGroup(page: Page) {
    await page.waitForFunction(() => document.querySelector("#ff")?.getAttribute("aria-describedby")?.split(" ").length === 2, undefined, { timeout: 3000 })
      .catch(async () => assert.fail(await page.locator("#field").evaluate((element) => element.outerHTML)));
    assert.equal(await active(page), "auto", "autofocus lands on the inner input");

    // Without an affix, Input is the bare native input it always was.
    assert.equal(await page.locator("#plain").evaluate((element) => `${element.localName} in ${element.parentElement?.id}`), "input in form");
    assert.equal(await style(page, "#plain", "border-top-width"), "1px");

    // One box: the group draws the Input's border, and the input inside draws none.
    assert.equal(await style(page, "#g-site", "border-top-width"), "1px");
    assert.equal(await style(page, "#g-site", "border-top-color"), await style(page, "#plain", "border-top-color"));
    assert.equal(await style(page, "#g-site", "border-radius"), await style(page, "#plain", "border-radius"));
    assert.equal(await style(page, "#g-site", "background-color"), await style(page, "#plain", "background-color"));
    assert.equal(await style(page, "#site", "background-color"), "rgba(0, 0, 0, 0)");
    assert.equal((await box(page, "#g-site")).height, (await box(page, "#plain")).height, "the group is an Input's height");

    // Attributes land on the inner input; FormData holds its value, never an affix.
    const site = page.locator("#site");
    assert.equal(await site.evaluate((element) => element.localName), "input");
    assert.equal(await site.getAttribute("autocomplete"), "url");
    assert.equal(await site.getAttribute("data-testid"), "site");
    assert.equal(await page.locator("#sub").evaluate((element) => (element as HTMLInputElement).required), true);
    assert.deepEqual(await entries(page), [["site", "example.com"], ["sub", ""], ["both", ""], ["plain", ""]]);
    await page.locator("#sub").fill("my-team");
    assert.deepEqual(await entries(page), [["site", "example.com"], ["sub", "my-team"], ["both", ""], ["plain", ""]]);

    // The name stays the label; the affix is the description, before the consumer's own and a Form Field's help.
    const tree = await textboxes(page);
    assert.equal(tree["Website"], "https:// Your public address.");
    assert.equal(tree["Subdomain"], ".example.com");
    assert.equal(tree["Both"], "https:// .example.com");
    assert.equal(tree["Workspace"], ".example.com Letters and hyphens.");
    assert.equal(tree["Plain"], "");
    assert.equal(await page.locator("#g-site .affix").first().getAttribute("aria-hidden"), "true");

    // Exactly one tab stop per field, the inner input, in DOM order both ways.
    assert.equal(await page.locator("[data-component~='ui-input-group'][tabindex], [data-component~='ui-input-group'] span[tabindex]").count(), 0);
    await page.locator("#before").focus();
    const forward = [];
    for (let step = 0; step < 4; step += 1) {
      await page.keyboard.press("Tab");
      forward.push(await active(page));
    }
    assert.deepEqual(forward, ["site", "sub", "both", "plain"]);
    const backward = [];
    for (let step = 0; step < 4; step += 1) {
      await page.keyboard.press("Shift+Tab");
      backward.push(await active(page));
    }
    assert.deepEqual(backward, ["both", "sub", "site", "before"]);

    // The ring is the plain Input's, shown when the inner input is focus-visible, by keyboard or pointer.
    await page.locator("#before").focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    assert.equal(await active(page), "plain");
    await page.waitForTimeout(250);
    const ring = { border: await style(page, "#plain", "border-top-color"), shadow: await style(page, "#plain", "box-shadow") };
    await page.locator("#site").click();
    await page.waitForTimeout(250);
    assert.deepEqual({ border: await style(page, "#g-site", "border-top-color"), shadow: await style(page, "#g-site", "box-shadow") }, ring);
    assert.equal(await style(page, "#site", "outline-style"), "none");
    await page.emulateMedia({ forcedColors: "active" });
    assert.equal(await style(page, "#g-site", "outline-style"), "solid");
    assert.equal(await style(page, "#g-site", "outline-width"), "2px");
    await page.locator("#plain").focus();
    assert.equal(await style(page, "#plain", "outline-style"), "solid");
    await page.emulateMedia({ forcedColors: "none" });

    // Hover matches the plain Input's.
    await page.locator("#before").focus();
    await page.locator("#plain").hover();
    await page.waitForTimeout(250);
    const hover = await style(page, "#plain", "border-top-color");
    await page.locator("#g-sub .suffix").hover();
    await page.waitForTimeout(250);
    assert.equal(await style(page, "#g-sub", "border-top-color"), hover);

    // A click on an affix focuses the input, selects nothing, and leaves a focused input's caret alone.
    await page.locator("#before").focus();
    await page.locator("#g-both .prefix").click();
    assert.equal(await active(page), "both");
    await page.locator("#both").fill("docs");
    await page.locator("#both").evaluate((input) => (input as HTMLInputElement).setSelectionRange(2, 2));
    await page.locator("#g-both .suffix").click();
    assert.equal(await active(page), "both");
    assert.deepEqual(await page.locator("#both").evaluate((input) => [(input as HTMLInputElement).selectionStart, (input as HTMLInputElement).selectionEnd]), [2, 2]);
    await page.locator("#g-both .suffix").dblclick();
    assert.equal(await page.evaluate(() => window.getSelection()?.toString() ?? ""), "");
    assert.equal(await page.locator("#both").inputValue(), "docs");
    await page.locator("#before").focus();
    await page.locator("#g-sub .suffix").tap();
    assert.equal(await active(page), "sub", "a tap focuses the input too");

    // Labels target the inner input, from outside and from a Form Field.
    await page.locator("#before").focus();
    await page.locator("#site-label").click();
    assert.equal(await active(page), "site");
    await page.locator("#field label").click();
    assert.equal(await active(page), "ff");
    await page.locator("#site").evaluate((input) => (input as HTMLInputElement).blur());
    await page.locator("#site").evaluate((input) => (input as HTMLInputElement).focus());
    assert.equal(await active(page), "site");

    // Paste and composed text act on the inner input.
    await page.locator("#sub").fill("");
    await page.locator("#plain").fill("pasted");
    await page.locator("#plain").selectText();
    await page.keyboard.press("ControlOrMeta+C");
    await page.locator("#plain").fill("");
    await page.locator("#sub").focus();
    await page.keyboard.press("ControlOrMeta+V");
    await page.keyboard.insertText("-text");
    assert.equal(await page.locator("#sub").inputValue(), "pasted-text");

    // Invalid, disabled, and read-only look and behave as a plain Input's.
    assert.equal(await style(page, "#g-invalid", "border-top-color"), await style(page, "#plain-invalid", "border-top-color"));
    assert.equal(await style(page, "#g-disabled", "background-color"), await style(page, "#plain-disabled", "background-color"));
    assert.equal(await style(page, "#g-disabled", "cursor"), "not-allowed");
    await page.locator("#before").focus();
    await page.locator("#g-disabled .suffix").click({ force: true });
    assert.equal(await active(page), "before");
    await page.locator("#g-readonly .suffix").click();
    assert.equal(await active(page), "readonly");
    await page.keyboard.type("x");
    assert.equal(await page.locator("#readonly").inputValue(), "fixed");

    // At 375px, right to left: the prefix leads on the right, both affixes stay in the box, and the
    // long value scrolls inside the input.
    const [group, prefix, input, suffix] = await Promise.all(
      ["#g-rtl", "#g-rtl .prefix", "#rtl", "#g-rtl .suffix"].map((selector) => box(page, selector)));
    assert.ok(prefix.x > input.x && input.x > suffix.x, "prefix, input, suffix run right to left");
    assert.ok(suffix.x >= group.x && prefix.x + prefix.width <= group.x + group.width, "the affixes stay in the box");
    assert.equal(group.width, 375);
    assert.ok(await page.locator("#rtl").evaluate((element) => element.scrollWidth > element.clientWidth), "the value scrolls");
  }

  const touch = { hasTouch: true };

  it("focuses, describes, and submits like a lone Input, in HTML", async () => {
    const path = await bundle("html-input-group-behavior", `import "@threadlabs/looma";`);
    const page = await open(path, html, [join(root, "tokens.css")], touch);
    await checkInputGroup(page);
    await page.close();
  });

  it("focuses, describes, and submits like a lone Input, in Vue", async () => {
    const path = await bundle("vue-input-group-behavior", vue);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")], touch);
    await checkInputGroup(page);

    // v-model, listeners, and a template ref reach the inner input.
    type Window = { site: { value: string }; log: string[]; siteRef: { value: { $el: HTMLInputElement } } };
    await page.locator("#site").fill("docs.example.com");
    await page.locator("#before").focus();
    assert.equal(await page.evaluate(() => (window as unknown as Window).site.value), "docs.example.com");
    assert.deepEqual([...new Set(await page.evaluate(() => (window as unknown as Window).log))].sort(), ["blur", "input"]);
    await page.evaluate(() => (window as unknown as Window).siteRef.value.$el.focus());
    assert.equal(await active(page), "site");
    await page.close();
  });
});


describe("Button touch target", () => {
  it("takes a press within the control minimum under touch, link-style and xs included", async () => {
    const path = await bundle("html-button-touch", `import "@threadlabs/looma";`);
    const page = await open(path, `<div style="padding: 80px"><ui-button id="see-all" variant="link" size="sm">See all activity</ui-button><ui-button id="boxed" variant="outline" size="sm">Tag</ui-button><p style="margin-top: 80px">Looked after by <ui-button id="pill" variant="ghost" size="xs" shape="pill">Grace</ui-button></p></div>`, [join(root, "tokens.css")]);
    await page.waitForSelector('#see-all[data-component~="ui-button"]');
    await page.evaluate(() => document.documentElement.setAttribute("data-ui-input-modality", "touch"));
    for (const id of ["#see-all", "#pill"]) {
      const reaches = await page.locator(id).evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const x = rect.x + rect.width / 2;
        const y = rect.y + rect.height / 2;
        const lands = (dy: number) => { const hit = document.elementFromPoint(x, y + dy); return Boolean(hit && (hit === element || element.contains(hit))); };
        return { height: rect.height, above: lands(-21), below: lands(21) };
      });
      assert.ok(reaches.height < 44, `${id} itself stays small`);
      assert.deepEqual({ above: reaches.above, below: reaches.below }, { above: true, below: true }, `${id} takes a press within the touch minimum`);
    }
    // A boxed button gets no hit area, so it cannot reach over a neighbour.
    assert.equal(await page.locator("#boxed").evaluate((element) => getComputedStyle(element, "::after").content), "none");
    await page.close();
  });
});

describe("Form control sizes", () => {
  const sizedRow = (size: "sm" | "lg") => `<div style="display: flex; align-items: flex-start; gap: 8px; inline-size: 1400px">
    <ui-input id="input" size="${size}" aria-label="Search"></ui-input>
    <ui-select id="select" size="${size}" aria-label="Status"><option>Open</option></ui-select>
    <ui-combobox id="combobox" size="${size}" label="Owner" label-visibility="sr-only" disclosure><option value="ada">Ada</option></ui-combobox>
    <ui-combobox id="multiple" size="${size}" label="Tags" label-visibility="sr-only" multiple><option value="a">A</option></ui-combobox>
    <ui-button id="button" size="${size}">Apply</ui-button>
    <ui-checkbox id="checkbox" size="${size}">Mine</ui-checkbox>
    <ui-radio id="radio" size="${size}">Week</ui-radio>
    <ui-switch id="switch" size="${size}">Archived</ui-switch>
  </div>
  <ui-input id="default" aria-label="Default"></ui-input>`;
  const row = sizedRow("sm");
  // Each control's own box, top-aligned, so the row height is each control's and not the row's.
  const measure = (page: Page) => page.evaluate(() => {
    const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
    const middle = (rect: DOMRect) => rect.top + rect.height / 2;
    const ids = ["input", "select", "combobox", "multiple", "button", "checkbox", "radio", "switch"];
    return {
      heights: Object.fromEntries(ids.map((id) => [id, Math.round(box(`#${id}`).height)])),
      // A field centres its one line of text, so a choice's label shares its baseline when their middles meet.
      labels: ["checkbox", "radio", "switch"].map((id) => Math.abs(Math.round(middle(box(`#${id} .label`)) - middle(box("#input"))))),
      fontSize: getComputedStyle(document.querySelector("#input")!).fontSize,
      labelFontSize: getComputedStyle(document.querySelector("#checkbox .label")!).fontSize,
      defaultHeight: box("#default").height,
      defaultFontSize: getComputedStyle(document.querySelector("#default")!).fontSize,
    };
  });
  const small = { input: 32, select: 32, combobox: 32, multiple: 32, button: 32, checkbox: 32, radio: 32, switch: 32 };

  it("line up small fields, buttons, and choices on one row, and leave md alone", async () => {
    const path = await bundle("html-form-sizes", `import "@threadlabs/looma";`);
    const page = await open(path, row, [join(root, "tokens.css")]);
    await page.waitForSelector('#switch[data-component~="ui-switch"]');
    assert.match((await page.locator("#input").getAttribute("data-ui-input-state")) ?? "", /(^| )size=sm( |$)/);
    assert.match((await page.locator("#checkbox").getAttribute("data-ui-checkbox-state")) ?? "", /(^| )size=sm( |$)/);
    const sizes = await measure(page);
    assert.deepEqual(sizes.heights, small);
    assert.deepEqual(sizes.labels, [0, 0, 0]);
    assert.deepEqual([sizes.fontSize, sizes.labelFontSize], ["14px", "14px"]);
    // md is unchanged: the standard control height and body text.
    assert.ok(sizes.defaultHeight >= 40, `md stays ${sizes.defaultHeight}px`);
    assert.equal(sizes.defaultFontSize, "16px");
    await page.close();
  });

  it("line up large fields, buttons, and choices on one row", async () => {
    const path = await bundle("html-form-sizes-lg", `import "@threadlabs/looma";`);
    const page = await open(path, sizedRow("lg"), [join(root, "tokens.css")]);
    await page.waitForSelector('#switch[data-component~="ui-switch"]');
    assert.match((await page.locator("#radio").getAttribute("data-ui-radio-state")) ?? "", /(^| )size=lg( |$)/);
    const sizes = await measure(page);
    assert.deepEqual(sizes.heights, { input: 48, select: 48, combobox: 48, multiple: 48, button: 48, checkbox: 48, radio: 48, switch: 48 });
    assert.deepEqual(sizes.labels, [0, 0, 0]);
    assert.deepEqual([sizes.fontSize, sizes.labelFontSize], ["16px", "16px"]);
    await page.close();
  });

  it("grow small controls to the touch minimum under a coarse pointer, with body-size field text", async () => {
    const path = await bundle("html-form-sizes-touch", `import "@threadlabs/looma";`);
    const context = await browser.newContext({ hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await page.setContent(`<!doctype html><html><body>${row}</body></html>`);
    await page.addStyleTag({ path: join(root, "tokens.css") });
    await page.addScriptTag({ path });
    await page.waitForSelector('#switch[data-component~="ui-switch"]');
    assert.equal(await page.evaluate(() => matchMedia("(pointer: coarse)").matches), true);
    const sizes = await measure(page);
    // The combobox's clear and disclosure buttons are 44px themselves, inside its 1px border.
    assert.deepEqual(sizes.heights, { input: 44, select: 44, combobox: 46, multiple: 44, button: 44, checkbox: 44, radio: 44, switch: 44 });
    assert.deepEqual(sizes.labels, [0, 0, 0]);
    assert.equal(sizes.fontSize, "16px");
    await context.close();
  });

  it("size an input group from its input", async () => {
    const path = await bundle("html-form-sizes-group", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-input-group id="sm"><span slot="prefix">https://</span><ui-input size="sm" aria-label="Site"></ui-input></ui-input-group>
      <ui-input-group id="md"><span slot="prefix">https://</span><ui-input aria-label="Site"></ui-input></ui-input-group>
      <ui-input-group id="lg"><span slot="prefix">https://</span><ui-input size="lg" aria-label="Site"></ui-input></ui-input-group>
    `, [join(root, "tokens.css")]);
    await page.waitForSelector('#lg [data-component~="ui-input"]');
    const heights = await page.evaluate(() => ["sm", "md", "lg"].map((id) => Math.round(document.getElementById(id)!.getBoundingClientRect().height)));
    assert.deepEqual(heights, [32, 40, 48]);
    await page.close();
  });

  it("take size as a Vue prop", async () => {
    const path = await bundle("vue-form-sizes", `
      import { createApp, h } from "vue";
      import { Button, Checkbox, Input, Select } from "@threadlabs/looma/vue";
      createApp({ render: () => h("div", { style: "display: flex; align-items: flex-start; gap: 8px" }, [
        h(Input, { id: "input", size: "sm", "aria-label": "Search" }),
        h(Select, { id: "select", size: "sm", "aria-label": "Status" }, () => h("option", "Open")),
        h(Button, { id: "button", size: "sm" }, () => "Apply"),
        h(Checkbox, { id: "checkbox", size: "sm" }, () => "Mine"),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await page.waitForSelector("#checkbox");
    assert.match((await page.locator("#input").getAttribute("data-ui-input-state")) ?? "", /(^| )size=sm( |$)/);
    const heights = await page.evaluate(() => ["input", "select", "button", "checkbox"].map((id) => Math.round(document.getElementById(id)!.getBoundingClientRect().height)));
    assert.deepEqual(heights, [32, 32, 32, 32]);
    await page.close();
  });
});

describe("Cluster justify", () => {
  it("spreads a row's items to its ends with justify=between", async () => {
    const path = await bundle("html-cluster-justify", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-cluster id="between" justify="between" style="inline-size: 400px"><span id="first">Title</span><span id="last">Action</span></ui-cluster>
      <ui-cluster id="end" justify="end"><span>Action</span></ui-cluster>
      <ui-cluster id="plain"><span>Action</span></ui-cluster>
    `, [join(root, "tokens.css")]);
    await page.waitForSelector('#plain[data-component~="ui-cluster"]');
    const justify = (selector: string) => page.locator(selector).evaluate((element) => getComputedStyle(element).justifyContent);
    assert.equal(await justify("#between"), "space-between");
    assert.equal(await justify("#end"), "flex-end");
    assert.equal(await justify("#plain"), "normal");
    const edges = await page.evaluate(() => {
      const box = document.querySelector("#between")!.getBoundingClientRect();
      return { start: document.querySelector("#first")!.getBoundingClientRect().left - box.left, end: box.right - document.querySelector("#last")!.getBoundingClientRect().right };
    });
    assert.deepEqual(edges, { start: 0, end: 0 });
    await page.close();
  });
});

describe("Cluster wrap", () => {
  // Two 40px items in a 60px cluster: the default wraps them onto two rows, nowrap keeps one row.
  const item = (id: string) => `<span id="${id}" style="display: inline-block; inline-size: 40px; flex: none">x</span>`;
  const fixture = `
    <div style="inline-size: 60px">
      <ui-cluster id="wraps">${item("wraps-a")}${item("wraps-b")}</ui-cluster>
      <ui-cluster id="nowrap" wrap="nowrap">${item("nowrap-a")}${item("nowrap-b")}</ui-cluster>
    </div>`;

  async function checkWrap(page: Page) {
    await page.waitForSelector('#nowrap[data-component~="ui-cluster"]');
    const top = (id: string) => page.locator(`#${id}`).evaluate((element) => Math.round(element.getBoundingClientRect().top));
    assert.equal(await page.locator("#wraps").evaluate((element) => getComputedStyle(element).flexWrap), "wrap");
    assert.equal(await page.locator("#nowrap").evaluate((element) => getComputedStyle(element).flexWrap), "nowrap");
    assert.notEqual(await top("wraps-a"), await top("wraps-b"), "the default wraps in a narrow container");
    assert.equal(await top("nowrap-a"), await top("nowrap-b"), "nowrap keeps its items on one row");
  }

  it("keeps a nowrap cluster on one row, in HTML", async () => {
    const path = await bundle("html-cluster-wrap", `import "@threadlabs/looma";`);
    const page = await open(path, fixture, [join(root, "tokens.css")]);
    await checkWrap(page);
    await page.close();
  });

  it("keeps a nowrap cluster on one row, in Vue", async () => {
    const path = await bundle("vue-cluster-wrap", `
      import { createApp, h } from "vue";
      import { Cluster } from "@threadlabs/looma/vue";
      const item = (id) => h("span", { id, style: "display: inline-block; inline-size: 40px; flex: none" }, "x");
      createApp({ render: () => h("div", { style: "inline-size: 60px" }, [
        h(Cluster, { id: "wraps" }, () => [item("wraps-a"), item("wraps-b")]),
        h(Cluster, { id: "nowrap", wrap: "nowrap" }, () => [item("nowrap-a"), item("nowrap-b")]),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await checkWrap(page);
    await page.close();
  });
});

describe("Help toggletip", () => {
  it("sizes the help icon like any icon, and opens its tooltip from the keyboard", async () => {
    const path = await bundle("html-help-toggletip", `import "@threadlabs/looma";`);
    const svg = `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14" /></svg>`;
    const page = await open(path, `
      <ui-icon-button id="help-sm" size="sm" variant="ghost" round label="Help for Email"><ui-icon name="help"></ui-icon></ui-icon-button>
      <ui-icon-button id="svg-sm" size="sm" label="Add">${svg}</ui-icon-button>
      <ui-icon-button id="help-md" variant="ghost" round label="Help for Name"><ui-icon name="help"></ui-icon></ui-icon-button>
      <ui-icon-button id="svg-md" label="Add">${svg}</ui-icon-button>
      <ui-tooltip id="tip" for="help-sm" trigger="click">Receipts go to this address.</ui-tooltip>
    `, [join(root, "tokens.css")]);
    await page.waitForSelector('#help-md [data-component~="ui-icon"] circle');
    const size = (selector: string) => page.locator(selector).evaluate((element) => {
      const { width, height } = element.getBoundingClientRect();
      return { width, height, stroke: getComputedStyle(element.querySelector("svg") ?? element).strokeWidth };
    });
    assert.equal(await page.locator('#help-md [data-component~="ui-icon"] svg > g > *').count(), 3, "circle-help: a circle and two paths");
    assert.deepEqual(await size('#help-sm [data-component~="ui-icon"]'), await size("#svg-sm svg"));
    assert.deepEqual(await size('#help-md [data-component~="ui-icon"]'), await size("#svg-md svg"));
    assert.ok((await size('#help-sm [data-component~="ui-icon"]')).width < (await size('#help-md [data-component~="ui-icon"]')).width);

    const tip = page.locator("#tip");
    await page.locator("#help-sm").focus();
    await page.keyboard.press("Enter");
    await tip.waitFor({ state: "visible" });
    assert.equal(await page.locator("#help-sm").getAttribute("aria-expanded"), "true");
    assert.equal(await page.locator("#help-sm").getAttribute("aria-label"), "Help for Email");
    await page.keyboard.press("Escape");
    await tip.waitFor({ state: "hidden" });
    await page.close();
  });
});

describe("Text links", () => {
  it("underlines a link in running text", async () => {
    const path = await bundle("html-text-link", `import "@threadlabs/looma";`);
    const page = await open(path, `<ui-text id="line">Already have a site? <a id="link" href="#sign-in">Sign in</a>.</ui-text>`, [join(root, "tokens.css")]);
    await page.waitForSelector('#line[data-component~="ui-text"]');
    assert.match(await page.locator("#link").evaluate((element) => getComputedStyle(element).textDecorationLine), /underline/);
    await page.close();
  });
});

describe("Text tones", () => {
  it("colours info and warning with the tone's text token", async () => {
    const path = await bundle("html-text-tones", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-text id="info" tone="info">Scheduled for pickup.</ui-text>
      <ui-text id="warning" tone="warning">Needs a carrier.</ui-text>`, [join(root, "tokens.css")]);
    await page.waitForSelector('#warning[data-component~="ui-text"]');
    const colours = await page.evaluate(() => {
      const resolve = (token: string) => {
        const probe = document.createElement("span");
        probe.style.color = `var(${token})`;
        document.body.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      };
      const color = (id: string) => getComputedStyle(document.querySelector(id)!).color;
      return {
        info: [color("#info"), resolve("--ui-info-subtle-text")],
        warning: [color("#warning"), resolve("--ui-warning-subtle-text")],
      };
    });
    assert.equal(colours.info[0], colours.info[1]);
    assert.equal(colours.warning[0], colours.warning[1]);
    await page.close();
  });
});

describe("Form field error", () => {
  it("reads in the danger colour", async () => {
    const path = await bundle("html-field-error", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-form-field invalid>
        <label slot="label" for="name">Name</label>
        <ui-input id="name" name="name"></ui-input>
        <span slot="error" id="message">That name is taken.</span>
      </ui-form-field>`, [join(root, "tokens.css")]);
    await page.waitForSelector('#name[data-component~="ui-input"]');
    const colours = await page.evaluate(() => {
      const probe = document.createElement("span");
      probe.style.color = "var(--ui-danger)";
      document.body.append(probe);
      const danger = getComputedStyle(probe).color;
      probe.remove();
      return { danger, message: getComputedStyle(document.querySelector("#message")!).color };
    });
    assert.equal(colours.message, colours.danger);
    await page.close();
  });

  it("keeps the label-to-control gap when a label action is taller than the label text", async () => {
    const path = await bundle("html-field-label-action", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-grid style="width: 800px">
        <ui-form-field id="plain">
          <label slot="label" for="plain-input">Name</label>
          <ui-input id="plain-input"></ui-input>
        </ui-form-field>
        <ui-form-field id="action">
          <label slot="label" for="action-input">Price</label>
          <ui-icon-button slot="label-action" id="action-help" label="Help for Price" variant="ghost" size="sm" round><ui-icon name="help"></ui-icon></ui-icon-button>
          <ui-input id="action-input"></ui-input>
        </ui-form-field>
      </ui-grid>`, [join(root, "tokens.css")]);
    await page.waitForSelector('#action-input[data-component~="ui-input"]');
    const geometry = await page.evaluate(() => {
      const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
      const gap = (field: string) => box(`#${field} [data-component~="ui-input"]`).top - box(`#${field} label`).bottom;
      return { plain: gap("plain"), action: gap("action"), button: box("#action-help"), label: box("#action label") };
    });
    assert.ok(geometry.button.height > geometry.label.height, "the action is taller than the label text");
    assert.equal(geometry.action, geometry.plain);
    assert.ok(geometry.button.left >= geometry.label.right, "the action follows the label");
    assert.ok(Math.abs((geometry.button.top + geometry.button.bottom) / 2 - (geometry.label.top + geometry.label.bottom) / 2) <= 1, "centred on the label line");
    await page.close();
  });
});

describe("Script focus targets", () => {
  it("draw no ring on a tabindex=-1 heading while controls and widgets keep theirs", async () => {
    const path = await bundle("html-focus-targets", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <h1 id="heading" tabindex="-1" style="width: 120px">A page title long enough to wrap</h1>
      <button id="button">Save</button>
      <button id="button-script" tabindex="-1">Close</button>
      <input id="input" aria-label="Name">
      <div id="option" role="option" tabindex="-1">Alpha</div>
    `, [join(root, "tokens.css")]);
    const ring = (selector: string) => page.locator(selector).evaluate((element: HTMLElement) => {
      element.focus();
      return { visible: element.matches(":focus-visible"), outline: getComputedStyle(element).outlineStyle };
    });
    await page.keyboard.press("Tab");
    assert.deepEqual(await ring("#heading"), { visible: true, outline: "none" });
    for (const selector of ["#button", "#button-script", "#input", "#option"]) {
      const { visible, outline } = await ring(selector);
      assert.equal(visible, true, selector);
      assert.notEqual(outline, "none", selector);
    }
    await page.close();
  });
});

describe("Compact list", () => {
  it("sets items close together, with no row padding", async () => {
    const path = await bundle("html-compact-list", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-list id="rows" aria-label="Rows"><ui-list-item id="row">One</ui-list-item></ui-list>
      <ui-list id="facts" density="compact" aria-label="Facts"><ui-list-item id="fact">One</ui-list-item></ui-list>`, [join(root, "tokens.css")]);
    await page.waitForSelector('#fact[data-component~="ui-list-item"]');
    const size = (id: string) => page.locator(id).evaluate((element) => ({ height: element.getBoundingClientRect().height, padding: getComputedStyle(element).paddingInlineStart }));
    const row = await size("#row");
    const fact = await size("#fact");
    assert.ok(fact.height < row.height, `compact ${fact.height} < ${row.height}`);
    assert.equal(fact.padding, "0px");
    await page.close();
  });
});

describe("View primitives", () => {
  const markup = `
    <ui-page-header id="header">Planning<span slot="description">Roadmaps and decisions.</span></ui-page-header>
    <ui-section id="section" heading="Pinned"><ui-text id="text" tone="muted" size="sm">Edited 2h ago</ui-text></ui-section>
    <ui-section id="bare"><ui-text>No heading</ui-text></ui-section>
    <ui-status-message id="loading" kind="loading">Loading pages…</ui-status-message>
    <ui-status-message id="failed" kind="error">Could not load.</ui-status-message>
    <ui-breadcrumbs id="trail">
      <ui-breadcrumb-item><a href="#home">Home</a></ui-breadcrumb-item>
      <ui-breadcrumb-item current>Roadmap</ui-breadcrumb-item>
    </ui-breadcrumbs>
    <ui-description-list id="facts"><ui-description-item term="Role">Editor</ui-description-item></ui-description-list>
    <ui-spinner id="spinner" label="Loading pages"></ui-spinner>`;

  async function checkPrimitives(page: Page) {
    await page.locator("#trail").waitFor();
    // One h1 per header, an h2 per headed section, and none for a section without a heading.
    assert.equal(await page.locator("#header h1").textContent(), "Planning");
    assert.equal(await page.locator("#section h2").textContent(), "Pinned");
    assert.equal(await page.locator("#bare h2:visible").count(), 0);
    // Text is a paragraph in its tone, smaller than the text around it.
    assert.equal(await page.locator("#text").evaluate((element) => element.tagName), "P");
    // Loading is a polite status with a spinner; an error is an alert.
    assert.equal(await page.locator("#loading").getAttribute("role"), "status");
    assert.equal(await page.locator("#failed").getAttribute("role"), "alert");
    assert.equal(await page.locator("#loading [data-component~='ui-spinner'] svg .track").count(), 1);
    assert.equal(await page.locator("#loading [data-component~='ui-spinner'] svg .arc").count(), 1);
    // A trail is a navigation landmark of an ordered list; the current step is marked; the first
    // step has no separator before it.
    assert.equal(await page.getByRole("navigation", { name: "Breadcrumb" }).count(), 1);
    assert.equal(await page.locator("#trail ol li").count(), 2);
    assert.equal(await page.locator('#trail li[aria-current="page"]').textContent().then((text) => text?.trim()), "Roadmap");
    const separators = await page.locator("#trail li").evaluateAll((items) => items.map((item) => getComputedStyle(item.querySelector(".separator")!).display));
    assert.deepEqual(separators.map((display) => display !== "none"), [false, true]);
    // Named values are a description list of terms and definitions.
    assert.equal(await page.locator("#facts").evaluate((element) => element.tagName), "DL");
    assert.equal(await page.locator("#facts dt").textContent(), "Role");
    assert.equal(await page.locator("#facts dd").textContent().then((text) => text?.trim()), "Editor");
    // A labelled spinner is an announced status.
    assert.equal(await page.getByRole("status", { name: "Loading pages" }).count(), 1);
  }

  it("give a view its structure and semantics, in HTML", async () => {
    const path = await bundle("html-view-primitives", `import "@threadlabs/looma";`);
    const page = await open(path, markup, [join(root, "tokens.css")]);
    await checkPrimitives(page);
    await page.close();
  });

  it("give a view its structure and semantics, in Vue", async () => {
    const path = await bundle("vue-view-primitives", `
      import { createApp, h } from "vue";
      import { Breadcrumbs, BreadcrumbItem, DescriptionItem, DescriptionList, PageHeader, Section, Spinner, StatusMessage, Text } from "@threadlabs/looma/vue";
      createApp({ render: () => [
        h(PageHeader, { id: "header" }, { default: () => "Planning", description: () => "Roadmaps and decisions." }),
        h(Section, { id: "section", heading: "Pinned" }, () => h(Text, { id: "text", tone: "muted", size: "sm" }, () => "Edited 2h ago")),
        h(Section, { id: "bare" }, () => h(Text, null, () => "No heading")),
        h(StatusMessage, { id: "loading", kind: "loading" }, () => "Loading pages…"),
        h(StatusMessage, { id: "failed", kind: "error" }, () => "Could not load."),
        h(Breadcrumbs, { id: "trail" }, () => [
          h(BreadcrumbItem, null, () => h("a", { href: "#home" }, "Home")),
          h(BreadcrumbItem, { current: true }, () => "Roadmap"),
        ]),
        h(DescriptionList, { id: "facts" }, () => h(DescriptionItem, { term: "Role" }, () => "Editor")),
        h(Spinner, { id: "spinner", label: "Loading pages" }),
      ] }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await checkPrimitives(page);
    await page.close();
  });
});

describe("Action bar", () => {
  // Each bar: tertiary, secondary, and primary buttons whose ids share the bar's prefix.
  const bars = [
    { id: "wide", style: "width: 600px" },
    { id: "narrow", style: "width: 280px" },
    { id: "rtl", style: "width: 600px", dir: "rtl" },
  ];

  async function checkActionBar(page: Page) {
    await page.locator("#wide-p").waitFor();
    const box = async (selector: string) => (await page.locator(selector).boundingBox())!;
    const near = (a: number, b: number, what: string) => assert.ok(Math.abs(a - b) <= 1, `${what}: ${a} vs ${b}`);

    // Wide: tertiary at the start edge; secondary just before primary, which ends the row.
    const wide = await box("#wide");
    const [t, s, p] = [await box("#wide-t"), await box("#wide-s"), await box("#wide-p")];
    near(t.x, wide.x, "tertiary starts the row");
    near(p.x + p.width, wide.x + wide.width, "primary ends the row");
    assert.ok(s.x + s.width < p.x && p.x - (s.x + s.width) <= 16, "secondary sits just before primary");
    assert.ok(t.x + t.width < s.x - 100, "the spare space is between tertiary and the rest");
    assert.deepEqual([t.y, s.y].map(Math.round), [p.y, p.y].map(Math.round));

    // Without tertiary or secondary actions, the primary still ends the row.
    const solo = await box("#solo");
    const soloPrimary = await box("#solo-p");
    near(soloPrimary.x + soloPrimary.width, solo.x + solo.width, "a lone primary ends the row");

    // RTL mirrors: primary at the left edge, tertiary at the right.
    const rtl = await box("#rtl");
    near((await box("#rtl-p")).x, rtl.x, "primary ends an RTL row on the left");
    const rtlTertiary = await box("#rtl-t");
    near(rtlTertiary.x + rtlTertiary.width, rtl.x + rtl.width, "tertiary starts an RTL row on the right");

    // Narrow: full width, stacked primary first, by the bar's own width, not the viewport's.
    const narrow = await box("#narrow");
    const stacked = [await box("#narrow-p"), await box("#narrow-s"), await box("#narrow-t")];
    for (const item of stacked) near(item.width, narrow.width, "a stacked action is full width");
    assert.ok(stacked[0].y < stacked[1].y && stacked[1].y < stacked[2].y, "primary, secondary, tertiary from the top");

    // Tab order follows the source, tertiary to primary, at every width.
    for (const id of ["wide", "narrow", "rtl"]) {
      await page.locator(`#${id}-t`).focus();
      const order = [await page.evaluate(() => document.activeElement?.id)];
      for (let step = 0; step < 2; step += 1) {
        await page.keyboard.press("Tab");
        order.push(await page.evaluate(() => document.activeElement?.id));
      }
      assert.deepEqual(order, [`${id}-t`, `${id}-s`, `${id}-p`]);
    }

    // In a dialog's actions, the bar fills the footer.
    const footer = await box("#dialog footer");
    const [dialogTertiary, dialogPrimary] = [await box("#dialog-t"), await box("#dialog-p")];
    const inset = await page.locator("#dialog footer").evaluate((element) => parseFloat(getComputedStyle(element).paddingLeft));
    near(dialogTertiary.x, footer.x + inset, "tertiary starts the dialog footer");
    near(dialogPrimary.x + dialogPrimary.width, footer.x + footer.width - inset, "primary ends the dialog footer");
  }

  it("orders actions by priority, stacks them in a narrow container, and mirrors in RTL, in HTML", async () => {
    const path = await bundle("html-action-bar", `import "@threadlabs/looma";`);
    const bar = (id: string) => `
      <ui-action-bar id="${id}">
        <ui-button id="${id}-t" slot="tertiary" variant="ghost">Cancel</ui-button>
        <ui-button id="${id}-s" slot="secondary">Save as draft</ui-button>
        <ui-button id="${id}-p" slot="primary" variant="solid">Save</ui-button>
      </ui-action-bar>`;
    const page = await open(path, `
      ${bars.map(({ id, style, dir }) => `<div style="${style}"${dir ? ` dir="${dir}"` : ""}>${bar(id)}</div>`).join("")}
      <div style="width: 600px"><ui-action-bar id="solo"><ui-button id="solo-p" slot="primary">Save</ui-button></ui-action-bar></div>
      <ui-dialog id="dialog" open label="Unsaved changes">Body${bar("dialog").replace("<ui-action-bar", '<ui-action-bar slot="actions"')}</ui-dialog>`,
    [join(root, "tokens.css")]);
    await checkActionBar(page);
    await page.close();
  });

  it("orders actions by priority, stacks them in a narrow container, and mirrors in RTL, in Vue", async () => {
    const path = await bundle("vue-action-bar", `
      import { createApp, h } from "vue";
      import { ActionBar, Button, Dialog } from "@threadlabs/looma/vue";
      const bar = (id, props = {}) => h(ActionBar, { id, ...props }, {
        tertiary: () => h(Button, { id: id + "-t", variant: "ghost" }, () => "Cancel"),
        secondary: () => h(Button, { id: id + "-s" }, () => "Save as draft"),
        primary: () => h(Button, { id: id + "-p", variant: "solid" }, () => "Save"),
      });
      createApp({ render: () => [
        ...${JSON.stringify(bars)}.map(({ id, style, dir }) => h("div", { style, dir }, [bar(id)])),
        h("div", { style: "width: 600px" }, [h(ActionBar, { id: "solo" }, { primary: () => h(Button, { id: "solo-p" }, () => "Save") })]),
        h(Dialog, { id: "dialog", open: true, label: "Unsaved changes" }, { default: () => "Body", actions: () => bar("dialog") }),
      ] }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await checkActionBar(page);
    await page.close();
  });
});

describe("List item", () => {
  const longTitle = "A title long enough that it cannot fit on one line of a narrow list and must end in an ellipsis";

  async function checkItem(page: Page) {
    const item = page.locator("#item");
    await item.waitFor();
    // The icon and padding follow the title's link.
    const box = (await page.locator("#icon").boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForFunction(() => location.hash === "#target");
    // A trailing control is its own: it does not follow the link.
    await page.evaluate(() => { history.replaceState(null, "", "#start"); });
    await page.locator("#restore").click();
    assert.equal(await page.evaluate(() => location.hash), "#start");
    assert.equal(await page.evaluate(() => (window as unknown as { restored: number }).restored), 1);
    // One line each, ending in an ellipsis.
    const title = await item.evaluate((element) => {
      const region = element.querySelector(".title") as HTMLElement;
      return { overflowing: region.scrollWidth > region.clientWidth, ellipsis: getComputedStyle(region).textOverflow };
    });
    assert.deepEqual(title, { overflowing: true, ellipsis: "ellipsis" });
    // A link item takes the hover surface; a card is bordered.
    const before = await item.evaluate((element) => getComputedStyle(element).backgroundColor);
    await page.locator("#item a").hover();
    await page.waitForTimeout(200);
    assert.notEqual(await item.evaluate((element) => getComputedStyle(element).backgroundColor), before);
    assert.notEqual(await page.locator("#card").evaluate((element) => getComputedStyle(element).borderTopStyle), "none");
    assert.equal(await page.locator("#list").evaluate((element) => [element.tagName, element.getAttribute("role")].join(" ")), "UL list");
    assert.equal(await item.evaluate((element) => element.tagName), "LI");
  }

  it("follows its title link from anywhere but a trailing control, in HTML", async () => {
    const path = await bundle("html-list-item", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <div style="width: 320px">
        <ui-list id="list" aria-label="Pages">
          <ui-list-item id="item">
            <span slot="leading" id="icon" style="display: inline-block; width: 18px; height: 18px">*</span>
            <a href="#target">${longTitle}</a>
            <span slot="description">Edited 2h ago</span>
            <button slot="trailing" id="restore" type="button" onclick="window.restored = (window.restored || 0) + 1">Restore</button>
          </ui-list-item>
          <ui-list-item id="card" variant="card"><a href="#card">Card</a></ui-list-item>
        </ui-list>
      </div>`, [join(root, "tokens.css")]);
    await page.waitForSelector('#item[data-component~="ui-list-item"]');
    await checkItem(page);
    await page.close();
  });

  it("follows its title link from anywhere but a trailing control, in Vue", async () => {
    const path = await bundle("vue-list-item", `
      import { createApp, h } from "vue";
      import { List, ListItem } from "@threadlabs/looma/vue";
      window.restored = 0;
      createApp({ render: () => h("div", { style: "width: 320px" }, [
        h(List, { id: "list", "aria-label": "Pages" }, () => [
          h(ListItem, { id: "item" }, {
            leading: () => h("span", { id: "icon", style: "display: inline-block; width: 18px; height: 18px" }, "*"),
            default: () => h("a", { href: "#target" }, ${JSON.stringify(longTitle)}),
            description: () => h("span", "Edited 2h ago"),
            trailing: () => h("button", { id: "restore", type: "button", onClick: () => { window.restored += 1; } }, "Restore"),
          }),
          h(ListItem, { id: "card", variant: "card" }, () => h("a", { href: "#card" }, "Card")),
        ]),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await checkItem(page);
    await page.close();
  });
});

describe("Square icon badges", () => {
  it("centres equal-size heading marks in HTML and Vue and follows shared radius and spacing", async () => {
    for (const framework of ["html", "vue"]) {
      const path = await bundle(`${framework}-square-badges`, framework === "html" ? `import "@threadlabs/looma";` : `
        import { createApp, h } from "vue";
        import { Badge, Icon } from "@threadlabs/looma/vue";
        createApp({ render: () => [
          h(Badge, { id: "square", shape: "square", tone: "success", "aria-hidden": "true" }, () => h(Icon, { name: "bell" })),
          h(Badge, { id: "small", shape: "square", size: "xs", tone: "accent", "aria-hidden": "true" }, () => h(Icon, { name: "bell" })),
          h(Badge, { id: "pill" }, () => "Published"),
        ] }).mount("#app");
      `);
      const body = framework === "vue" ? `<div id="app"></div>` : `
        <ui-badge id="square" shape="square" tone="success" aria-hidden="true"><ui-icon name="bell"></ui-icon></ui-badge>
        <ui-badge id="small" shape="square" size="xs" tone="accent" aria-hidden="true"><ui-icon name="bell"></ui-icon></ui-badge>
        <ui-badge id="pill">Published</ui-badge>`;
      const page = await open(path, body, [join(root, "tokens.css"), join(root, "vue/components.css")], { viewport: { width: 375, height: 812 } });
      await page.waitForSelector('#square[data-component~="ui-badge"]');
      for (const [id, size] of [["square", 32], ["small", 24]] as const) {
        const box = await page.locator(`#${id}`).boundingBox();
        const icon = await page.locator(`#${id} svg`).boundingBox();
        assert.ok(box && icon && box.width === size && box.height === size, `${framework} ${id} is a square`);
        assert.ok(Math.abs(box.x + box.width / 2 - icon.x - icon.width / 2) < 1);
        assert.ok(Math.abs(box.y + box.height / 2 - icon.y - icon.height / 2) < 1);
        assert.equal(await page.locator(`#${id}`).getAttribute("aria-hidden"), "true");
      }
      assert.equal(await page.locator('#square').evaluate(el => getComputedStyle(el).borderRadius), '8px');
      assert.notEqual(await page.locator('#square').evaluate(el => getComputedStyle(el).backgroundColor), await page.locator('#pill').evaluate(el => getComputedStyle(el).backgroundColor));
      assert.ok((await page.locator('#pill').boundingBox())!.width > 32, "ordinary badges still fit their text");
      await page.locator('body').evaluate(el => { el.style.setProperty('--ui-radius-md', '3px'); el.style.setProperty('--ui-space-4', '20px'); });
      assert.equal((await page.locator('#square').boundingBox())!.width, 40);
      assert.equal(await page.locator('#square').evaluate(el => getComputedStyle(el).borderRadius), '3px');
      await page.locator('#square').evaluate(el => { (el as HTMLElement).style.setProperty('--ui-badge-square-size', '36px'); });
      assert.equal((await page.locator('#square').boundingBox())!.height, 36);
      await page.emulateMedia({ forcedColors: 'active' });
      assert.equal(await page.locator('#square').evaluate(el => getComputedStyle(el).forcedColorAdjust), 'auto');
      await page.close();
    }
  });
});

describe("Quiet attention presentation", () => {
  it("uses the same highlighted rows and accessible dot geometry in HTML and Vue", async () => {
    for (const framework of ["html", "vue"]) {
      const path = await bundle(`${framework}-quiet-attention`, framework === "html" ? `import "@threadlabs/looma";` : `
        import { createApp, h } from "vue";
        import { Badge, List, ListItem } from "@threadlabs/looma/vue";
        createApp({ render: () => h("div", [
          h(List, () => [
            h(ListItem, { id: "plain" }, () => h("a", { href: "#plain" }, "Earlier message")),
            h(ListItem, { id: "new-one", highlighted: true }, () => h("a", { href: "#one" }, "New message")),
            h(ListItem, { id: "new-two", highlighted: true }, () => h("a", { href: "#two" }, "Another new message")),
          ]),
          h(Badge, { id: "new-dot", shape: "dot", tone: "accent", variant: "solid" }, () => "New messages"),
          h(Badge, { id: "pending-dot", shape: "dot", tone: "warning" }, () => "Waiting for your reply"),
        ]) }).mount("#app");
      `);
      const body = framework === "vue" ? `<div id="app"></div>` : `
        <ui-list>
          <ui-list-item id="plain"><a href="#plain">Earlier message</a></ui-list-item>
          <ui-list-item id="new-one" highlighted><a href="#one">New message</a></ui-list-item>
          <ui-list-item id="new-two" highlighted><a href="#two">Another new message</a></ui-list-item>
        </ui-list>
        <ui-badge id="new-dot" shape="dot" tone="accent" variant="solid">New messages</ui-badge>
        <ui-badge id="pending-dot" shape="dot" tone="warning">Waiting for your reply</ui-badge>`;
      const page = await open(path, body, [join(root, "tokens.css"), join(root, "vue/components.css")], { viewport: { width: 375, height: 812 } });
      await page.waitForSelector('#new-one[data-component~="ui-list-item"]');
      const style = (selector: string, property: string) => page.locator(selector).evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property);
      assert.notEqual(await style("#new-one", "background-color"), await style("#plain", "background-color"));
      assert.equal(await style("#new-one", "color"), await style("#plain", "color"));
      assert.equal(await style("#new-one .title", "font-weight"), await style("#plain .title", "font-weight"));
      for (const selector of ["#new-one", "#new-two"]) {
        assert.notEqual(await page.locator(selector).getAttribute("aria-current"), "true");
        assert.equal(await page.locator(selector).getAttribute("aria-selected"), null);
      }
      for (const selector of ["#new-dot", "#pending-dot"]) {
        const box = await page.locator(selector).boundingBox();
        assert.ok(box && box.width === box.height && box.width <= 10, "a signal stays a small circle regardless of its label");
        assert.ok((await page.locator(selector).ariaSnapshot()).includes(selector === "#new-dot" ? "New messages" : "Waiting for your reply"));
      }
      assert.notEqual(await style("#new-dot", "background-color"), await style("#pending-dot", "background-color"));
      await page.locator("#new-one a").focus();
      await page.keyboard.press("Enter");
      assert.equal(await page.evaluate(() => location.hash), "#one");
      // Both options follow their existing theme owner, without changing text or action geometry.
      await page.locator("body").evaluate(element => {
        element.style.setProperty("--ui-selection-surface", "rgb(245, 240, 255)");
      });
      await page.waitForFunction(() => getComputedStyle(document.querySelector("#new-one")!).backgroundColor === "rgb(245, 240, 255)");
      assert.equal(await style("#new-one", "background-color"), "rgb(245, 240, 255)");
      await page.emulateMedia({ forcedColors: "active" });
      assert.equal(await style("#pending-dot", "forced-color-adjust"), "none");
      await page.close();
    }
  });
});

describe("Readable explanatory lists", () => {
  it("wraps full titles and descriptions at 375px in HTML and Vue", async () => {
    const title = "A person asked you to review the updated account recovery guide";
    const description = "Check the recovery steps, device checks, and the contact details before continuing.";
    for (const framework of ["html", "vue"] as const) {
      const path = await bundle(`${framework}-wrapped-list`, framework === "html" ? `import "@threadlabs/looma";` : `
        import { createApp, h } from "vue";
        import { List, ListItem, Button, Icon, IconButton } from "@threadlabs/looma/vue";
        createApp({ render: () => [
          h(IconButton, { id: "bell", label: "Notifications" }, () => h(Icon, { name: "bell" })),
          h(List, {}, () => [
            h(ListItem, { id: "wrapped", wrap: true }, { default: () => ${JSON.stringify(title)}, description: () => ${JSON.stringify(description)}, trailing: () => h(Button, { size: "sm" }, () => "Review") }),
            h(ListItem, { id: "ordinary" }, () => ${JSON.stringify(title)}),
          ]),
        ] }).mount("#app");
      `);
      const page = await open(path, framework === "vue" ? '<div id="app"></div>' : `
        <ui-icon-button id="bell" label="Notifications"><ui-icon name="bell"></ui-icon></ui-icon-button>
        <ui-list>
          <ui-list-item id="wrapped" wrap>${title}<span slot="description">${description}</span><ui-button slot="trailing" size="sm">Review</ui-button></ui-list-item>
          <ui-list-item id="ordinary">${title}</ui-list-item>
        </ui-list>
      `, [join(root, "tokens.css"), join(root, "vue/components.css")], { viewport: { width: 375, height: 812 } });
      const geometry = await page.evaluate(() => {
        const title = document.querySelector("#wrapped .title")! as HTMLElement;
        const description = document.querySelector("#wrapped .description")! as HTMLElement;
        const ordinary = document.querySelector("#ordinary .title")!;
        return { title: { wrap: getComputedStyle(title).whiteSpace, height: title.clientHeight, scroll: title.scrollWidth, width: title.clientWidth },
          description: { wrap: getComputedStyle(description).whiteSpace, height: description.clientHeight, scroll: description.scrollWidth, width: description.clientWidth },
          ordinary: getComputedStyle(ordinary).whiteSpace, width: document.documentElement.scrollWidth,
          icon: document.querySelectorAll("#bell svg path").length };
      });
      assert.equal(geometry.ordinary, "nowrap");
      for (const text of [geometry.title, geometry.description]) {
        assert.equal(text.wrap, "normal");
        assert.ok(text.height > 24, `${framework}: explanatory text has multiple visible lines`);
        assert.ok(text.scroll <= text.width, `${framework}: full text fits without horizontal clipping`);
      }
      assert.ok(geometry.width <= 375);
      assert.ok(geometry.icon > 0);
      await page.close();
    }
  });
});

describe("Shared visual geometry", () => {
  it("themes border, accent, focus, and row corners through global semantic dimensions", async () => {
    const path = await bundle("html-global-visual-geometry", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <div id="theme" style="--ui-border-width:3px;--ui-accent-line-width:5px;--ui-focus-width:4px;--ui-selection-radius:13px;--ui-selection-surface:rgb(245,240,255);--ui-selection-text:rgb(81,50,140)">
        <ui-button id="action" variant="outline">Save</ui-button>
        <ui-input id="field" aria-label="Name"></ui-input>
        <ui-separator id="divider"></ui-separator>
        <ui-disclosure id="disclosure" summary="Details">Body</ui-disclosure>
        <ui-card id="card" tone="danger">Notice</ui-card>
        <ui-callout id="callout">Note</ui-callout>
        <ui-nav-item id="nav" current="page">Overview</ui-nav-item>
        <ui-nav-item id="line-nav" variant="line" current="page">Reports</ui-nav-item>
        <ui-tree label="Documents"><ui-tree-item id="tree-row" selected label="Guide"></ui-tree-item></ui-tree>
        <ui-list><ui-list-item id="list-row" current><a href="#guide">Guide</a></ui-list-item></ui-list>
        <ui-search-result-row id="search-row" selected><span slot="title">Guide</span></ui-search-result-row>
        <ui-listbox id="choices"><option selected>Guide</option><option>Notes</option></ui-listbox>
        <div class="looma-editor"><div class="ProseMirror"><blockquote id="quote">Quote</blockquote><aside id="editor-callout" data-looma-callout data-tone="info">Note</aside></div></div>
      </div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const css = (selector: string, property: string) => page.locator(selector).evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
    for (const selector of ["#action", "#field", "#card", "#callout", "#editor-callout"]) {
      assert.equal(await css(selector, "border-top-width"), "3px", `${selector} follows ordinary border width`);
    }
    assert.equal(await css("#divider", "border-top-width"), "3px");
    assert.equal(await css("#disclosure", "border-bottom-width"), "3px");
    for (const selector of ["#card", "#callout", "#editor-callout", "#quote"]) {
      assert.equal(await css(selector, "border-inline-start-width"), "5px", `${selector} follows accent-line width`);
    }
    assert.equal(await css("#line-nav .indicator", "border-inline-start-width"), "5px");
    for (const selector of ["#nav", "#tree-row > .row", "#list-row", "#search-row", '#choices [role="option"][aria-selected="true"]']) {
      assert.equal(await css(selector, "border-top-left-radius"), "13px", `${selector} follows row corners`);
      assert.equal(await css(selector, "background-color"), "rgb(245, 240, 255)", `${selector} follows selected surface`);
      assert.equal(await css(selector, "color"), "rgb(81, 50, 140)", `${selector} follows selected text`);
    }
    await page.keyboard.press("Tab");
    await page.locator("#nav").focus();
    assert.equal(await css("#nav", "outline-width"), "4px", "keyboard focus has its own semantic weight");
    assert.equal(await css("#nav", "outline-offset"), "-4px", "the ring remains inside the row at any configured width");
    // Theme values remain live, rather than being copied into component declarations.
    await page.locator("#theme").evaluate(el => (el as HTMLElement).style.setProperty("--ui-selection-radius", "7px"));
    assert.equal(await css("#nav", "border-top-left-radius"), "7px");
    assert.equal(await css("#tree-row > .row", "border-top-left-radius"), "7px");
    await page.emulateMedia({ forcedColors: "active" });
    for (const [target, surface] of [["#tree-row", "#tree-row > .row"], ["#list-row a", "#list-row"]]) {
      await page.locator(target).focus();
      assert.equal(await css(surface, "outline-width"), "4px", "forced colors keep the independent keyboard-focus weight");
      assert.equal(await css(surface, "outline-style"), "solid");
    }
    await page.close();
  });
});

describe("Nav item", () => {
  const longDescription = "A description long enough that it cannot fit on one line of a narrow rail and must end in an ellipsis";

  // A colour as the page computes it, for comparing with a computed style.
  const resolveColor = (page: Page, color: string) => page.evaluate((value) => {
    const probe = document.body.appendChild(document.createElement("i"));
    probe.style.color = value;
    const computed = getComputedStyle(probe).color;
    probe.remove();
    return computed;
  }, color);

  it("shares configurable selection colors between compact navigation and tree rows", async () => {
    const path = await bundle("html-shared-navigation-selection", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <div style="--ui-selection-surface:rgb(230,220,255);--ui-selection-text:rgb(81,50,140);width:240px">
        <ui-nav-item id="compact-nav" density="compact" current="page" as="a" href="#overview">Overview</ui-nav-item>
        <ui-nav-item id="plain-nav" density="compact" as="a" href="#activity">Activity</ui-nav-item>
        <ui-tree density="compact" label="Documents">
          <ui-tree-item id="selected-tree" selected label="Guide"><ui-icon slot="leading" name="file-text" aria-hidden="true"></ui-icon></ui-tree-item>
          <ui-tree-item id="colored-tree" selected label="Reference"><ui-icon slot="leading" name="file-text" aria-hidden="true" style="color:rgb(180,60,40)"></ui-icon></ui-tree-item>
          <ui-tree-item id="plain-tree" label="Notes"></ui-tree-item>
        </ui-tree>
      </div>`, [join(root, "tokens.css")], { reducedMotion: "reduce" });
    const look = (selector: string) => page.locator(selector).evaluate(el => {
      const s = getComputedStyle(el);
      return { surface: s.backgroundColor, text: s.color, size: s.fontSize, height: el.getBoundingClientRect().height };
    });
    const nav = await look("#compact-nav");
    const tree = await look("#selected-tree > .row");
    assert.equal(nav.surface, "rgb(230, 220, 255)");
    assert.equal(tree.surface, nav.surface);
    assert.equal(tree.text, nav.text);
    assert.equal(nav.text, "rgb(81, 50, 140)");
    assert.equal((await look("#compact-nav .label")).size, tree.size);
    assert.equal(nav.height, tree.height);
    assert.notEqual((await look("#plain-nav")).surface, nav.surface);
    assert.notEqual((await look("#plain-tree > .row")).surface, tree.surface);
    assert.equal(await page.locator("#selected-tree .leading svg").evaluate(el => getComputedStyle(el).color), nav.text);
    assert.equal(await page.locator("#colored-tree .leading svg").evaluate(el => getComputedStyle(el).color), "rgb(180, 60, 40)");
    await page.close();
  });

  it("separates rounded surface selection from straight continuous line selection", async () => {
    const path = await bundle("html-navigation-selection-geometry", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <div style="--ui-accent-line-width:5px;--ui-selection-radius:13px">
        <ui-nav-item id="surface" current="page">Overview</ui-nav-item>
        <ui-nav-item id="line" variant="line" current="page">Reports</ui-nav-item>
      </div>`, [join(root, "tokens.css")]);
    await page.waitForSelector('#surface[data-component~="ui-nav-item"]');
    assert.equal(await page.locator("#surface .indicator").isVisible(), false, "rounded surface selection has no edge stripe");
    assert.equal(await page.locator("#surface").evaluate(el => getComputedStyle(el).borderRadius), "13px");
    assert.equal(await page.locator("#line").evaluate(el => getComputedStyle(el).borderRadius), "0px");
    const row = (await page.locator("#line").boundingBox())!;
    const marker = (await page.locator("#line .indicator").boundingBox())!;
    assert.equal(marker.width, 5);
    assert.equal(marker.y, row.y);
    assert.equal(marker.height, row.height);
    await page.close();
  });

  async function checkNavItem(page: Page) {
    await page.locator("#page").waitFor();
    const box = async (selector: string) => (await page.locator(selector).boundingBox())!;
    const near = (a: number, b: number, what: string) => assert.ok(Math.abs(a - b) <= 1, `${what}: ${a} vs ${b}`);

    // current states aria-current: the page by default, or the kind of place asked for.
    assert.equal(await page.locator("#page").getAttribute("aria-current"), "page");
    assert.equal(await page.locator("#step").getAttribute("aria-current"), "step");
    assert.equal(await page.locator("#other").getAttribute("aria-current"), null);

    // Surface rows use one shape: all corners follow the shared radius and no inset stripe.
    assert.equal(await page.locator("#page .indicator").isVisible(), false);
    assert.equal(await page.locator("#rtl .indicator").isVisible(), false);
    const look = (id: string) => page.locator(id).evaluate((element) => {
      const style = getComputedStyle(element);
      return { surface: style.backgroundColor, weight: Number(style.fontWeight), radius: style.borderRadius };
    });
    const [current, other] = [await look("#page"), await look("#other")];
    assert.notEqual(current.surface, other.surface, "the current item takes the selected surface");
    assert.equal(current.weight, other.weight, "selection keeps the resting label weight");
    assert.equal(current.radius, "8px");
    const line = await box("#line");
    const marker = await box("#line .indicator");
    near(marker.width, 1, "the line uses the shared 1px accent weight");
    near(marker.y, line.y, "the line begins at the top");
    near(marker.height, line.height, "the line spans the complete row");
    assert.equal((await look("#line")).radius, "0px");
    const rtlLine = await box("#rtl-line");
    const rtlMarker = await box("#rtl-line .indicator");
    near(rtlMarker.x + rtlMarker.width, rtlLine.x + rtlLine.width, "a continuous line mirrors in RTL");

    // A link item is a real link: it navigates, and target and rel reach it.
    const link = page.locator("#other");
    assert.equal(await link.evaluate((element) => element.localName), "a");
    assert.equal(await link.getAttribute("type"), null);
    assert.equal(await page.locator("#page").getAttribute("target"), "_self");
    assert.equal(await page.locator("#page").getAttribute("rel"), "bookmark");
    assert.equal(await page.getByRole("link", { name: "Invoices" }).count(), 1);
    await link.click();
    await page.waitForFunction(() => location.hash === "#invoices");

    // A button item is a button that never submits, and fires its click.
    const button = page.locator("#view");
    assert.equal(await button.evaluate((element) => element.localName), "button");
    assert.equal(await button.getAttribute("type"), "button");
    await button.click();
    assert.equal(await page.evaluate(() => (window as unknown as { clicks: number }).clicks), 1);

    // Keyboard focus shows a ring, and Enter presses the focused item.
    await page.locator("#other").focus();
    await page.keyboard.press("Tab");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "view");
    const ring = await button.evaluate((element) => {
      const style = getComputedStyle(element);
      return { visible: element.matches(":focus-visible"), outline: `${style.outlineStyle} ${style.outlineWidth}` };
    });
    assert.deepEqual(ring, { visible: true, outline: "solid 2px" });
    await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(() => (window as unknown as { clicks: number }).clicks), 2);

    // Label and description are one line each, ending in an ellipsis.
    const lines = await page.locator("#long").evaluate((element) => [".label", ".description"].map((part) => {
      const region = element.querySelector(part) as HTMLElement;
      const style = getComputedStyle(region);
      return { overflowing: region.scrollWidth > region.clientWidth, ellipsis: style.textOverflow, wrap: style.whiteSpace };
    }));
    assert.deepEqual(lines[1], { overflowing: true, ellipsis: "ellipsis", wrap: "nowrap" });
    assert.deepEqual([lines[0].ellipsis, lines[0].wrap], ["ellipsis", "nowrap"]);

    // System colors keep a complete surface outline or a continuous line; focus stays separate.
    await page.emulateMedia({ forcedColors: "active" });
    const selectedOutline = await page.locator("#page").evaluate((element) => {
      const s = getComputedStyle(element);
      return { width: s.outlineWidth, color: s.outlineColor };
    });
    assert.deepEqual(selectedOutline, { width: "1px", color: await resolveColor(page, "Highlight") });
    assert.equal(await page.locator("#page .indicator").isVisible(), false);
    assert.equal(await page.locator("#line .indicator").evaluate(el => getComputedStyle(el).borderInlineStartColor), await resolveColor(page, "Highlight"));
    await page.emulateMedia({ forcedColors: "none" });
  }

  it("marks the current item with coherent surface or line geometry and works as a link or a button, in HTML", async () => {
    const path = await bundle("html-nav-item", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <script>window.clicks = 0;</script>
      <nav aria-label="Main" style="width: 240px">
        <ui-list>
          <li><ui-nav-item id="page" as="a" href="#shipments" target="_self" rel="bookmark" current="true"><span slot="leading">*</span>Shipments</ui-nav-item></li>
          <li><ui-nav-item id="other" as="a" href="#invoices">Invoices</ui-nav-item></li>
          <li><ui-nav-item id="view" onclick="window.clicks += 1">Overview</ui-nav-item></li>
          <li><ui-nav-item id="step" current="step">Team</ui-nav-item></li>
          <li><ui-nav-item id="line" variant="line" current="page">Reports</ui-nav-item></li>
          <li><ui-nav-item id="long">Customer<span slot="description">${longDescription}</span></ui-nav-item></li>
        </ui-list>
      </nav>
      <nav aria-label="RTL" dir="rtl" style="width: 240px"><ui-nav-item id="rtl" current="true">Shipments</ui-nav-item><ui-nav-item id="rtl-line" variant="line" current="true">Reports</ui-nav-item></nav>`,
    [join(root, "tokens.css")]);
    await page.waitForSelector('#long[data-component~="ui-nav-item"]');
    await checkNavItem(page);
    await page.close();
  });

  it("marks the current item with coherent surface or line geometry and works as a link or a button, in Vue", async () => {
    const path = await bundle("vue-nav-item", `
      import { createApp, h } from "vue";
      import { List, NavItem } from "@threadlabs/looma/vue";
      window.clicks = 0;
      const item = (props, slots) => h("li", [h(NavItem, props, slots)]);
      createApp({ render: () => [
        h("nav", { "aria-label": "Main", style: "width: 240px" }, [h(List, null, () => [
          item({ id: "page", as: "a", href: "#shipments", target: "_self", rel: "bookmark", current: "true" }, { leading: () => h("span", "*"), default: () => "Shipments" }),
          item({ id: "other", as: "a", href: "#invoices" }, () => "Invoices"),
          item({ id: "view", onClick: () => { window.clicks += 1; } }, () => "Overview"),
          item({ id: "step", current: "step" }, () => "Team"),
          item({ id: "line", variant: "line", current: "page" }, () => "Reports"),
          item({ id: "long" }, { default: () => "Customer", description: () => h("span", ${JSON.stringify(longDescription)}) }),
        ])]),
        h("nav", { "aria-label": "RTL", dir: "rtl", style: "width: 240px" }, [h(NavItem, { id: "rtl", current: "true" }, () => "Shipments"), h(NavItem, { id: "rtl-line", variant: "line", current: "true" }, () => "Reports")]),
      ] }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await checkNavItem(page);
    await page.close();
  });
});

describe("Editor toolbar row", () => {
  it("has one Tab stop and roves through enabled controls in HTML and Vue", async () => {
    const htmlPath = await bundle("html-toolbar-roving", `import "@threadlabs/looma";`);
    const vuePath = await bundle("vue-toolbar-roving", `
      import { createApp, h } from "vue";
      import { EditorToolbar } from "@threadlabs/looma/vue/editor";
      createApp({ render: () => h("div", [
        h("button", { id: "before" }, "Before"),
        h(EditorToolbar, { id: "toolbar" }, () => [
          h("button", { id: "first" }, "First"),
          h("button", { id: "blocked", disabled: true }, "Blocked"),
          h("button", { id: "last" }, "Last"),
        ]),
        h("button", { id: "after" }, "After"),
      ]) }).mount("#app");
    `);
    for (const [path, body, css] of [
      [htmlPath, `<button id="before">Before</button><ui-editor-toolbar id="toolbar"><button id="first">First</button><button id="blocked" disabled>Blocked</button><button id="last">Last</button></ui-editor-toolbar><button id="after">After</button>`, [join(root, "tokens.css")]],
      [vuePath, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]],
    ] as const) {
      const page = await open(path, body, css);
      assert.equal(await page.locator("#toolbar button[tabindex='0']").count(), 1);
      await page.locator("#before").focus();
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement?.id), "first");
      await page.keyboard.press("ArrowRight");
      assert.equal(await page.evaluate(() => document.activeElement?.id), "last");
      await page.keyboard.press("ArrowRight");
      assert.equal(await page.evaluate(() => document.activeElement?.id), "first");
      await page.keyboard.press("End");
      assert.equal(await page.evaluate(() => document.activeElement?.id), "last");
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement?.id), "after");
      await page.close();
    }
  });

  const buttons = Array.from({ length: 18 }, (_, index) => `<button type="button">B${index}</button>`).join("");
  const fades = (page: Page) => scrollFades(page, "#toolbar .strip");
  const settle = (page: Page) => page.waitForTimeout(250);

  async function checkRow(page: Page) {
    const toolbar = page.locator("#toolbar");
    await toolbar.waitFor();
    assert.equal(await toolbar.getAttribute("role"), "toolbar");
    const layout = await toolbar.evaluate((element) => {
      const strip = element.querySelector(".strip") as HTMLElement;
      const tops = [...element.querySelectorAll("button")].map((button) => Math.round(button.getBoundingClientRect().top));
      return { rows: new Set(tops).size, hidden: strip.scrollWidth - strip.clientWidth };
    });
    // Never wraps: one row that scrolls when it is too long.
    assert.equal(layout.rows, 1);
    assert.ok(layout.hidden > 0, "the narrow row overflows");
    await settle(page);
    assert.deepEqual(await fades(page), { start: "0", end: "1" }, "only the end hides controls at first");

    await toolbar.evaluate((element) => { const strip = element.querySelector(".strip")!; strip.scrollLeft = strip.scrollWidth; });
    await settle(page);
    assert.deepEqual(await fades(page), { start: "1", end: "0" }, "scrolled to the end, only the start hides controls");

    await toolbar.evaluate((element) => { const strip = element.querySelector(".strip")!; strip.scrollLeft = (strip.scrollWidth - strip.clientWidth) / 2; });
    await settle(page);
    assert.deepEqual(await fades(page), { start: "1", end: "1" }, "in the middle, both edges hide controls");

    await page.locator("#frame").evaluate((element) => { (element as HTMLElement).style.width = "3000px"; });
    await settle(page);
    assert.deepEqual(await fades(page), { start: "0", end: "0" }, "a row that fits shows no fade");
  }

  it("keeps one row that scrolls, fading only the edges that hide controls, in HTML", async () => {
    const path = await bundle("html-toolbar-row", `import "@threadlabs/looma";`);
    const page = await open(path, `<div id="frame" style="width: 320px"><ui-editor-toolbar id="toolbar">${buttons}</ui-editor-toolbar></div>`, [join(root, "tokens.css")]);
    await page.waitForSelector('#toolbar[data-component~="ui-editor-toolbar"]');
    await checkRow(page);
    await page.close();
  });

  it("keeps one row that scrolls, fading only the edges that hide controls, in Vue", async () => {
    const path = await bundle("vue-toolbar-row", `
      import { createApp, h } from "vue";
      import { EditorToolbar } from "@threadlabs/looma/vue/editor";
      createApp({ render: () => h("div", { id: "frame", style: "width: 320px" }, [
        h(EditorToolbar, { id: "toolbar" }, () => Array.from({ length: 18 }, (_, index) => h("button", { type: "button" }, "B" + index))),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await checkRow(page);
    await page.close();
  });
});

describe("Vue bare boolean props", () => {
  it("reads a bare boolean attribute as true, as Vue does", async () => {
    const path = await bundle("vue-bare-boolean", `
      import { createApp } from "vue/dist/vue.esm-bundler.js";
      import { Avatar } from "@threadlabs/looma/vue";
      createApp({ components: { Avatar }, template: '<Avatar id="bare" name="Ada Lovelace" decorative /><Avatar id="named" name="Ada Lovelace" />' }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await page.waitForSelector("#named");
    assert.equal(await page.locator("#bare").getAttribute("aria-hidden"), "true");
    assert.notEqual(await page.locator("#named").getAttribute("aria-hidden"), "true");
    await page.close();
  });
});

describe("Mention rows", () => {
  it("keep the highlighted row's initials circle distinct from the highlight", async () => {
    const path = await bundle("html-mention-row-contrast", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ul role="listbox">
        <ui-editor-mention-menu-item id="active" value="ada" initials="AL" aria-selected="true">Ada Lovelace</ui-editor-mention-menu-item>
        <ui-editor-mention-menu-item id="photo" value="grace" aria-selected="true"><ui-avatar slot="start" name="Grace Hopper" size="sm"></ui-avatar>Grace Hopper</ui-editor-mention-menu-item>
      </ul>`, [join(root, "tokens.css"), join(root, "theme-light.css")]);
    await page.waitForSelector('#photo [data-component~="ui-avatar"]');
    const colours = (id: string) => page.evaluate((selector) => {
      const row = document.querySelector<HTMLElement>(selector)!;
      return { row: getComputedStyle(row).backgroundColor, circle: getComputedStyle(row.querySelector(".avatar")!).backgroundColor };
    }, id);
    const active = await colours("#active");
    assert.notEqual(active.circle, active.row, "the initials circle stands apart from the highlighted row");
    assert.equal((await colours("#photo")).circle, "rgba(0, 0, 0, 0)", "a slotted photo avatar brings its own circle");
    await page.close();
  });
});

describe("Vue editor entry point", () => {
  it("renders authored mention rows from the editor entry alone", async () => {
    const path = await bundle("vue-editor-mention-rows", `
      import { createApp, h } from "vue";
      import { EditorMentionMenuItem } from "@threadlabs/looma/vue/editor";
      createApp({ render: () => h("ul", { role: "listbox" }, [h(EditorMentionMenuItem, { id: "ada", value: "ada", initials: "AL", detail: "ada@example.com" }, () => "Ada Lovelace")]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await page.waitForSelector("#ada");
    assert.equal(await page.locator("#ada").getAttribute("role"), "option");
    assert.match(await page.locator("#ada").innerText(), /Ada Lovelace\s+ada@example.com/);
    await page.close();
  });
});

describe("Avatar group xs", () => {
  it("overlaps xs avatars and sizes the +N badge to match", async () => {
    const path = await bundle("html-avatar-group-xs", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-avatar-group id="xs" size="xs" max="2" label="Looked after by">
        <ui-avatar name="Ada Lovelace" size="xs"></ui-avatar>
        <ui-avatar name="Grace Hopper" size="xs"></ui-avatar>
        <ui-avatar name="Alan Turing" size="xs"></ui-avatar>
      </ui-avatar-group>
      <ui-avatar-group id="md" label="People"><ui-avatar name="Ada Lovelace"></ui-avatar><ui-avatar name="Grace Hopper"></ui-avatar></ui-avatar-group>`, [join(root, "tokens.css"), join(root, "theme-light.css")]);
    await page.waitForSelector('#xs [data-component~="ui-avatar"]');
    const layout = (id: string) => page.evaluate((selector) => {
      const group = document.querySelector(selector)!;
      const avatars = [...group.querySelectorAll<HTMLElement>('[data-component~="ui-avatar"]')].filter((element) => element.getBoundingClientRect().width > 0);
      const badge = group.querySelector<HTMLElement>(".overflow")!;
      const [first, second] = avatars.map((element) => element.getBoundingClientRect());
      return { overlap: first!.right - second!.left, avatar: first!.height, badge: badge.hidden ? 0 : badge.getBoundingClientRect().height, text: badge.textContent?.trim() };
    }, id);
    const [xs, md] = [await layout("#xs"), await layout("#md")];
    assert.equal(xs.badge, xs.avatar, "the +N badge is the xs avatar's size");
    assert.ok(xs.avatar < 24, "the avatars are xs");
    assert.equal(xs.text, "+1");
    assert.ok(xs.overlap > 0 && xs.overlap < md.overlap, `xs avatars overlap less (${xs.overlap}px) than md (${md.overlap}px)`);
    await page.close();
  });
});

describe("Small pill button and small menu", () => {
  it("draws an xs pill at 24px with fully rounded ends", async () => {
    const path = await bundle("html-button-xs-pill", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-button id="xs" variant="ghost" tone="neutral" size="xs" shape="pill">On track</ui-button>
      <ui-button id="sm" size="sm">Small</ui-button>`, [join(root, "tokens.css"), join(root, "theme-light.css")]);
    await page.waitForSelector('#xs[data-component~="ui-button"]');
    const xs = await page.evaluate(() => {
      const button = document.querySelector<HTMLElement>("#xs")!;
      const style = getComputedStyle(button);
      return { height: button.getBoundingClientRect().height, radius: parseFloat(style.borderTopLeftRadius), font: parseFloat(style.fontSize) };
    });
    const smFont = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector("#sm")!).fontSize));
    assert.equal(xs.height, 24);
    const padding = await page.evaluate(() => { const style = getComputedStyle(document.querySelector("#xs")!); return [style.paddingTop, style.paddingLeft]; });
    assert.deepEqual(padding, ["3px", "5px"], "an avatar inside the pill keeps a pixel of room from its edge");
    assert.ok(xs.radius >= xs.height / 2, `pill radius ${xs.radius}px rounds the ends fully`);
    assert.ok(xs.font < smFont, "xs text is smaller than sm text");
    await page.close();
  });

  it("holds an open menu's ghost trigger lighter than its hover", async () => {
    const path = await bundle("html-ghost-open", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-button id="hovered" variant="ghost" tone="neutral">Hovered</ui-button>
      <ui-button id="open" variant="ghost" tone="neutral" aria-expanded="true">Open</ui-button>`, [join(root, "tokens.css"), join(root, "theme-light.css")]);
    await page.waitForSelector('#open[data-component~="ui-button"]');
    await page.hover("#hovered");
    await page.waitForTimeout(300);
    const lightness = (id: string) => page.evaluate((selector) => {
      const canvas = document.createElement("canvas").getContext("2d")!;
      canvas.fillStyle = getComputedStyle(document.querySelector(selector)!).backgroundColor;
      canvas.fillRect(0, 0, 1, 1);
      const [r, g, b] = canvas.getImageData(0, 0, 1, 1).data;
      return r + g + b;
    }, id);
    assert.ok(await lightness("#open") > await lightness("#hovered"), "the open trigger is lighter than hover");
    await page.close();
  });

  it("sizes a small menu's rows and checks the chosen radio item", async () => {
    const path = await bundle("html-menu-sm", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-menu id="sm" inline size="sm" aria-label="Stage">
        <ui-menu-item type="radio" value="early">Early</ui-menu-item>
        <ui-menu-item type="radio" value="on" checked>On track</ui-menu-item>
      </ui-menu>
      <ui-menu id="md" inline aria-label="Standard">
        <ui-menu-item value="a">Standard</ui-menu-item>
      </ui-menu>`, [join(root, "tokens.css"), join(root, "theme-light.css")]);
    await page.waitForSelector('#md [data-component~="ui-menu-item"]');
    const row = (selector: string) => page.evaluate((target) => {
      const item = document.querySelector<HTMLElement>(target)!;
      return { height: item.getBoundingClientRect().height, font: parseFloat(getComputedStyle(item).fontSize) };
    }, selector);
    const [small, standard] = [await row('#sm [data-component~="ui-menu-item"]'), await row('#md [data-component~="ui-menu-item"]')];
    assert.ok(small.height < standard.height, `small rows (${small.height}px) are shorter than standard (${standard.height}px)`);
    assert.ok(small.font < standard.font, "small rows use smaller text");
    const widths = await page.evaluate(() => ["#sm", "#md"].map((id) => document.querySelector(id)!.getBoundingClientRect().width));
    assert.ok(widths[0]! < widths[1]!, `a small menu (${widths[0]}px) is narrower than a standard one (${widths[1]}px)`);
    const checks = await page.evaluate(() => [...document.querySelectorAll('#sm [data-component~="ui-menu-item"]')]
      .map((item) => Boolean(item.querySelector(".indicator svg"))));
    assert.deepEqual(checks, [false, true]);
    await page.close();
  });
});

describe("Avatar sizes", () => {
  it("steps down from md to sm to xs, with initials that still fit", async () => {
    const path = await bundle("html-avatar-sizes", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-avatar id="md" name="Ada Lovelace"></ui-avatar>
      <ui-avatar id="sm" name="Ada Lovelace" size="sm"></ui-avatar>
      <ui-avatar id="xs" name="Ada Lovelace" size="xs"></ui-avatar>`, [join(root, "tokens.css"), join(root, "theme-light.css")]);
    await page.waitForSelector('#xs[data-component~="ui-avatar"]');
    const measure = (id: string) => page.evaluate((selector) => {
      const element = document.querySelector<HTMLElement>(selector)!;
      // The sizes are the circle inside its 1px border.
      return { width: element.clientWidth, height: element.clientHeight, fontSize: parseFloat(getComputedStyle(element).fontSize), fits: element.scrollWidth <= element.clientWidth };
    }, id);
    const [md, sm, xs] = [await measure("#md"), await measure("#sm"), await measure("#xs")];
    assert.deepEqual([md.width, sm.width, xs.width], [40, 28, 20]);
    assert.equal(xs.height, 20);
    assert.ok(xs.fontSize < sm.fontSize && sm.fontSize < md.fontSize, "initials shrink with each size");
    assert.ok(xs.fits, "xs initials fit inside the circle");
    await page.close();
  });

  it("centres the initials in the circle whatever line of text surrounds it", async () => {
    const path = await bundle("html-avatar-centred", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <span style="font-size: 12px; line-height: 2.2">Looked after by: <ui-avatar id="inline" name="Grace Hopper" size="xs"></ui-avatar> Grace</span>
      <ui-avatar id="alone" name="Grace Hopper" size="xs"></ui-avatar>`, [join(root, "tokens.css"), join(root, "theme-light.css")]);
    await page.waitForSelector('#inline[data-component~="ui-avatar"]');
    const offset = (id: string) => page.evaluate((selector) => {
      const avatar = document.querySelector<HTMLElement>(selector)!;
      const text = [...avatar.querySelectorAll("*"), avatar].map((element) => [...element.childNodes])
        .flat().find((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())!;
      const range = document.createRange();
      range.selectNodeContents(text);
      const glyphs = range.getBoundingClientRect();
      const circle = avatar.getBoundingClientRect();
      return (glyphs.top + glyphs.height / 2) - (circle.top + circle.height / 2);
    }, id);
    const [inline, alone] = [await offset("#inline"), await offset("#alone")];
    assert.ok(Math.abs(inline) <= 1, `initials sit ${inline}px off centre inside a line of text`);
    assert.ok(Math.abs(inline - alone) <= 0.5, "an avatar's initials sit the same in a line of text as on their own");
    await page.close();
  });
});

describe("Avatar initials", () => {
  it("meet text contrast on their surface", async () => {
    const path = await bundle("html-avatar-contrast", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-avatar id="person" name="Ada Lovelace"></ui-avatar>
      <ui-badge id="badge" tone="accent" variant="subtle">Tag</ui-badge>`, [join(root, "tokens.css"), join(root, "theme-light.css")]);
    await page.waitForSelector('#person[data-component~="ui-avatar"]');
    await page.waitForSelector('#badge[data-component~="ui-badge"]');
    // Text on the soft accent surface is the theme's subtle accent text, as a subtle accent badge's is:
    // a theme whose accent is too light to read on its own soft tint tunes that one token for both.
    const colour = (id: string) => page.evaluate((selector) => getComputedStyle(document.querySelector(selector)!).color, id);
    assert.equal(await colour("#person"), await colour("#badge"));
    const ratio = await page.evaluate(() => {
      // Resolve any CSS colour (oklch, color-mix) to sRGB the way the browser paints it.
      const context = document.createElement("canvas").getContext("2d")!;
      const rgb = (color: string) => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
      };
      const luminance = (channels: number[]) => {
        const [r, g, b] = channels.map((value) => {
          const c = value / 255;
          return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
      };
      const style = getComputedStyle(document.querySelector("#person")!);
      const [light, dark] = [luminance(rgb(style.color)), luminance(rgb(style.backgroundColor))].sort((a, b) => b - a);
      return (light! + 0.05) / (dark! + 0.05);
    });
    assert.ok(ratio >= 4.5, `initials contrast is ${ratio.toFixed(2)}:1`);
    await page.close();
  });
});

describe("Text tokens", () => {
  // Every token meant for readable text, on every surface a component paints it on. Disabled text
  // is exempt (WCAG 1.4.3), so --ui-disabled-text is not here.
  // The last five are ui-text's tones: accent, danger, success, info, and warning.
  const texts = [
    "--ui-text", "--ui-text-primary", "--ui-text-secondary", "--ui-text-muted", "--ui-control-placeholder",
    "--ui-accent-active", "--ui-danger", "--ui-success", "--ui-info-subtle-text", "--ui-warning-subtle-text",
  ];
  const surfaces = [
    "--ui-surface", "--ui-surface-canvas", "--ui-surface-default", "--ui-surface-raised", "--ui-surface-elevated",
    "--ui-surface-sunken", "--ui-surface-subtle", "--ui-surface-muted", "--ui-surface-hover", "--ui-control-surface",
  ];
  const themes = [
    { name: "light", attributes: "", media: {} },
    { name: "dark", attributes: `data-theme="dark"`, media: {} },
    { name: "dark by preference", attributes: "", media: { colorScheme: "dark" } },
    { name: "high contrast", attributes: `data-contrast="high"`, media: {} },
    { name: "high contrast by preference", attributes: "", media: { contrast: "more" } },
  ] as const;

  it("reach 4.5:1 on every surface, in every theme, primary to muted", async () => {
    const css = ["tokens.css", "theme-light.css", "theme-dark.css", "theme-high-contrast.css"].map((file) => join(root, file));
    const failures: string[] = [];
    for (const theme of themes) {
      const page = await browser.newPage();
      await page.emulateMedia(theme.media);
      await page.setContent(`<!doctype html><html ${theme.attributes}><body><span id="probe"></span></body></html>`);
      for (const path of css) await page.addStyleTag({ path });
      const ratios = await page.evaluate(({ texts, surfaces }) => {
        const probe = document.querySelector<HTMLElement>("#probe")!;
        // Resolve the token (a color-mix) as the browser paints it: computed, then drawn to sRGB.
        const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
        const luminance = (token: string) => {
          probe.style.color = `var(${token})`;
          context.clearRect(0, 0, 1, 1);
          context.fillStyle = getComputedStyle(probe).color;
          context.fillRect(0, 0, 1, 1);
          const [r, g, b] = [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)].map((value) => {
            const c = value / 255;
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
        };
        return texts.map((text) => surfaces.map((surface) => {
          const [light, dark] = [luminance(text), luminance(surface)].sort((a, b) => b - a);
          return (light! + 0.05) / (dark! + 0.05);
        }));
      }, { texts, surfaces });
      texts.forEach((text, row) => surfaces.forEach((surface, column) => {
        const ratio = ratios[row]![column]!;
        if (ratio < 4.5) failures.push(`${theme.name}: ${text} on ${surface} is ${ratio.toFixed(2)}:1`);
      }));
      // The hierarchy holds: each step is lighter than the one above it, on the page.
      const [primary, secondary, muted] = ["--ui-text", "--ui-text-secondary", "--ui-text-muted"].map((token) => ratios[texts.indexOf(token)]![0]!);
      if (!(primary > secondary && secondary > muted)) {
        failures.push(`${theme.name}: primary ${primary.toFixed(2)}, secondary ${secondary.toFixed(2)}, muted ${muted.toFixed(2)} are out of order`);
      }
      await page.close();
    }
    assert.deepEqual(failures, []);
  });

  it("keep warning text readable when a theme picks a bright amber", async () => {
    // Amber is the lightest intent, so a theme's vivid warning seed must not drag its text under 4.5:1.
    const css = ["tokens.css", "theme-light.css"].map((file) => join(root, file));
    const failures: string[] = [];
    for (const seed of ["#cc8800", "#e5a000"]) {
      const page = await browser.newPage();
      await page.setContent(`<!doctype html><html><body><span id="probe"></span></body></html>`);
      for (const path of css) await page.addStyleTag({ path });
      await page.addStyleTag({ content: `:root { --ui-warning: ${seed}; }` });
      const ratios = await page.evaluate((surfaces) => {
        const probe = document.querySelector<HTMLElement>("#probe")!;
        const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
        const luminance = (token: string) => {
          probe.style.color = `var(${token})`;
          context.clearRect(0, 0, 1, 1);
          context.fillStyle = getComputedStyle(probe).color;
          context.fillRect(0, 0, 1, 1);
          const [r, g, b] = [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)].map((value) => {
            const c = value / 255;
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
        };
        return surfaces.map((surface) => {
          const [light, dark] = [luminance("--ui-warning-subtle-text"), luminance(surface)].sort((a, b) => b - a);
          return [surface, (light! + 0.05) / (dark! + 0.05)] as const;
        });
      }, ["--ui-surface", "--ui-surface-subtle", "--ui-surface-muted", "--ui-warning-soft"]);
      for (const [surface, ratio] of ratios) {
        if (ratio < 4.5) failures.push(`${seed}: warning text on ${surface} is ${ratio.toFixed(2)}:1`);
      }
      await page.close();
    }
    assert.deepEqual(failures, []);
  });
});

describe("Tree link rows", () => {
  const markup = `
    <ui-tree label="Pages">
      <ui-tree-item id="page" item-id="page" label="Welcome">
        <span slot="leading" id="page-icon">icon</span>
        <a slot="label" id="page-link" href="#welcome">Welcome</a>
        <span slot="actions"><button id="page-action" type="button">More</button><div role="menu"><div role="menuitem" id="page-menu-item" tabindex="-1">Move up</div></div></span>
      </ui-tree-item>
      <ui-tree-item id="plain" item-id="plain" label="Plain">
        <span slot="leading" id="plain-icon">icon</span>
      </ui-tree-item>
      <ui-tree-item id="folder" item-id="folder" label="Folder" container>
        <span slot="leading" id="folder-icon">icon</span>
        <div slot="actions" role="menu"><div role="menuitem" id="folder-menu-item" tabindex="-1">Rename</div></div>
      </ui-tree-item>
    </ui-tree>`;

  async function checkRows(page: Page) {
    await page.waitForSelector('#folder[data-component~="ui-tree-item"]');
    await page.evaluate(() => {
      (window as unknown as { clicks: { meta: boolean }[] }).clicks = [];
      document.querySelector("#page-link")!.addEventListener("click", (event) => {
        (window as unknown as { clicks: { meta: boolean }[] }).clicks.push({ meta: (event as MouseEvent).metaKey });
      });
    });
    const clicks = () => page.evaluate(() => (window as unknown as { clicks: { meta: boolean }[] }).clicks);

    // The icon of a leaf row whose label is a link follows the link.
    await page.locator("#page-icon").click();
    await page.waitForFunction(() => location.hash === "#welcome");
    assert.deepEqual(await clicks(), [{ meta: false }]);
    // A modified click carries its modifiers to the link.
    await page.locator("#page-icon").click({ modifiers: ["Meta"] });
    assert.deepEqual((await clicks()).at(-1), { meta: true });

    // Controls keep their own behaviour.
    const before = (await clicks()).length;
    await page.locator("#page").hover();
    await page.locator("#page-action").click({ force: true });
    assert.equal((await clicks()).length, before, "a control does not follow the label link");
    // Nor does an item of a menu the row holds, such as its options.
    await page.locator("#page-menu-item").click({ force: true });
    assert.equal((await clicks()).length, before, "a menu item in the row does not follow the label link");

    // A leaf without a link does nothing; a branch still toggles.
    await page.locator("#plain-icon").click();
    const expanded = () => page.evaluate(() => {
      const folder = document.querySelector("#folder")!;
      const item = folder.matches('[role="treeitem"]') ? folder : folder.querySelector('[role="treeitem"]');
      return item?.getAttribute("aria-expanded");
    });
    assert.equal(await expanded(), "false");
    await page.locator("#folder-menu-item").click({ force: true });
    assert.equal(await expanded(), "false", "a menu item in a branch row does not toggle it");
    await page.locator("#folder-icon").click();
    await page.waitForFunction(() => {
      const folder = document.querySelector("#folder")!;
      const item = folder.matches('[role="treeitem"]') ? folder : folder.querySelector('[role="treeitem"]');
      return item?.getAttribute("aria-expanded") === "true";
    });
  }

  it("follows a leaf row's label link from the rest of the row, in HTML", async () => {
    const path = await bundle("html-tree-link-rows", `import "@threadlabs/looma";`);
    const page = await open(path, markup, [join(root, "tokens.css")]);
    await checkRows(page);
    await page.close();
  });

  it("follows a leaf row's label link from the rest of the row, in Vue", async () => {
    const path = await bundle("vue-tree-link-rows", `
      import { createApp, h } from "vue";
      import { Tree, TreeItem } from "@threadlabs/looma/vue";
      createApp({ render: () => h(Tree, { label: "Pages" }, () => [
        h(TreeItem, { id: "page", itemId: "page", label: "Welcome" }, {
          leading: () => h("span", { id: "page-icon" }, "icon"),
          label: () => h("a", { id: "page-link", href: "#welcome" }, "Welcome"),
          actions: () => h("span", [
            h("button", { id: "page-action", type: "button" }, "More"),
            h("div", { role: "menu" }, [h("div", { role: "menuitem", id: "page-menu-item", tabindex: -1 }, "Move up")]),
          ]),
        }),
        h(TreeItem, { id: "plain", itemId: "plain", label: "Plain" }, { leading: () => h("span", { id: "plain-icon" }, "icon") }),
        h(TreeItem, { id: "folder", itemId: "folder", label: "Folder", container: true }, {
          leading: () => h("span", { id: "folder-icon" }, "icon"),
          actions: () => h("div", { role: "menu" }, [h("div", { role: "menuitem", id: "folder-menu-item", tabindex: -1 }, "Rename")]),
        }),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await checkRows(page);
    await page.close();
  });
});

describe("Nested Tree disclosure state", () => {
  async function checkDisclosureState(page: Page) {
    const parent = page.locator('#parent[data-component~="ui-tree-item"]');
    const branch = page.locator('#branch[data-component~="ui-tree-item"]');
    const leaf = page.locator('#leaf[data-component~="ui-tree-item"]');
    await parent.waitFor({ state: "visible" });
    assert.equal(await parent.getAttribute("aria-expanded"), "true");
    assert.equal(await branch.getAttribute("aria-expanded"), "false");
    assert.equal(await leaf.isVisible(), false);
    const arrow = async (id: string) => page.locator(`#${id} > .row > .disclosure > .disclosure-icon`)
      .evaluate(element => getComputedStyle(element).transform);
    const expanded = await arrow("parent");
    const collapsed = await arrow("branch");
    assert.notEqual(collapsed, expanded, "an expanded ancestor must not rotate a collapsed descendant's disclosure");

    await branch.getByRole("button", { name: "Expand Branch", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("#branch")?.getAttribute("aria-expanded") === "true");
    assert.equal(await leaf.isVisible(), true);
    assert.equal(await arrow("branch"), expanded);
    await branch.getByRole("button", { name: "Collapse Branch", exact: true }).click();
    await page.waitForFunction(() => document.querySelector("#branch")?.getAttribute("aria-expanded") === "false");
    assert.equal(await leaf.isVisible(), false);
    assert.equal(await arrow("branch"), collapsed);
    assert.equal(await arrow("parent"), expanded, "a descendant's collapse must leave its ancestor's disclosure expanded");
  }

  it("shows a collapsed descendant's own state under an expanded ancestor in HTML", async () => {
    const path = await bundle("html-nested-tree-disclosure", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-tree label="Files">
        <ui-tree-item id="parent" item-id="parent" label="Parent" container expanded>
          <ui-tree-item id="branch" item-id="branch" label="Branch" container>
            <ui-tree-item id="leaf" item-id="leaf" label="File"></ui-tree-item>
          </ui-tree-item>
        </ui-tree-item>
      </ui-tree>`, [join(root, "tokens.css")], { reducedMotion: "reduce" });
    await checkDisclosureState(page);
    await page.close();
  });

  it("shows a collapsed descendant's own state under an expanded ancestor in Vue", async () => {
    const path = await bundle("vue-nested-tree-disclosure", `
      import { createApp, h } from "vue";
      import { Tree, TreeItem } from "@threadlabs/looma/vue";
      createApp({ render: () => h(Tree, { label: "Files" }, () => [
        h(TreeItem, { id: "parent", itemId: "parent", label: "Parent", container: true, expanded: true }, () => [
          h(TreeItem, { id: "branch", itemId: "branch", label: "Branch", container: true }, () => [
            h(TreeItem, { id: "leaf", itemId: "leaf", label: "File" }),
          ]),
        ]),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")], { reducedMotion: "reduce" });
    await checkDisclosureState(page);
    await page.close();
  });
});

describe("Tree drag handle", () => {
  async function checkHandles(page: Page) {
    await page.waitForSelector('#leaf[data-component~="ui-tree-item"]');
    await page.locator("#leaf-icon").hover();
    const leaf = await page.evaluate(() => {
      const item = document.querySelector("#leaf")!;
      const handle = item.querySelector(".drag-handle") as HTMLElement;
      const icon = document.querySelector("#leaf-icon")!.getBoundingClientRect();
      return { gap: icon.left - handle.getBoundingClientRect().right, background: getComputedStyle(handle).backgroundColor };
    });
    // A nested leaf's handle sits right before its icon, not a column and an indent away.
    assert.ok(leaf.gap >= 0 && leaf.gap <= 8, `handle-to-icon gap ${leaf.gap}px`);
    // Bare at rest: no faint surface behind the grip.
    assert.equal(leaf.background, "rgba(0, 0, 0, 0)");

    await page.locator("#branch-icon").hover();
    const branch = await page.evaluate(() => {
      const item = document.querySelector("#branch")!;
      const handle = item.querySelector(":scope > .row > .drag-handle, .row > .drag-handle") as HTMLElement;
      const disclosure = item.querySelector(".disclosure") as HTMLElement;
      return { handleRight: handle.getBoundingClientRect().right, disclosureLeft: disclosure.getBoundingClientRect().left };
    });
    // A branch keeps its disclosure; its handle sits just outside it rather than on top of it.
    assert.ok(branch.handleRight <= branch.disclosureLeft + 1, `branch handle ends at ${branch.handleRight}, disclosure starts at ${branch.disclosureLeft}`);
    assert.ok(branch.disclosureLeft - branch.handleRight <= 6, "and close to it");
  }

  it("sits beside what it drags and is bare at rest, in HTML", async () => {
    const path = await bundle("html-tree-drag-handle", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-tree label="Pages" style="width: 20rem; margin-inline-start: 3rem">
        <ui-tree-item id="branch" item-id="branch" label="Folder" sortable expanded>
          <span slot="leading" id="branch-icon">F</span>
          <ui-tree-item id="leaf" item-id="leaf" label="Page" sortable>
            <span slot="leading" id="leaf-icon">P</span>
          </ui-tree-item>
        </ui-tree-item>
      </ui-tree>`, [join(root, "tokens.css")]);
    await checkHandles(page);
    await page.close();
  });

  it("sits beside what it drags and is bare at rest, in Vue", async () => {
    const path = await bundle("vue-tree-drag-handle", `
      import { createApp, h } from "vue";
      import { Tree, TreeItem } from "@threadlabs/looma/vue";
      createApp({ render: () => h(Tree, { label: "Pages", style: "width: 20rem; margin-inline-start: 3rem" }, () => [
        h(TreeItem, { id: "branch", itemId: "branch", label: "Folder", sortable: true, expanded: true }, {
          leading: () => h("span", { id: "branch-icon" }, "F"),
          default: () => [h(TreeItem, { id: "leaf", itemId: "leaf", label: "Page", sortable: true }, { leading: () => h("span", { id: "leaf-icon" }, "P") })],
        }),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await checkHandles(page);
    await page.close();
  });
});

describe("Icon", () => {
  const shapes = (page: Page, selector: string) =>
    page.locator(`${selector} svg`).evaluate((svg) => [...svg.querySelectorAll("path, circle, rect, line")].map((shape) => shape.localName));

  // Only a binding or a framework adapter changes a rendered component's options, and a plain page has
  // neither, so "follows its name" is proven in Vue below.
  it("lowers from HTML already drawn", async () => {
    const path = await bundle("html-icon", `import "@threadlabs/looma";`);
    // Records each icon as it enters the document, before anything else has had a chance to run.
    const page = await open(path, `
      <script>
        window.firstSeen = {};
        new MutationObserver((records) => {
          for (const node of records.flatMap((record) => [...record.addedNodes])) {
            if (node.localName === "span" && node.id) firstSeen[node.id] = [...node.querySelectorAll("path, circle, rect, line")].map((shape) => shape.localName);
          }
        }).observe(document.body, { childList: true, subtree: true });
      </script>
      <ui-icon id="authored" name="italic"></ui-icon>
      <ui-icon id="unknown" name="not-an-icon"></ui-icon>
    `, [join(root, "tokens.css")]);
    await page.waitForSelector("span#authored");
    assert.deepEqual(await page.evaluate(() => (window as unknown as { firstSeen: unknown }).firstSeen), {
      authored: ["line", "line", "line"],
      unknown: [],
    });
    assert.equal(await page.locator("#authored").getAttribute("aria-hidden"), "true");
    await page.close();
  });

  it("follows its name, in Vue", async () => {
    const path = await bundle("vue-icon", `
      import { createApp, h, ref } from "vue";
      import { Icon } from "@threadlabs/looma/vue";
      const name = ref("circle-x");
      window.iconName = name;
      createApp({ render: () => h(Icon, { id: "icon", name: name.value }) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    assert.deepEqual(await shapes(page, "#icon"), ["circle", "path", "path"]);
    await page.evaluate(() => { (window as unknown as { iconName: { value: string } }).iconName.value = "columns"; });
    await page.waitForFunction(() => document.querySelector("#icon rect") !== null);
    assert.deepEqual(await shapes(page, "#icon"), ["rect", "path", "path"]);
    await page.evaluate(() => { (window as unknown as { iconName: { value: string } }).iconName.value = ""; });
    await page.waitForFunction(() => document.querySelector("#icon svg")?.children.length === 0);
    await page.close();
  });
});

describe("Icon Button", () => {
  it("matches adjacent Buttons when requested without resizing compact icon controls", async () => {
    for (const adapter of ["vue", "html"]) {
      const path = await bundle(`${adapter}-matched-icon-button`, adapter === "vue" ? `
        import { createApp, h } from "vue";
        import { Button, IconButton, Icon } from "@threadlabs/looma/vue";
        createApp({ render: () => h("div", {}, [
          ...["sm", "md", "lg"].map(size => h("div", { style: "display: flex; align-items: stretch", id: size }, [
            h(Button, { id: size + "-primary", size }, () => "Save changes"),
            h(IconButton, { id: size + "-more", size, matchButton: true, variant: "outline", label: "More options" }, () => h(Icon, { name: "chevron-down" })),
          ])),
          h(IconButton, { id: "compact", size: "sm", label: "Toolbar options" }, () => h(Icon, { name: "chevron-down" })),
        ]) }).mount("#app");
      ` : `import "@threadlabs/looma";`);
      const body = adapter === "vue" ? '<div id="app"></div>' : `
        ${["sm", "md", "lg"].map(size => `<div style="display: flex; align-items: stretch" id="${size}">
          <ui-button id="${size}-primary" size="${size}">Save changes</ui-button>
          <ui-icon-button id="${size}-more" size="${size}" match-button variant="outline" label="More options"><ui-icon name="chevron-down"></ui-icon></ui-icon-button>
        </div>`).join("")}
        <ui-icon-button id="compact" size="sm" label="Toolbar options"><ui-icon name="chevron-down"></ui-icon></ui-icon-button>`;
      for (const touch of [false, true]) {
        const page = await open(path, body, [join(root, "tokens.css"), ...(adapter === "vue" ? [join(root, "vue/components.css")] : [])],
          { viewport: { width: touch ? 375 : 1280, height: 900 }, hasTouch: touch, isMobile: touch });
        // Custom control tokens must work, too; no hard-coded matching dimensions.
        await page.addStyleTag({ content: ":root { --ui-control-size-sm: 36px; --ui-control-size-md: 44px; --ui-control-size-lg: 52px; }" });
        for (const size of ["sm", "md", "lg"]) {
          const bounds = await page.evaluate(size => {
            const primary = document.getElementById(size + "-primary")!.getBoundingClientRect();
            const more = document.getElementById(size + "-more")!.getBoundingClientRect();
            return { primary: { top: primary.top, bottom: primary.bottom }, more: { top: more.top, bottom: more.bottom } };
          }, size);
          assert.deepEqual(bounds.more, bounds.primary, `${adapter} ${size}, touch=${touch}: both edges align`);
        }
        assert.equal(await page.locator("#compact").evaluate(element => element.getBoundingClientRect().height), 28);
        await page.close();
      }
    }
  });

  it("grows its hit area, not its size, once touch is used", async () => {
    const path = await bundle("vue-icon-button-touch", `
      import { createApp, h } from "vue";
      import { IconButton, trackInputModality } from "@threadlabs/looma/vue";
      trackInputModality(document);
      createApp({
        render: () => h("div", { style: "padding: 40px" }, [h(IconButton, { id: "menu", size: "sm", label: "Options" }, () => "…")]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const probe = () => page.evaluate(() => {
      const button = document.querySelector("#menu") as HTMLElement;
      const bounds = button.getBoundingClientRect();
      const outside = document.elementFromPoint(bounds.right + 6, bounds.top + bounds.height / 2);
      return { width: button.offsetWidth, height: button.offsetHeight, hitOutside: outside === button };
    });
    const before = await probe();
    assert.equal(before.hitOutside, false);
    await page.evaluate(() => document.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "touch" })));
    assert.deepEqual(await probe(), { width: before.width, height: before.height, hitOutside: true });
    await page.close();
  });
});

describe("Tree", () => {
  it("lets a slotted label link fill the row through the label padding tokens", async () => {
    const path = await bundle("vue-tree-label", `
      import { createApp, h } from "vue";
      import { Tree, TreeItem } from "@threadlabs/looma/vue";
      const item = (id, style) => h(TreeItem, { id, itemId: id, label: "Welcome", style }, {
        label: () => h("a", { href: "#welcome", style: "display: flex; align-self: stretch; align-items: center" }, "Welcome"),
      });
      createApp({
        render: () => h(Tree, { label: "Pages" }, () => [
          item("flush", "--ui-tree-item-min-block-size: 44px; --ui-tree-item-label-padding-block: 0; --ui-tree-item-label-padding-inline: 0"),
          item("padded", "--ui-tree-item-min-block-size: 44px"),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const heights = (id: string) => page.locator(`#${id}`).evaluate((item) => ({
      row: (item.querySelector(".row") as HTMLElement).offsetHeight,
      link: (item.querySelector("a") as HTMLElement).offsetHeight,
    }));
    const flush = await heights("flush");
    assert.equal(flush.row, 44);
    assert.equal(flush.link, 44, "with zero label padding the link is the whole row");
    const padded = await heights("padded");
    assert.ok(padded.link < padded.row, "default label padding still insets the content");
    await page.close();
  });
});

describe("Overlays", () => {
  it("show search focus and close a dismissible search shell on the first Escape, even from its search field", async () => {
    const path = await bundle("vue-search-shell", `
      import { createApp, h, ref } from "vue";
      import { SearchShell } from "@threadlabs/looma/vue";
      const open = ref(true);
      const closes = [];
      window.closes = closes;
      createApp({
        render: () => h(SearchShell, {
          id: "search", open: open.value, modal: true, dismissible: true, label: "Search",
          onClose: (event) => { closes.push(event.detail); open.value = false; },
        }, { search: () => h("input", { id: "query", type: "search", "aria-label": "Search" }) }),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const field = page.locator("#query");
    await field.fill("wel");
    assert.equal(await field.evaluate((element) => element === document.activeElement), true);
    assert.notEqual(await field.evaluate((element) => getComputedStyle(element).outlineStyle), "none", "the search field shows focus");
    await page.keyboard.press("Escape");
    assert.deepEqual(await page.evaluate(() => (window as unknown as { closes: unknown[] }).closes), [
      { open: false, reason: "escape", trigger: "keyboard" },
    ]);
    assert.equal(await page.locator("#search dialog").evaluate((dialog) => (dialog as HTMLDialogElement).open), false);
    await page.close();
  });
  it("announce each anchor toggle to a controlled popover consumer exactly once, with its trigger", async () => {
    const path = await bundle("vue-popover-controlled", `
      import { createApp, h, ref } from "vue";
      import { Button, Popover } from "@threadlabs/looma/vue";
      const open = ref(false);
      const events = [];
      window.popover = { open, events };
      createApp({
        render: () => h("div", [
          h(Button, { id: "trigger" }, () => "Icon"),
          h(Popover, {
            id: "picker", for: "trigger", open: open.value,
            onOpen: (event) => { events.push(["open", event.detail]); open.value = true; },
            onClose: (event) => { events.push(["close", event.detail]); open.value = false; },
          }, () => "Choose an icon"),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    type Probe = { popover: { open: { value: boolean }, events: unknown[] } };
    const state = () => page.evaluate(() => {
      const { open, events } = (window as unknown as Probe).popover;
      return { open: open.value, events };
    });
    await page.locator("#trigger").click();
    await page.locator("#picker").waitFor({ state: "visible" });
    assert.deepEqual(await state(), { open: true, events: [["open", { open: true, reason: "action", trigger: "pointer" }]] });
    await page.locator("#trigger").click();
    await page.locator("#picker").waitFor({ state: "hidden" });
    assert.deepEqual(await state(), {
      open: false,
      events: [
        ["open", { open: true, reason: "action", trigger: "pointer" }],
        ["close", { open: false, reason: "action", trigger: "pointer" }],
      ],
    });
    // The consumer can close it too, and the anchor then opens it again.
    await page.locator("#trigger").click();
    await page.evaluate(() => { (window as unknown as Probe).popover.open.value = false; });
    await page.locator("#picker").waitFor({ state: "hidden" });
    await page.locator("#trigger").click();
    await page.locator("#picker").waitFor({ state: "visible" });
    await page.close();
  });

  it("give the dialog close button a touch target once touch is used", async () => {
    const path = await bundle("vue-dialog-touch", `
      import { createApp, h } from "vue";
      import { Dialog, trackInputModality } from "@threadlabs/looma/vue";
      trackInputModality(document);
      createApp({ render: () => h(Dialog, { id: "dialog", open: true, closedby: "any", label: "Details" }, () => "Body") }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const close = page.locator("#dialog .close");
    const size = () => close.evaluate((element) => (element as HTMLElement).offsetWidth);
    assert.equal(await size(), 32);
    await page.evaluate(() => document.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "touch" })));
    assert.equal(await size(), 44);
    await page.close();
  });
});

describe("Vue form controls", () => {
  it("select the model's option, and style named slots without slot attributes", async () => {
    const path = await bundle("vue-form", `
      import { createApp, h, ref } from "vue";
      import { FormField, Select } from "@threadlabs/looma/vue";
      const topic = ref("help");
      window.topic = topic;
      createApp({
        render: () => h(FormField, null, {
          label: () => h("label", { id: "topic-label", for: "topic" }, "Topic"),
          default: () => h(Select, { id: "topic", modelValue: topic.value, "onUpdate:modelValue": (value) => { topic.value = value; } }, () => [
            h("option", { value: "problem" }, "Problem"),
            h("option", { value: "help" }, "Help"),
            h("option", { value: "privacy" }, "Privacy"),
          ]),
          help: () => h("p", { id: "topic-help" }, "Pick one."),
        }),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const select = page.locator("#topic");
    assert.equal(await select.inputValue(), "help");
    await page.evaluate(() => { (window as unknown as { topic: { value: string } }).topic.value = "privacy"; });
    await page.waitForFunction(() => (document.querySelector("#topic") as HTMLSelectElement).value === "privacy");
    await select.selectOption("problem");
    assert.equal(await page.evaluate(() => (window as unknown as { topic: { value: string } }).topic.value), "problem");

    const fontSize = (selector: string) => page.locator(selector).evaluate((element) => getComputedStyle(element).fontSize);
    assert.equal(await fontSize("#topic-label"), "14px");
    assert.equal(await fontSize("#topic-help"), "14px");
    // A named slot in Vue has no slot attribute; the field still links its help to the control.
    assert.equal(await select.getAttribute("aria-describedby"), "topic-help");
    await page.close();
  });
});

describe("Help affordance", () => {
  it("sits beside the field and opens its tooltip on click", async () => {
    const path = await bundle("vue-help", `
      import { createApp, h } from "vue";
      import { Combobox } from "@threadlabs/looma/vue";
      createApp({
        render: () => h(Combobox, { id: "where", label: "Destination", help: "Where the export lands." }, () => [
          h("option", { value: "alpha" }, "Alpha"),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const help = page.locator("#where .help");
    const field = page.locator("#where .field");
    const geometry = await page.locator("#where").evaluate((root) => {
      const box = root.querySelector(".field")!.getBoundingClientRect();
      const button = root.querySelector(".help")!.getBoundingClientRect();
      return { outside: button.left >= box.right - 1, insideInput: root.querySelector("input")!.contains(root.querySelector(".help")) };
    });
    assert.equal(geometry.outside, true, "the help button follows the field");
    assert.equal(geometry.insideInput, false);
    assert.equal(await field.locator(".help").count(), 0, "it is not inside the box");

    const tip = page.locator('[data-component~="ui-tooltip"]');
    assert.equal(await tip.isVisible(), false);
    // Hovering a question mark says nothing, so it opens on press and closes the same way.
    await help.hover();
    await page.waitForTimeout(700);
    assert.equal(await tip.isVisible(), false, "hover does not open it");
    await help.click();
    await tip.waitFor({ state: "visible" });
    assert.equal(await help.getAttribute("aria-expanded"), "true");
    await help.click();
    await tip.waitFor({ state: "hidden" });
    await page.close();
  });
});

describe("Combobox with multiple", () => {
  it("creates on Enter when the consumer also owns the query", async () => {
    const path = await bundle("vue-multi-create-query", `
      import { createApp, h, ref } from "vue";
      import { Combobox } from "@threadlabs/looma/vue";
      const options = ref([{ value: "bar", label: "Bar" }]);
      const items = ref([]);
      const query = ref("");
      const created = [];
      window.created = created;
      window.errors = [];
      const app = createApp({
        render: () => h(Combobox, {
          id: "tags", label: "Tags", multiple: true, allowCreate: true, items: items.value,
          query: query.value, "onUpdate:query": (value) => { query.value = value; },
          // Created optimistically: offered and selected at once, confirmed later.
          onCreateItem: (event) => {
            const { query: name } = event.detail;
            created.push(name);
            const option = { value: name.toLowerCase(), label: name };
            options.value = [...options.value, option];
            items.value = [...items.value, { id: option.value, ...option }];
          },
        }, () => options.value.map((option) => h("option", { key: option.value, value: option.value }, option.label))),
      });
      app.config.errorHandler = (error) => { window.errors.push(String(error && error.stack || error)); };
      app.mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const input = page.locator("#tags input");
    await input.click();
    await input.pressSequentially("Foo");
    await input.press("Enter");
    await page.waitForTimeout(300);
    assert.deepEqual(await page.evaluate(() => (window as unknown as { errors: string[] }).errors), []);
    assert.deepEqual(await page.evaluate(() => (window as unknown as { created: string[] }).created), ["Foo"]);
    assert.deepEqual(await page.locator("#tags .item").allTextContents(), ["Foo"]);
    assert.equal(await input.inputValue(), "");
    await page.close();
  });

  it("offers to create what was typed, creates it on Enter, and checks it once the consumer adds it", async () => {
    const path = await bundle("vue-multi-create", `
      import { createApp, h, ref } from "vue";
      import { Combobox } from "@threadlabs/looma/vue";
      const options = ref([{ value: "bar", label: "Bar" }]);
      const items = ref([]);
      const created = [];
      window.created = created;
      createApp({
        render: () => h(Combobox, {
          id: "tags", label: "Tags", multiple: true, allowCreate: true, items: items.value,
          // A consumer creates asynchronously, then offers and selects the new option.
          onCreateItem: (event) => {
            const { query } = event.detail;
            created.push(query);
            setTimeout(() => {
              const option = { value: query.toLowerCase(), label: query };
              options.value = [...options.value, option];
              items.value = [...items.value, { id: option.value, ...option }];
            }, 50);
          },
        }, () => options.value.map((option) => h("option", { key: option.value, value: option.value }, option.label))),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const input = page.locator("#tags input");
    await input.click();
    await input.pressSequentially("Foo");

    // Nothing matches, so the offer to create is the choice Enter makes, and it looks it.
    const create = page.locator('#tags [role="option"]', { hasText: "Create" });
    await create.waitFor();
    assert.equal(await input.getAttribute("aria-activedescendant"), await create.getAttribute("id"));

    await input.press("Enter");
    assert.deepEqual(await page.evaluate(() => (window as unknown as { created: string[] }).created), ["Foo"]);

    // Once the consumer adds it, it is checked in the list without another keystroke.
    const foo = page.locator('#tags [role="option"]', { hasText: /^Foo$/ });
    await foo.waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('#tags [role="option"]')]
      .some((option) => option.textContent?.trim() === "Foo" && option.getAttribute("aria-selected") === "true"), null, { timeout: 2000 });

    await page.close();
  });

  it("keeps the items it selects, and follows a consumer that owns them", async () => {
    const path = await bundle("vue-multi", `
      import { createApp, h, ref } from "vue";
      import { Combobox } from "@threadlabs/looma/vue";
      const owned = ref([]);
      window.owned = owned;
      createApp({
        render: () => h("div", [
          h(Combobox, { id: "free", label: "Tags", multiple: true }, () => [
            h("option", { value: "alpha" }, "Alpha"),
            h("option", { value: "beta" }, "Beta"),
          ]),
          h(Combobox, { id: "owned", label: "Owned", multiple: true, items: owned.value }, () => [
            h("option", { value: "alpha" }, "Alpha"),
          ]),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    // Uncontrolled: selecting an option keeps it, with no consumer wiring.
    await page.locator("#free input").click();
    await page.locator("#free input").fill("Al");
    await page.locator('#free [role="option"]').first().click();
    await page.waitForFunction(() => document.querySelectorAll("#free .item").length === 1);
    assert.equal(await page.locator("#free .item").first().textContent(), "Alpha");

    // Controlled: the consumer's list wins.
    await page.evaluate(() => {
      (window as unknown as { owned: { value: unknown[] } }).owned.value = [{ id: "a", value: "alpha", label: "Alpha" }];
    });
    await page.waitForFunction(() => document.querySelectorAll("#owned .item").length === 1);
    await page.close();
  });
});

describe("Vue v-model on reported props", () => {
  it("keeps v-model:query in step with a Combobox's typing", async () => {
    const path = await bundle("vue-query", `
      import { createApp, h, ref } from "vue";
      import { Combobox } from "@threadlabs/looma/vue";
      const query = ref("");
      window.query = query;
      createApp({
        render: () => h(Combobox, { id: "tags", label: "Tags", query: query.value, "onUpdate:query": (value) => { query.value = value; } }, () => [
          h("option", { value: "research" }, "Research"),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await page.locator("#tags input").pressSequentially("Res");
    assert.equal(await page.locator("#tags input").inputValue(), "Res");
    assert.equal(await page.evaluate(() => (window as unknown as { query: { value: string } }).query.value), "Res");
    await page.close();
  });
});

describe("Tree Item label", () => {
  it("fills its cell, so a slotted link is the row's hit area", async () => {
    const path = await bundle("vue-tree-label-fill", `
      import { createApp, h } from "vue";
      import { Tree, TreeItem } from "@threadlabs/looma/vue";
      createApp({
        render: () => h("div", { style: "inline-size: 400px" }, [
          h(Tree, { label: "Pages" }, () => [
            h(TreeItem, { id: "page", itemId: "page", label: "Welcome" }, { label: () => h("a", { id: "link", href: "#welcome" }, "Welcome") }),
          ]),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const widths = await page.locator("#page").evaluate((item) => {
      const cell = item.querySelector(".label") as HTMLElement;
      const style = getComputedStyle(cell);
      return {
        cell: cell.clientWidth - parseFloat(style.paddingInlineStart) - parseFloat(style.paddingInlineEnd),
        link: (item.querySelector("#link") as HTMLElement).offsetWidth,
      };
    });
    assert.ok(widths.link > 100, `the link fills the cell rather than its text (${widths.link}px)`);
    assert.ok(Math.abs(widths.cell - widths.link) <= 2, `the link is the cell's width (${widths.link} of ${widths.cell})`);
    await page.close();
  });
});

describe("Light dismiss", () => {
  it("needs a real press: a pointerdown with no coordinates keeps a modal dialog open", async () => {
    const path = await bundle("vue-light-dismiss", `
      import { createApp, h } from "vue";
      import { Dialog } from "@threadlabs/looma/vue";
      createApp({ render: () => h(Dialog, { id: "dialog", open: true, modal: true, closedby: "any", label: "Details" }, () => "Body") }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const dialog = page.locator("#dialog");
    await dialog.waitFor();
    // An activation with no pointer (assistive technology, or a synthetic event) reports 0,0, and
    // lands on the document rather than inside the dialog.
    await page.evaluate(() => {
      document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true, pointerType: "touch" }));
    });
    await page.waitForTimeout(50);
    assert.equal(await dialog.evaluate((element) => (element as HTMLDialogElement).open), true, "the dialog stays open");
    await page.close();
  });
});

describe("Compact controls on touch", () => {
  it("keep their size and still meet the touch target", async () => {
    const path = await bundle("vue-compact-touch", `
      import { createApp, h } from "vue";
      import { IconButton, trackInputModality } from "@threadlabs/looma/vue";
      trackInputModality(document);
      createApp({ render: () => h("div", { style: "padding: 60px" }, [h(IconButton, { id: "small", size: "sm", label: "Remove" }, () => "x")]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await page.evaluate(() => document.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "touch" })));
    const target = await page.locator("#small").evaluate((element) => {
      const hit = getComputedStyle(element, "::after");
      const bounds = element.getBoundingClientRect();
      const corner = { x: bounds.left + bounds.width / 2 + 21, y: bounds.top + bounds.height / 2 + 21 };
      return {
        visual: (element as HTMLElement).offsetWidth,
        width: parseFloat(hit.inlineSize),
        height: parseFloat(hit.blockSize),
        hitsBeyondTheEdge: document.elementFromPoint(corner.x, corner.y) === element,
      };
    });
    assert.ok(target.visual < 44, `a compact control stays compact (${target.visual}px)`);
    assert.ok(target.width >= 44 && target.height >= 44, `its touch target is at least 44px (${target.width}x${target.height})`);
    assert.equal(target.hitsBeyondTheEdge, true, "the target extends past the visual edge");
    await page.close();
  });
});

describe("Button tone and disabled", () => {
  it("paints available variants in their tone and gives disabled actions one neutral treatment", async () => {
    const path = await bundle("vue-tone", `
      import { createApp, h } from "vue";
      import { Button } from "@threadlabs/looma/vue";
      createApp({
        render: () => h("div", [
          h(Button, { id: "accent" }, () => "Review"),
          h(Button, { id: "danger", tone: "danger" }, () => "Delete"),
          h(Button, { id: "neutral", tone: "neutral" }, () => "Cancel"),
          h(Button, { id: "solid", variant: "solid" }, () => "Save"),
          h(Button, { id: "off", disabled: true }, () => "Save"),
          h(Button, { id: "off-danger", tone: "danger", disabled: true }, () => "Delete"),
          h(Button, { id: "off-solid", variant: "solid", disabled: true }, () => "Save"),
          h(Button, { id: "off-ghost", variant: "ghost", disabled: true }, () => "Review"),
          h(Button, { id: "off-ghost-neutral", variant: "ghost", tone: "neutral", disabled: true }, () => "Cancel"),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const paint = (id: string) => page.locator(`#${id}`).evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        color: style.color,
        border: style.borderTopColor,
        opacity: style.opacity,
        shadow: style.boxShadow,
        filter: style.filter
      };
    });

    // Tone is the colour, and it reaches the whole button rather than only its text.
    const accent = await paint("accent");
    const danger = await paint("danger");
    const neutral = await paint("neutral");
    assert.notEqual(danger.border, accent.border, "tone changes an outline's edge");
    assert.notEqual(danger.background, accent.background, "tone changes an outline's wash");
    assert.notEqual(neutral.border, accent.border, "neutral is a tone of its own");

    // Variant is the volume: solid fills with the colour the outline draws with.
    const solid = await paint("solid");
    assert.equal(solid.background, accent.border, "solid fills with the outline's tone");

    // Disabled actions share a flat neutral palette so no tone still looks actionable.
    const off = await paint("off");
    const offDanger = await paint("off-danger");
    const offSolid = await paint("off-solid");
    assert.equal(off.opacity, "1", "disabled is a colour decision, not a transparency one");
    assert.equal(off.shadow, "none", "a disabled button does not look raised");
    assert.notEqual(off.border, off.background, "a disabled outline keeps its shape");
    for (const variant of [offDanger, offSolid]) {
      assert.equal(variant.background, off.background, "disabled variants share a neutral surface");
      assert.equal(variant.border, off.border, "disabled variants share a neutral border");
      assert.equal(variant.color, off.color, "disabled variants share muted text");
    }
    assert.equal(off.filter, "none", "disabled colours are chosen directly");
    assert.equal(accent.filter, "none", "an available button is not");

    // Ghosts keep their borderless shape but gain the same muted fill and text.
    for (const id of ["off-ghost", "off-ghost-neutral"]) {
      const ghost = await paint(id);
      assert.equal(ghost.background, off.background);
      assert.equal(ghost.color, off.color);
      assert.equal(ghost.border, "rgba(0, 0, 0, 0)");
    }
    await page.close();
  });
});

describe("Density", () => {
  it("compacts menu rows and tab rows without rescaling a global token", async () => {
    const path = await bundle("vue-density", `
      import { createApp, h } from "vue";
      import { Menu, MenuItem, Tabs } from "@threadlabs/looma/vue";
      const menu = (id, density) => h(Menu, { id, density, open: true }, () => [
        h(MenuItem, { id: id + "-item" }, () => "Rename"),
      ]);
      const tabs = (id, density) => h(Tabs, { id, density, label: "Views" }, () => [
        h("section", { "aria-label": "One" }, "First"),
      ]);
      createApp({ render: () => h("div", [menu("roomy"), menu("tight", "compact"), tabs("roomy-tabs"), tabs("tight-tabs", "compact")]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const box = (selector: string) => page.locator(selector).evaluate((element) => {
      const style = getComputedStyle(element);
      return { padding: style.paddingBlockStart, fontSize: style.fontSize, height: (element as HTMLElement).offsetHeight };
    });
    const roomyItem = await box("#roomy-item");
    const tightItem = await box("#tight-item");
    assert.ok(parseFloat(tightItem.padding) < parseFloat(roomyItem.padding), "compact menu rows are tighter");
    assert.ok(parseFloat(tightItem.fontSize) < parseFloat(roomyItem.fontSize), "compact menu rows use the smaller type");

    const roomyTab = await box('#roomy-tabs [role="tab"]');
    const tightTab = await box('#tight-tabs [role="tab"]');
    assert.ok(tightTab.height < roomyTab.height, "compact tabs are shorter");
    // The globals the component reads are untouched, so nothing nested inside is rescaled.
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--ui-space-2").trim()), "0.5rem");
    await page.close();
  });
});

describe("Vue editor components", () => {
  it("filters authored Slash groups and reports the command value", async () => {
    const path = await bundle("html-authored-slash-menu", `
      import "@threadlabs/looma";
      window.events = [];
      document.querySelector("#slash").addEventListener("select", (event) => window.events.push(event.detail));
    `);
    const page = await open(path, `
      <ui-editor-slash-menu id="slash" open query="h1" aria-label="Document commands" anchor-rect='{"left":500,"top":40,"right":520,"bottom":60}'>
        <ui-editor-slash-menu-group label="Basic blocks">
          <ui-editor-slash-menu-item value="heading-1" icon="heading-1" keywords="h1 title" description="Large section heading">Heading 1</ui-editor-slash-menu-item>
          <ui-editor-slash-menu-item value="paragraph" icon="pilcrow">Paragraph</ui-editor-slash-menu-item>
        </ui-editor-slash-menu-group>
        <ui-editor-slash-menu-group label="Media">
          <ui-editor-slash-menu-item value="image" icon="image">Image</ui-editor-slash-menu-item>
        </ui-editor-slash-menu-group>
        <div slot="empty">No matching commands</div>
        <div slot="footer">Use arrows to choose</div>
      </ui-editor-slash-menu>
    `, [join(root, "tokens.css")]);
    const menu = page.locator("#slash");
    assert.equal(await menu.getAttribute("aria-label"), "Document commands");
    assert.equal(await menu.getByRole("option").count(), 1);
    assert.equal(await menu.getByRole("group", { name: "Basic blocks" }).count(), 1);
    assert.equal(await menu.getByRole("group", { name: "Media" }).count(), 0);
    assert.equal(await menu.locator(".footer").textContent(), "Use arrows to choose");
    await menu.locator('[role="option"][data-value="heading-1"]').click();
    assert.deepEqual(await page.evaluate(() => (window as any).events), [{ index: 0, value: "heading-1" }]);
    await page.close();

    const empty = await open(path, `
      <ui-editor-slash-menu id="slash" open query="missing" anchor-rect='{"left":500,"top":40,"right":520,"bottom":60}'>
        <ui-editor-slash-menu-item value="paragraph">Paragraph</ui-editor-slash-menu-item>
        <div slot="empty">No matching commands</div>
      </ui-editor-slash-menu>
    `, [join(root, "tokens.css")]);
    assert.equal(await empty.locator("#slash .empty").isVisible(), true);
    assert.equal(await empty.locator("#slash [role='option']").isVisible(), false);
    await empty.close();
  });

  it("projects authored editor suggestion items through Vue", async () => {
    const path = await bundle("vue-authored-editor-menus", `
      import { createApp, h } from "vue";
      import { EditorSlashMenu, EditorSlashMenuGroup, EditorSlashMenuItem, EditorMentionMenu, EditorMentionMenuItem } from "@threadlabs/looma/vue";
      const anchorRect = { left: 500, top: 40, right: 520, bottom: 60 };
      createApp({ render: () => h("div", [
        h(EditorSlashMenu, { id: "slash", open: true, query: "heading", anchorRect }, {
          default: () => h(EditorSlashMenuGroup, { label: "Basic" }, () =>
            h(EditorSlashMenuItem, { value: "heading", keywords: "h1" }, () => "Heading")),
          empty: () => h("div", "No commands"),
        }),
        h(EditorMentionMenu, { id: "mention", open: true, anchorRect, label: "People" }, {
          default: () => h(EditorMentionMenuItem, { value: "ada", initials: "AL" }, () => "Ada"),
          header: () => h("div", "People in this document"),
        }),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    assert.equal(await page.locator("#slash").getByRole("option", { name: "Heading" }).count(), 1);
    assert.equal(await page.locator("#mention").getByRole("option", { name: "Ada" }).count(), 1);
    assert.equal(await page.locator("#mention .header").textContent(), "People in this document");
    await page.close();
  });

  it("renders authored Mention items and empty/header slots with stable value events", async () => {
    const path = await bundle("html-authored-mention-menu", `
      import "@threadlabs/looma";
      window.events = [];
      document.querySelector("#mention").addEventListener("select", (event) => window.events.push(event.detail));
    `);
    const page = await open(path, `
      <ui-editor-mention-menu id="mention" open label="People" aria-label="Project mentions" anchor-rect='{"left":500,"top":40,"right":520,"bottom":60}'>
        <div slot="header">People in this document</div>
        <ui-editor-mention-menu-item value="ada" detail="Design" initials="AL">Ada Lovelace</ui-editor-mention-menu-item>
        <ui-editor-mention-menu-item value="grace" detail="Engineering"><span slot="start">GH</span>Grace Hopper</ui-editor-mention-menu-item>
        <div slot="empty">No matching people</div>
      </ui-editor-mention-menu>
    `, [join(root, "tokens.css")]);
    const menu = page.locator("#mention");
    assert.equal(await menu.isVisible(), true);
    assert.equal(await menu.getAttribute("aria-label"), "Project mentions");
    assert.equal(await menu.getByRole("option").count(), 2);
    assert.equal(await menu.locator(".header").textContent(), "People in this document");
    assert.equal(await menu.locator(".empty").isVisible(), false);
    await menu.locator('[role="option"][data-value="grace"]').click();
    assert.deepEqual(await page.evaluate(() => (window as any).events), [{ index: 1, value: "grace" }]);
    await menu.getByRole("option").evaluateAll((items) => items.forEach((item) => item.remove()));
    await page.waitForFunction(() => document.querySelector("#mention .empty")?.getClientRects().length);
    assert.equal(await menu.locator(".empty").textContent(), "No matching people");
    await page.close();
  });

  it("render menus, toolbars, and grids from their templates", async () => {
    const path = await bundle("vue-editor", `
      import { createApp, h } from "vue";
      import { EditorSlashMenu, EditorTableToolbar, EditorInsertTableGrid } from "@threadlabs/looma/vue";
      const events = [];
      window.events = events;
      createApp({
        render: () => h("div", [
          h(EditorSlashMenu, { id: "slash", open: true, query: "ta", anchorRect: { left: 800, top: 20, right: 820, bottom: 40 },
            items: [{ title: "Table", description: "Rows and columns", icon: "table" }, { title: "Text", description: "Paragraph", icon: "pilcrow" }],
            onSelect: (event) => events.push(["select", event.detail]) }),
          h(EditorTableToolbar, { id: "toolbar", open: true, cellAlignment: "center",
            actions: ["align-left", "align-center", "add-row-after", "background-yellow", "delete-table"],
            onAction: (event) => events.push(["action", event.detail]) }),
          h(EditorInsertTableGrid, { id: "grid", open: true, maxRows: 4, maxCols: 5,
            onInsert: (event) => events.push(["insert", event.detail]) }),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);

    const items = page.locator('#slash [role="option"]');
    assert.deepEqual(await items.locator(".title").allTextContents(), ["Table", "Text"]);
    assert.equal(await page.locator("#slash .header").isVisible(), false);
    assert.ok(await items.first().locator("svg rect, svg path").count() > 0, "icons render as SVG shapes");
    assert.equal(await items.first().getAttribute("aria-selected"), "true");
    await items.nth(1).click();

    await page.locator("#grid").evaluate((element) => { (element as HTMLElement).style.display = "none"; });
    const toolbar = page.locator("#toolbar");
    assert.equal(await toolbar.locator('[data-action="align-center"]').getAttribute("aria-pressed"), "true");
    assert.equal(await toolbar.locator(".menu").count(), 0);
    await toolbar.locator('[data-action="toggle-overflow"]').click();
    assert.equal(await toolbar.locator(".menu").count(), 1);
    assert.deepEqual(await toolbar.locator('.menu [role="menuitem"]').allTextContents(), ["Delete table"]);
    await toolbar.locator('[data-action="delete-table"]').click();
    assert.equal(await toolbar.locator(".menu").count(), 0);

    const grid = page.locator("#grid");
    await grid.evaluate((element) => { (element as HTMLElement).style.display = ""; });
    assert.equal(await grid.locator(".cell").count(), 20);
    await grid.locator('[data-row="2"][data-col="4"]').click();
    assert.equal(await grid.locator(".cell.selected").count(), 8);

    assert.deepEqual(await page.evaluate(() => (window as unknown as { events: unknown[] }).events), [
      ["select", { index: 1, value: "Text" }],
      ["action", { action: "delete-table" }],
      ["insert", { rows: 2, cols: 4, withHeaderRow: false }],
    ]);
    await page.close();
  });

  it("inserts from one roving table-picker tab stop and offers 44px touch cells", async () => {
    const path = await bundle("html-table-picker-keyboard", `
      import "@threadlabs/looma";
      window.inserts = [];
      document.querySelector("#picker").addEventListener("insert", (event) => window.inserts.push(event.detail));
    `);
    const page = await open(path, `
      <button id="before">Before</button>
      <ui-editor-insert-table-grid id="picker" open max-rows="4" max-cols="5" header-row></ui-editor-insert-table-grid>
    `, [join(root, "tokens.css")]);
    assert.equal(await page.locator("#picker .cell[tabindex='0']").count(), 1);
    await page.locator("#before").focus();
    await page.keyboard.press("Tab");
    assert.equal(await page.locator("#picker [data-row='3'][data-col='3']").evaluate((element) => element === document.activeElement), true);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator("#picker [data-row='4'][data-col='4']").evaluate((element) => element === document.activeElement), true);
    await page.keyboard.press("Enter");
    assert.deepEqual(await page.evaluate(() => (window as any).inserts), [{ rows: 4, cols: 4, withHeaderRow: true }]);
    await page.keyboard.press("Tab");
    assert.equal(await page.locator("#picker .header input").evaluate((element) => element === document.activeElement), true);
    await page.close();

    const touch = await open(path, `<ui-editor-insert-table-grid id="picker" open></ui-editor-insert-table-grid>`, [join(root, "tokens.css")], { hasTouch: true, isMobile: true, viewport: { width: 375, height: 667 } });
    const dimensions = await touch.locator("#picker .cell").first().evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { width: box.width, height: box.height };
    });
    assert.ok(dimensions.width >= 44 && dimensions.height >= 44, JSON.stringify(dimensions));
    await touch.close();
  });
});

describe("Editor toolbar tooltips", () => {
  it("labels its buttons with a Looma tooltip, not the browser's title", async () => {
    const path = await bundle("vue-toolbar-tip", `
      import { createApp, h, ref } from "vue";
      import { LoomaEditor } from "@threadlabs/looma/vue/editor";
      const content = ref("<p>Hello</p>");
      createApp({ render: () => h(LoomaEditor, { modelValue: content.value, toolbarMode: "sticky" }) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const bold = page.locator('[data-component~="ui-editor-toolbar"] button').first();
    await bold.waitFor();
    assert.equal(await bold.getAttribute("title"), null, "no native title");
    // Checklist and Divider live in the slash menu, so the row fits at page width.
    const labels = await page.locator('[data-component~="ui-editor-toolbar"] button')
      .evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label")));
    assert.ok(labels.includes("Bold") && labels.includes("Redo"), `toolbar labels: ${labels.join(", ")}`);
    assert.equal(labels.includes("Checklist") || labels.includes("Divider"), false);

    const tip = page.locator('[data-component~="ui-tooltip"]');
    await bold.hover();
    await tip.waitFor({ state: "visible" });
    assert.match((await tip.textContent()) ?? "", /Bold/);
    // The command's own key binding follows the label, written for this platform.
    const apple = await page.evaluate(() => /Mac|iPhone|iPad|iPod/.test(navigator.platform));
    assert.equal(await tip.locator("kbd").textContent(), apple ? "⌘B" : "Ctrl+B");

    // In a secure context Client Hints name the platform "macOS", lowercase "mac", and still mean ⌘.
    await page.evaluate(() => {
      Object.defineProperty(navigator, "userAgentData", { configurable: true, value: { platform: "macOS" } });
      Object.defineProperty(navigator, "platform", { configurable: true, value: "" });
    });

    // Moving along the row re-points the same tooltip without waiting again.
    const italic = page.locator('[data-component~="ui-editor-toolbar"] button').nth(1);
    await italic.hover();
    await page.waitForFunction(() => /Italic/.test(document.querySelector('[data-component~="ui-tooltip"]')?.textContent ?? ""));
    assert.equal(await tip.isVisible(), true);
    assert.equal(await tip.locator("kbd").textContent(), "⌘I");
    await page.close();
  });
});

describe("LoomaEditor", () => {
  it("names its editing surface for assistive technology", async () => {
    const path = await bundle("vue-editor-label", `
      import { createApp, h, ref } from "vue";
      import { LoomaEditor } from "@threadlabs/looma/vue/editor";
      const label = ref("Page content");
      window.label = label;
      createApp({ render: () => h(LoomaEditor, { modelValue: { type: "doc", content: [] }, label: label.value }) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const prose = page.locator(".ProseMirror");
    await prose.waitFor();
    assert.equal(await prose.getAttribute("aria-label"), "Page content");
    await page.evaluate(() => { (window as unknown as { label: { value: string } }).label.value = "Meeting notes"; });
    await page.waitForFunction(() => document.querySelector(".ProseMirror")?.getAttribute("aria-label") === "Meeting notes");
    await page.close();
  });


  it("edits a document and opens the slash menu", async () => {
    const path = await bundle("vue-looma-editor", `
      import { createApp, h, ref } from "vue";
      import { LoomaEditor } from "@threadlabs/looma/vue/editor";
      const content = ref("<p>Hello</p>");
      window.content = content;
      createApp({
        render: () => h(LoomaEditor, { modelValue: content.value, toolbarMode: "sticky", "onUpdate:modelValue": (value) => { content.value = value; } }),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const prose = page.locator(".ProseMirror");
    await prose.waitFor();
    assert.equal(await prose.textContent(), "Hello");
    assert.ok(await page.locator('[data-component="ui-editor-toolbar"] button').count() > 0, "formatting toolbar renders");
    await prose.click();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.keyboard.type("/");
    const slash = page.locator('[data-component="ui-editor-slash-menu"]');
    await slash.locator('[role="option"]').first().waitFor();
    assert.ok(await slash.locator('[role="option"]').count() > 3, "slash menu lists blocks");
    const blank = await slash.locator('[role="option"]').evaluateAll((options) =>
      options.filter((option) => !option.querySelector(".icon svg > *")).map((option) => option.textContent?.trim()));
    assert.deepEqual(blank, [], "every block's icon draws");
    await page.close();
  });
});

describe("HTML components", () => {
  it("register and lower from dist/index.js", async () => {
    const path = await bundle("html-page", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-button id="save" variant="solid" class="consumer">Save</ui-button>
      <ui-switch id="alerts">Alerts</ui-switch>
      <ui-disclosure id="more" summary="More"><p>Details</p></ui-disclosure>
      <ui-form-field><label slot="label" id="field-label" for="field">Name</label><input id="field"></ui-form-field>
    `, [join(root, "tokens.css")]);
    await page.waitForSelector('#save[data-component="ui-button"]');
    const button = page.locator("#save");
    assert.equal(await button.evaluate((element) => element.localName), "button");
    assert.equal(await button.getAttribute("class"), "consumer");
    assert.notEqual(await button.evaluate((element) => getComputedStyle(element).backgroundColor), "rgba(0, 0, 0, 0)");

    await page.locator("#alerts input").click();
    assert.equal(await page.locator("#alerts input").isChecked(), true);

    const trigger = page.locator("#more .trigger");
    assert.equal(await trigger.getAttribute("aria-expanded"), "false");
    await trigger.click();
    assert.equal(await trigger.getAttribute("aria-expanded"), "true");

    await page.waitForSelector('[data-component~="ui-form-field"]');
    assert.equal(await page.locator("#field-label").evaluate((element) => getComputedStyle(element).fontSize), "14px");
    await page.close();
  });
});

describe("Radio group initial selection", () => {
  const check = async (page: Page) => {
    await page.waitForSelector('#plan input[value="pro"]');
    assert.deepEqual(await page.locator("#plan input").evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).checked)), [false, true], "the group's value takes precedence over a child's checked prop");
    assert.deepEqual(await page.locator("#empty input").evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).checked)), [false, false], "an empty group value checks no radio");
    assert.deepEqual(await page.locator("#plan input").evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).defaultChecked)), [false, true], "native reset defaults also belong to the group");
    assert.equal(await page.locator("#standalone input").isChecked(), true, "an authored standalone checked radio stays checked");
    await page.locator('#plan input[value="free"]').check();
    await page.locator("#form").evaluate((form) => (form as HTMLFormElement).reset());
    await page.waitForFunction(() => (document.querySelector('#plan input[value="pro"]') as HTMLInputElement).checked);
    assert.deepEqual(await page.locator("#plan input").evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).checked)), [false, true], "form reset restores the group's authored value");
  };

  it("honors group selection when a child is authored checked, in HTML", async () => {
    const path = await bundle("html-radio-initial-selection", `import "@threadlabs/looma";`);
    const page = await open(path, `<form id="form">
      <ui-radio-group id="plan" name="plan" value="pro"><ui-radio value="free" checked>Free</ui-radio><ui-radio value="pro">Pro</ui-radio></ui-radio-group>
      <ui-radio-group id="empty" name="empty"><ui-radio value="free" checked>Free</ui-radio><ui-radio value="pro">Pro</ui-radio></ui-radio-group>
      <fieldset role="radiogroup"><ui-radio id="standalone" name="standalone" checked>Standalone</ui-radio></fieldset>
    </form>`, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });

  it("honors group selection when a child is authored checked, in Vue", async () => {
    const path = await bundle("vue-radio-initial-selection", `
      import { createApp, h } from "vue";
      import { Radio, RadioGroup } from "@threadlabs/looma/vue";
      const radios = () => [h(Radio, { value: "free", checked: true }, () => "Free"), h(Radio, { value: "pro" }, () => "Pro")];
      createApp({ render: () => h("form", { id: "form" }, [
        h(RadioGroup, { id: "plan", name: "plan", value: "pro" }, radios),
        h(RadioGroup, { id: "empty", name: "empty" }, radios),
        h("fieldset", { role: "radiogroup" }, [h(Radio, { id: "standalone", name: "standalone", checked: true }, () => "Standalone")]),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await check(page);
    await page.close();
  });
});

describe("Radio group required", () => {
  // As on native radios: one required radio makes its whole group required.
  const check = async (page: Page) => {
    const group = page.locator('#plan[role="radiogroup"]');
    await group.waitFor();
    assert.equal(await group.getAttribute("aria-required"), "true");
    assert.deepEqual(await page.locator("#plan input").evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).required)), [true, true]);
    const valid = () => page.locator("#form").evaluate((form) => (form as HTMLFormElement).checkValidity());
    assert.equal(await valid(), false, "nothing chosen");
    await page.locator('#plan input[value="pro"]').check();
    assert.equal(await valid(), true);
    assert.equal(await page.locator('#optional[role="radiogroup"]').getAttribute("aria-required"), "false");
    assert.deepEqual(await page.locator("#optional input").evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).required)), [false, true]);
  };

  it("marks the group required and its radios required, in HTML", async () => {
    const path = await bundle("html-radio-required", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <form id="form">
        <ui-radio-group id="plan" name="plan" label="Plan" required><ui-radio value="free">Free</ui-radio><ui-radio value="pro">Pro</ui-radio></ui-radio-group>
        <ui-radio-group id="optional" name="optional" label="Optional" value="b"><ui-radio value="a">A</ui-radio><ui-radio value="b" required>B</ui-radio></ui-radio-group>
      </form>
    `, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });

  it("marks the group required and its radios required, in Vue", async () => {
    const path = await bundle("vue-radio-required", `
      import { createApp, h } from "vue";
      import { Radio, RadioGroup } from "@threadlabs/looma/vue";
      createApp({
        render: () => h("form", { id: "form" }, [
          h(RadioGroup, { id: "plan", name: "plan", label: "Plan", required: true }, () => [h(Radio, { value: "free" }, () => "Free"), h(Radio, { value: "pro" }, () => "Pro")]),
          h(RadioGroup, { id: "optional", name: "optional", label: "Optional", value: "b" }, () => [h(Radio, { value: "a" }, () => "A"), h(Radio, { value: "b", required: true }, () => "B")]),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await check(page);
    await page.close();
  });
});

describe("Combobox events", () => {
  // The list marks the chosen row with a view-only flag; events report options in their declared
  // shape, so Vue's detail checks accept them and the choice reaches the consumer.
  it("reports options and a single choice in their declared shape in Vue", async () => {
    const path = await bundle("vue-combobox-event-shape", `
      import { createApp, h } from "vue";
      import { Combobox } from "@threadlabs/looma/vue";
      window.events = [];
      createApp({
        render: () => h(Combobox, {
          label: "Fruit",
          onOptionsChange: (event) => window.events.push(["options", event.detail]),
          onValueChange: (event) => window.events.push(["value", event.detail]),
        }, () => [h("option", { value: "apple" }, "Apple"), h("option", { value: "pear" }, "Pear")]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.locator('input[role="combobox"]').pressSequentially("pe");
    await page.getByRole("option", { name: "Pear" }).click();
    assert.deepEqual(errors, []);
    const events = await page.evaluate(() => (window as unknown as { events: [string, any][] }).events);
    const pear = { id: "pear", value: "pear", label: "Pear", disabled: false };
    assert.deepEqual(events.filter(([name]) => name === "options").at(-1)?.[1], [pear]);
    const choice = events.find(([name]) => name === "value")?.[1];
    assert.equal(choice.kind, "selection");
    assert.deepEqual(choice.option, pear);
    await page.close();
  });
});

describe("Combobox option detail", () => {
  // A row's description and tag describe it: the label stays its name, what filtering matches, and what
  // a choice commits; a row with neither keeps its name from its content, as before.
  const check = async (page: Page) => {
    const input = page.locator('#people input[role="combobox"]');
    await input.waitFor();
    await input.press("ArrowDown");
    const riley = page.getByRole("option", { name: "Riley Kim", exact: true });
    const description = (option: typeof riley) => option.evaluate((element) =>
      (element.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean)
        .map((id) => (element.getRootNode() as Document).getElementById(id)?.textContent?.trim()).join(", "));
    assert.equal(await description(riley), "Contact, Harbor Supply Co.");
    const tone = (option: typeof riley) => option.locator('[data-component="ui-badge"]').getAttribute("data-ui-badge-state");
    assert.match(await tone(riley) ?? "", /\btone=neutral\b/, "an untoned tag is neutral");
    const sam = page.getByRole("option", { name: "Sam Ortiz", exact: true });
    assert.equal(await description(sam), "Harbor Supply Co.");
    assert.equal(await sam.locator('[data-component="ui-badge"]').count(), 0);
    const harbor = page.getByRole("option", { name: "Harbor Supply Co.", exact: true });
    assert.equal(await description(harbor), "Inactive");
    assert.match(await tone(harbor) ?? "", /\btone=warning\b/);
    // A tag colour reaches the tag's badge as its colour hook.
    const northwind = page.getByRole("option", { name: "Northwind Traders", exact: true });
    const hook = (option: typeof riley) => option.locator('[data-component="ui-badge"]').evaluate((badge) => getComputedStyle(badge).getPropertyValue("--ui-badge-color").trim());
    assert.equal(await hook(northwind), "teal");
    assert.equal(await hook(harbor), "", "an uncoloured tag sets no colour");
    // A plain row renders as it always has.
    const plain = page.getByRole("option", { name: "Pat Lee", exact: true });
    assert.deepEqual(await plain.evaluate((element) => [element.getAttribute("aria-labelledby"), element.getAttribute("aria-describedby"),
      Array.from(element.children, (child) => child.className)]), [null, null, ["primary"]]);
    // Filtering matches labels only: Riley and Sam work at Harbor, but only the business is suggested.
    await input.fill("harbor");
    assert.deepEqual(await page.locator('#people [role="option"]').evaluateAll((all) => all.map((option) => option.querySelector(".primary")?.textContent)),
      ["Harbor Supply Co."]);
    await input.fill("northwind");
    await northwind.click();
    assert.deepEqual((await page.evaluate(() => (window as unknown as { changes: any[] }).changes.at(-1))).option.tag, { label: "Business", color: "teal" });
    await input.fill("riley");
    await riley.click();
    assert.equal(await input.inputValue(), "Riley Kim");
    const choice = await page.evaluate(() => (window as unknown as { changes: any[] }).changes.at(-1));
    assert.deepEqual(choice.option, { id: "riley", value: "riley", label: "Riley Kim", group: "People", disabled: false, description: "Harbor Supply Co.", tag: { label: "Contact" } });
  };

  it("names each option by its label and describes it by its tag and description in HTML", async () => {
    const path = await bundle("html-combobox-option-detail", `
      import "@threadlabs/looma";
      window.changes = [];
      document.addEventListener("value-change", (event) => window.changes.push(event.detail));
    `);
    const page = await open(path, `
      <ui-combobox id="people" label="Directory">
        <optgroup label="People">
          <option value="riley" data-description="Harbor Supply Co." data-tag="Contact">Riley Kim</option>
          <option value="sam" data-description="Harbor Supply Co.">Sam Ortiz</option>
          <option value="pat">Pat Lee</option>
        </optgroup>
        <optgroup label="Businesses">
          <option value="harbor" data-tag="Inactive" data-tag-tone="warning">Harbor Supply Co.</option>
          <option value="northwind" data-tag="Business" data-tag-color="teal">Northwind Traders</option>
        </optgroup>
      </ui-combobox>
    `, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });

  it("names each option by its label and describes it by its tag and description in Vue", async () => {
    const path = await bundle("vue-combobox-option-detail", `
      import { createApp, h } from "vue";
      import { Combobox } from "@threadlabs/looma/vue";
      window.changes = [];
      createApp({
        render: () => h(Combobox, { id: "people", label: "Directory", onValueChange: (event) => window.changes.push(event.detail) }, () => [
          h("optgroup", { label: "People" }, [
            h("option", { value: "riley", "data-description": "Harbor Supply Co.", "data-tag": "Contact" }, "Riley Kim"),
            h("option", { value: "sam", "data-description": "Harbor Supply Co." }, "Sam Ortiz"),
            h("option", { value: "pat" }, "Pat Lee"),
          ]),
          h("optgroup", { label: "Businesses" }, [
            h("option", { value: "harbor", "data-tag": "Inactive", "data-tag-tone": "warning" }, "Harbor Supply Co."),
            h("option", { value: "northwind", "data-tag": "Business", "data-tag-color": "teal" }, "Northwind Traders"),
          ]),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await check(page);
    await page.close();
  });
});

describe("Combobox filter", () => {
  // filter="none" lists every authored option, as a server search returned them; the default still
  // narrows by label. Keyboard choice and the blur commit work over the listed options.
  const check = async (page: Page) => {
    const labels = (id: string) => page.locator(`#${id} [role="option"]`).evaluateAll((all) => all.map((option) => option.querySelector(".primary")?.textContent));
    const server = page.locator('#server input[role="combobox"]');
    await server.waitFor();
    await server.fill("harb");
    assert.deepEqual(await labels("server"), ["Riley Kim", "Harbor Auto Group"], "a result matched on its description still shows");
    await server.press("ArrowDown");
    assert.equal(await server.getAttribute("aria-activedescendant"), await page.getByRole("option", { name: "Riley Kim", exact: true }).getAttribute("id"));
    await server.press("ArrowDown");
    await server.press("Enter");
    assert.equal(await server.inputValue(), "Harbor Auto Group");
    const local = page.locator('#local input[role="combobox"]');
    await local.fill("harb");
    assert.deepEqual(await labels("local"), ["Harbor Auto Group"], "the default filters by label");
    // Leaving with text that is no label commits the only option listed.
    const single = page.locator('#single input[role="combobox"]');
    await single.fill("harb");
    await single.press("Tab");
    assert.equal(await single.inputValue(), "Riley Kim");
    assert.equal(await page.evaluate(() => (window as unknown as { changes: any[] }).changes.at(-1).value), "riley");
  };

  it("lists every option with filter none and filters by label by default in HTML", async () => {
    const path = await bundle("html-combobox-filter", `
      import "@threadlabs/looma";
      window.changes = [];
      document.addEventListener("value-change", (event) => window.changes.push(event.detail));
    `);
    const page = await open(path, `
      <ui-combobox id="server" label="Server" filter="none">
        <option value="riley" data-description="Harbor Auto Group">Riley Kim</option>
        <option value="harbor">Harbor Auto Group</option>
      </ui-combobox>
      <ui-combobox id="local" label="Local">
        <option value="riley" data-description="Harbor Auto Group">Riley Kim</option>
        <option value="harbor">Harbor Auto Group</option>
      </ui-combobox>
      <ui-combobox id="single" label="Single" filter="none">
        <option value="riley" data-description="Harbor Auto Group">Riley Kim</option>
      </ui-combobox>
      <button>After</button>
    `, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });

  it("lists every option with filter none and filters by label by default in Vue", async () => {
    const path = await bundle("vue-combobox-filter", `
      import { createApp, h } from "vue";
      import { Combobox } from "@threadlabs/looma/vue";
      window.changes = [];
      const riley = () => h("option", { value: "riley", "data-description": "Harbor Auto Group" }, "Riley Kim");
      const harbor = () => h("option", { value: "harbor" }, "Harbor Auto Group");
      const onValueChange = (event) => window.changes.push(event.detail);
      createApp({
        render: () => [
          h(Combobox, { id: "server", label: "Server", filter: "none", onValueChange }, () => [riley(), harbor()]),
          h(Combobox, { id: "local", label: "Local", onValueChange }, () => [riley(), harbor()]),
          h(Combobox, { id: "single", label: "Single", filter: "none", onValueChange }, () => [riley()]),
          h("button", "After"),
        ],
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await check(page);
    await page.close();
  });
});

describe("Controlled strict Combobox search", () => {
  it("keeps a typed search draft, restores an unmatched draft on blur, and commits a chosen option", async () => {
    const path = await bundle("vue-controlled-combobox-search", `
      import { createApp, h, ref } from "vue";
      import { Combobox } from "@threadlabs/looma/vue";
      const selected = ref("apple");
      window.changes = [];
      createApp({ render: () => h(Combobox, {
        id: "fruit", label: "Fruit", name: "fruit", value: selected.value,
        onValueChange: (event) => {
          window.changes.push(event.detail);
          if (event.detail.kind === "selection") selected.value = event.detail.value;
        },
      }, () => [h("option", { value: "apple" }, "Apple"), h("option", { value: "pear" }, "Pear")]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div><button id="after">After</button>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const input = page.locator('#fruit input[role="combobox"]');
    assert.equal(await input.inputValue(), "Apple");
    await input.fill("pea");
    assert.equal(await input.inputValue(), "pea", "a search draft stays visible while the selection is controlled");
    assert.equal(await page.locator('#fruit input[type="hidden"][name="fruit"]').inputValue(), "apple", "searching keeps the committed form value");
    assert.deepEqual(await page.locator('#fruit [role="option"]').allTextContents(), ["Pear"]);
    assert.deepEqual(await page.evaluate(() => (window as unknown as { changes: { kind: string }[] }).changes.map(({ kind }) => kind)), [], "typing does not clear the committed value");
    await input.fill("zz");
    assert.equal(await input.inputValue(), "zz");
    await page.locator("#after").focus();
    assert.equal(await input.inputValue(), "Apple", "an unmatched draft restores the previous selection on blur");
    assert.deepEqual(await page.evaluate(() => (window as unknown as { changes: unknown[] }).changes), [], "restoring a draft is not a new selection");
    await input.fill("");
    await page.locator("#after").focus();
    assert.equal(await input.inputValue(), "Apple", "an empty draft also restores the selection; Clear is a separate action");
    await input.fill("zz");
    await input.press("Tab");
    assert.equal(await input.inputValue(), "Apple", "keyboard focus departure restores an unmatched draft too");
    await input.fill("pea");
    await page.locator('#fruit [role="option"]').getByText("Pear").click();
    assert.equal(await input.inputValue(), "Pear");
    assert.deepEqual(await page.evaluate(() => (window as unknown as { changes: { kind: string; value: string }[] }).changes.map(({ kind, value }) => ({ kind, value }))), [{ kind: "selection", value: "pear" }]);
    await page.close();
  });
});

describe("Combobox disabled", () => {
  // Every part the user can press follows disabled: the clear, disclosure, help, and badge buttons.
  const check = async (page: Page) => {
    const locked = page.locator("#locked");
    await locked.locator('[data-combobox-action="clear"]').waitFor();
    const buttons = await locked.locator("button").evaluateAll((all) => all.map((button) =>
      [button.getAttribute("data-combobox-action") ?? button.className, (button as HTMLButtonElement).disabled]));
    assert.deepEqual(buttons, [["item", true], ["clear", true], ["disclosure", true], ["help", true]]);
    // Even a click that reaches the clear button (a script, or a stale reference) changes nothing.
    await locked.locator('[data-combobox-action="clear"]').evaluate((button) => button.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    await page.locator("#single").locator('[data-combobox-action="clear"]').evaluate((button) => button.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    assert.equal(await page.locator('#single input[role="combobox"]').inputValue(), "Apple");
    assert.deepEqual(await page.evaluate(() => (window as unknown as { changes: unknown[] }).changes), []);
  };
  const options = `<option value="apple">Apple</option><option value="pear">Pear</option>`;

  it("cannot be cleared or opened in HTML", async () => {
    const path = await bundle("html-combobox-disabled", `
      import "@threadlabs/looma";
      window.changes = [];
      document.addEventListener("value-change", (event) => window.changes.push(event.detail));
    `);
    const page = await open(path, `
      <ui-combobox id="locked" label="Tags" multiple clearable disclosure help="Pick tags." disabled items='[{"id":"apple","value":"apple","label":"Apple"}]'>${options}</ui-combobox>
      <ui-combobox id="single" label="Fruit" value="apple" clearable disabled>${options}</ui-combobox>
    `, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });

  it("cannot be cleared or opened in Vue", async () => {
    const path = await bundle("vue-combobox-disabled", `
      import { createApp, h } from "vue";
      import { Combobox } from "@threadlabs/looma/vue";
      window.changes = [];
      const options = () => [h("option", { value: "apple" }, "Apple"), h("option", { value: "pear" }, "Pear")];
      const onValueChange = (event) => window.changes.push(event.detail);
      createApp({
        render: () => h("div", [
          h(Combobox, { id: "locked", label: "Tags", multiple: true, clearable: true, disclosure: true, help: "Pick tags.", disabled: true,
            items: [{ id: "apple", value: "apple", label: "Apple" }], onValueChange }, options),
          h(Combobox, { id: "single", label: "Fruit", value: "apple", clearable: true, disabled: true, onValueChange }, options),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await check(page);
    await page.close();
  });
});

describe("Combobox authored defaults and affordances", () => {
  it("starts from selected options, disables empty Clear, and keeps multiple selections on one row", async () => {
    const path = await bundle("html-combobox-authored-defaults", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <form id="form">
        <ui-combobox id="single" name="region" label="Region" clearable disclosure>
          <option value="north" selected>North</option><option value="south">South</option>
        </ui-combobox>
        <ui-combobox id="empty" label="Empty" clearable disclosure></ui-combobox>
        <ui-combobox id="multi" name="teams" label="Teams" multiple clearable disclosure style="width: 19rem">
          <option value="design" selected>Design</option><option value="docs" selected>Docs</option><option value="platform">Platform</option>
        </ui-combobox>
        <ui-combobox id="locked" label="Locked" disabled disclosure><option value="north">North</option></ui-combobox>
        <ui-combobox id="read" label="Read" readonly disclosure><option value="north" selected>North</option></ui-combobox>
      </form>
    `, [join(root, "tokens.css")]);
    const entries = () => page.locator("#form").evaluate((form: HTMLFormElement) => ({
      region: new FormData(form).get("region"), teams: new FormData(form).getAll("teams"),
    }));
    assert.deepEqual(await entries(), { region: "north", teams: ["design", "docs"] });
    assert.equal(await page.locator("#empty [data-combobox-action='clear']").isDisabled(), true);
    assert.equal(await page.locator("#multi [data-combobox-action='clear']").isDisabled(), true);
    assert.equal(await page.locator("#single [data-combobox-action='clear']").isEnabled(), true);
    for (const id of ["locked", "read"]) {
      assert.equal(await page.locator(`#${id} [data-combobox-action='disclosure']`).isVisible(), true);
      assert.equal(await page.locator(`#${id} [data-combobox-action='disclosure']`).isDisabled(), true);
    }
    const initialHeight = await page.locator("#multi .field").evaluate((field) => field.getBoundingClientRect().height);
    await page.locator("#multi [data-combobox-action='disclosure']").click();
    await page.locator("#multi [role='option']").filter({ hasText: "Platform" }).click();
    const selectedHeight = await page.locator("#multi .field").evaluate((field) => field.getBoundingClientRect().height);
    assert.ok(Math.abs(selectedHeight - initialHeight) < 1, "adding chips does not grow the field");
    await page.locator("#empty input[role='combobox']").fill("north");
    assert.equal(await page.locator("#empty [data-combobox-action='clear']").isEnabled(), true);
    await page.locator("#empty [data-combobox-action='clear']").click();
    assert.equal(await page.locator("#empty [data-combobox-action='clear']").isDisabled(), true);
    await page.locator("#single [data-combobox-action='clear']").click();
    assert.equal(await page.locator("#single [data-combobox-action='clear']").isDisabled(), true);
    await page.locator("#form").evaluate((form: HTMLFormElement) => form.reset());
    await page.waitForTimeout(30);
    assert.deepEqual(await entries(), { region: "north", teams: ["design", "docs"] });
    await page.close();
  });
});

describe("Combobox selectedValues", () => {
  // `selectedValues` controls a multiple combobox: it sets the chips, the user's changes are reported as the
  // new list (update:selectedValues in Vue), and setting it reports nothing. A consumer that does not take a
  // change keeps its chips.
  const check = async (page: Page) => {
    const settle = () => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    const chips = (id: string) => page.locator(`#${id} .item`).evaluateAll((items) => items.map((item) => item.getAttribute("aria-label")));
    const labelled = (...labels: string[]) => labels.map((label) => `${label}, press Delete or Backspace to remove`);
    const reports = () => page.evaluate(() => (window as unknown as { reports: string[][] }).reports);
    const entries = () => page.locator("#form").evaluate((form) => Array.from(new FormData(form as HTMLFormElement), ([name, value]) => [name, String(value)]));
    const valid = () => page.locator("#form").evaluate((form) => (form as HTMLFormElement).checkValidity());
    const input = page.locator('#teams input[role="combobox"]');
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await input.waitFor();
    await settle();

    // Initial values render as labelled chips, submit their values, and satisfy required.
    assert.deepEqual(await chips("teams"), labelled("Docs"));
    assert.deepEqual(await entries(), [["teams", "docs"]]);
    assert.equal(await valid(), true);

    // Pointer adds, Backspace from the empty input removes the last, Delete on a chip removes it.
    await input.fill("Des");
    await page.locator('#teams [role="option"]').filter({ hasText: "Design" }).click();
    await settle();
    assert.deepEqual(await chips("teams"), labelled("Docs", "Design"));
    assert.deepEqual(await page.locator('#teams [role="option"][aria-selected="true"]').allTextContents(), ["Design", "Docs"]);
    await page.keyboard.press("Backspace");
    await settle();
    assert.deepEqual(await chips("teams"), labelled("Docs"));
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Delete");
    await settle();
    assert.deepEqual(await chips("teams"), []);
    assert.deepEqual(await reports(), [["docs", "design"], ["docs"], []]);
    assert.deepEqual(await entries(), []);
    assert.equal(await valid(), false, "required, with nothing chosen");

    // An external change updates the chips and the form without reporting a change.
    await page.evaluate(() => (window as unknown as { setValues: (values: string[]) => void }).setValues(["design", "platform"]));
    await settle();
    assert.deepEqual(await chips("teams"), labelled("Design", "Platform"));
    assert.deepEqual(await entries(), [["teams", "design"], ["teams", "platform"]]);
    assert.equal(await valid(), true);
    assert.equal((await reports()).length, 3);
    // A reset returns to the values the consumer set.
    await page.locator("#form").evaluate((form) => (form as HTMLFormElement).reset());
    await settle();
    assert.deepEqual(await chips("teams"), labelled("Design", "Platform"));

    // A repeated value shows one chip and submits once; the chips and hidden inputs are keyed by value.
    await page.evaluate(() => (window as unknown as { setValues: (values: string[]) => void }).setValues(["design", "design", "platform"]));
    await settle();
    assert.deepEqual(await chips("teams"), labelled("Design", "Platform"));
    assert.deepEqual(await entries(), [["teams", "design"], ["teams", "platform"]]);
    // Typing a label already chosen and a separator clears the text without adding it again.
    await input.fill("design");
    await page.keyboard.press(",");
    await settle();
    assert.equal(await input.inputValue(), "");
    assert.deepEqual(await chips("teams"), labelled("Design", "Platform"));
    assert.equal((await reports()).length, 3);
    assert.deepEqual(errors, []);

    // The consumer that ignores the change keeps its chips.
    await page.locator('#fixed input[role="combobox"]').focus();
    await page.keyboard.press("Backspace");
    await settle();
    assert.deepEqual(await chips("fixed"), labelled("Docs"));
  };
  const options = `<option value="design">Design</option><option value="docs">Docs</option><option value="platform">Platform</option>`;

  it("follows selectedValues and reports the user's changes in HTML", async () => {
    const path = await bundle("html-combobox-selected-values", `
      import "@threadlabs/looma";
      import { updateComponentProps } from "@nextwebwg/html-next/runtime";
      window.reports = [];
      const teams = () => document.querySelector("#teams");
      // A rendered component's data-* attributes only record its options; the prop channel sets them.
      window.setValues = (values) => updateComponentProps(teams(), { selectedValues: values });
      document.addEventListener("selected-values-change", (event) => {
        if (event.target !== teams()) return;
        window.reports.push(event.detail.selectedValues);
        window.setValues(event.detail.selectedValues);
      });
    `);
    const page = await open(path, `
      <form id="form">
        <ui-combobox id="teams" name="teams" label="Teams" multiple required token-separators='[","]' selected-values='["docs"]'>${options}</ui-combobox>
        <ui-combobox id="fixed" label="Fixed" multiple selected-values='["docs"]'>${options}</ui-combobox>
      </form>
    `, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });

  it("binds v-model:selectedValues in Vue", async () => {
    const path = await bundle("vue-combobox-selected-values", `
      import { createApp, h, ref } from "vue";
      import { Combobox } from "@threadlabs/looma/vue";
      const selected = ref(["docs"]);
      window.reports = [];
      window.setValues = (values) => { selected.value = values; };
      const options = () => [["design", "Design"], ["docs", "Docs"], ["platform", "Platform"]].map(([value, label]) => h("option", { value }, label));
      createApp({
        render: () => h("form", { id: "form" }, [
          h(Combobox, { id: "teams", name: "teams", label: "Teams", multiple: true, required: true, tokenSeparators: [","], selectedValues: selected.value,
            "onUpdate:selectedValues": (values) => { window.reports.push(values); selected.value = values; } }, options),
          h(Combobox, { id: "fixed", label: "Fixed", multiple: true, selectedValues: ["docs"] }, options),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await check(page);
    await page.close();
  });
});

describe("Search Result Row selected", () => {
  // A row is a button in the shell's results, not an option in a listbox, so the current result is
  // stated with aria-current, which a button supports; aria-selected would be ignored on it.
  const check = async (page: Page) => {
    await page.locator("#other").waitFor();
    assert.equal(await page.locator("#current").evaluate((element) => element.localName), "button");
    assert.equal(await page.locator("#current").getAttribute("aria-current"), "true");
    assert.notEqual(await page.locator("#other").getAttribute("aria-current"), "true");
    assert.equal(await page.locator("#current").getAttribute("aria-selected"), null);
  };

  it("states the current result to assistive technology in HTML", async () => {
    const path = await bundle("html-search-row", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-search-result-row id="current" selected><span slot="title">Tokens</span></ui-search-result-row>
      <ui-search-result-row id="other"><span slot="title">Themes</span></ui-search-result-row>
    `, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });

  it("states the current result to assistive technology in Vue", async () => {
    const path = await bundle("vue-search-row", `
      import { createApp, h } from "vue";
      import { SearchResultRow } from "@threadlabs/looma/vue";
      createApp({
        render: () => h("div", [
          h(SearchResultRow, { id: "current", selected: true }, { title: () => "Tokens" }),
          h(SearchResultRow, { id: "other" }, { title: () => "Themes" }),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await check(page);
    await page.close();
  });
});

describe("Search Shell ignores a close from inside it", () => {
  it("stays open when a tooltip or menu inside it reports close", async () => {
    const path = await bundle("html-search-shell-inner-close", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-search-shell id="shell" open label="Search">
        <span slot="search"><input type="search" aria-label="Search"><button id="clear" type="button">x</button></span>
      </ui-search-shell>`, [join(root, "tokens.css")]);
    await page.waitForSelector("dialog[open]");
    await page.evaluate(() => { (window as any).closes = 0; document.querySelector("#shell")!.addEventListener("close", () => { (window as any).closes += 1; }); });
    // Components report their own "close" as a bubbling event, as a Tooltip does when its button goes away.
    await page.evaluate(() => document.querySelector("#clear")!.dispatchEvent(new CustomEvent("close", { bubbles: true, detail: { open: false } })));
    await page.waitForTimeout(200);
    assert.equal(await page.locator("dialog").evaluate((element: HTMLDialogElement) => element.open), true);
    assert.equal(await page.evaluate(() => (window as any).closes), 1, "only the inner event itself reached the shell");
    await page.close();
  });
});

describe("Search Shell keyboard results", () => {
  const check = async (page: Page) => {
    const search = page.getByRole("searchbox", { name: "Search" });
    const first = page.locator("#first");
    const last = page.locator("#last");
    await search.focus();
    await search.press("ArrowDown");
    assert.equal(await first.evaluate((element) => element === document.activeElement), true);
    await first.press("ArrowUp");
    assert.equal(await last.evaluate((element) => element === document.activeElement), true);
    await last.press("Home");
    assert.equal(await first.evaluate((element) => element === document.activeElement), true);
    await first.press("Escape");
    await page.waitForFunction(() => !document.querySelector("dialog")?.open);
    assert.equal(await page.locator("dialog").evaluate((element: HTMLDialogElement) => element.open), false);
  };

  it("moves among enabled rows and closes on Escape in HTML", async () => {
    const path = await bundle("html-search-shell-keyboard", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-search-shell open label="Search">
        <input slot="search" type="search" aria-label="Search">
        <div slot="body">
          <ui-search-result-row id="first"><span slot="title">First</span></ui-search-result-row>
          <ui-search-result-row id="skip" disabled><span slot="title">Skip</span></ui-search-result-row>
          <ui-search-result-row id="last"><span slot="title">Last</span></ui-search-result-row>
        </div>
      </ui-search-shell>
    `, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });

  it("moves among enabled rows and closes on Escape in Vue", async () => {
    const path = await bundle("vue-search-shell-keyboard", `
      import { createApp, h } from "vue";
      import { SearchShell, SearchResultRow } from "@threadlabs/looma/vue";
      const row = (id, title, disabled = false) => h(SearchResultRow, { id, disabled }, { title: () => title });
      createApp({ render: () => h(SearchShell, { open: true, label: "Search" }, {
        search: () => h("input", { type: "search", "aria-label": "Search" }),
        body: () => h("div", [row("first", "First"), row("skip", "Skip", true), row("last", "Last")]),
      }) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await check(page);
    await page.close();
  });
});

describe("Listbox choice rows", () => {
  const check = async (page: Page) => {
    const listbox = page.locator("#regions");
    assert.equal(await listbox.evaluate((element) => element.localName), "div");
    assert.equal(await listbox.getAttribute("role"), "listbox");
    assert.equal(await listbox.getAttribute("data-enhanced"), "");
    assert.equal(await listbox.locator("select.fallback").isVisible(), false);
    assert.equal(await listbox.locator("select.fallback").isDisabled(), true);
    assert.equal(await listbox.locator('[role="option"]').count(), 3);
    assert.deepEqual((await listbox.locator('[role="option"][aria-selected="true"]').allTextContents()).map((label) => label.toLowerCase()), ["north", "west"]);
    assert.equal(await listbox.locator('[role="option"]').first().evaluate((element) => getComputedStyle(element, "::before").content), '""');
    const entries = () => page.locator("#form").evaluate((form: HTMLFormElement) =>
      Array.from(new FormData(form).getAll("regions"), String));
    assert.deepEqual(await entries(), ["north", "west"]);
    await listbox.locator('[role="option"]').nth(1).click();
    assert.deepEqual(await entries(), ["north", "south", "west"]);
    await listbox.press(" ");
    assert.deepEqual(await entries(), ["north", "west"]);
    await page.locator("#form").evaluate((form: HTMLFormElement) => form.reset());
    assert.deepEqual(await entries(), ["north", "west"]);
  };

  it("uses checked choice rows and form reset in HTML", async () => {
    const path = await bundle("html-listbox", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <form id="form"><ui-listbox id="regions" name="regions" rows="4" multiple values='["north","west"]'>
        <option value="north">North</option><option value="south">South</option><option value="west">West</option>
      </ui-listbox></form>
    `, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });

  it("uses checked choice rows and form reset in Vue", async () => {
    const path = await bundle("vue-listbox", `
      import { createApp, h } from "vue";
      import { Listbox } from "@threadlabs/looma/vue";
      createApp({ render: () => h("form", { id: "form" }, [h(Listbox, {
        id: "regions", name: "regions", rows: 4, multiple: true, values: ["north", "west"],
      }, () => ["north", "south", "west"].map((value) => h("option", { value }, value)))]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await check(page);
    await page.close();
  });

  it("keeps required form validation and a native label association", async () => {
    const path = await bundle("html-required-listbox", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <form id="form"><label for="plan">Plan</label><ui-listbox id="plan" name="plan" required>
        <option value="basic">Basic</option><option value="team">Team</option>
      </ui-listbox></form>
    `, [join(root, "tokens.css")]);
    const listbox = page.locator("#plan");
    assert.equal(await listbox.getAttribute("aria-labelledby"), await page.locator("label").getAttribute("id"));
    assert.equal(await page.locator("#form").evaluate((form: HTMLFormElement) => form.checkValidity()), false);
    await listbox.locator('[role="option"]').nth(1).click();
    assert.equal(await page.locator("#form").evaluate((form: HTMLFormElement) => form.checkValidity()), true);
    assert.deepEqual(await page.locator("#form").evaluate((form: HTMLFormElement) => Array.from(new FormData(form).getAll("plan"))), ["team"]);
    await page.locator("#form").evaluate((form: HTMLFormElement) => form.reset());
    assert.equal(await page.locator("#form").evaluate((form: HTMLFormElement) => form.checkValidity()), false);
    await page.close();
  });
});

describe("Checkbox and Switch name", () => {
  // Like a native checkbox: checked sends name=value, unchecked sends nothing.
  const check = async (page: Page) => {
    await page.locator("#alerts input").waitFor();
    const entries = () => page.locator("#form").evaluate((form) =>
      Array.from(new FormData(form as HTMLFormElement), ([name, value]) => [name, String(value)]));
    assert.deepEqual(await entries(), [["terms", "on"]]);
    await page.locator("#news input").check();
    await page.locator("#alerts input").check();
    assert.deepEqual(await entries(), [["terms", "on"], ["news", "weekly"], ["alerts", "push"]]);
  };

  it("submits a checked box with its form in HTML", async () => {
    const path = await bundle("html-checkbox-name", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <form id="form">
        <ui-checkbox name="terms" checked>Terms</ui-checkbox>
        <ui-checkbox id="news" name="news" value="weekly">News</ui-checkbox>
        <ui-switch id="alerts" name="alerts" value="push">Alerts</ui-switch>
      </form>
    `, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });

  it("submits a checked box with its form in Vue", async () => {
    const path = await bundle("vue-checkbox-name", `
      import { createApp, h } from "vue";
      import { Checkbox, Switch } from "@threadlabs/looma/vue";
      createApp({
        render: () => h("form", { id: "form" }, [
          h(Checkbox, { name: "terms", checked: true }, () => "Terms"),
          h(Checkbox, { id: "news", name: "news", value: "weekly" }, () => "News"),
          h(Switch, { id: "alerts", name: "alerts", value: "push" }, () => "Alerts"),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await check(page);
    await page.close();
  });
});

describe("Combobox name", () => {
  // The form gets the chosen value, never the label shown in the field: one entry in single mode,
  // one per chosen item in multiple mode, the typed text when free text is allowed.
  const check = async (page: Page) => {
    await page.locator('#off input[role="combobox"]').waitFor();
    const entries = () => page.locator("#form").evaluate((form) =>
      Array.from(new FormData(form as HTMLFormElement), ([name, value]) => [name, String(value)]));
    const pick = async (id: string, label: string) => {
      await page.locator(`#${id} input[role="combobox"]`).fill(label.slice(0, 2));
      await page.locator(`#${id} [role="option"]`).filter({ hasText: label }).first().click();
    };
    assert.deepEqual(await entries(), [["fruit", ""], ["city", ""], ["country", "no"]]);
    assert.equal(await page.locator('#fruit input[role="combobox"]').getAttribute("name"), null, "the visible text is not submitted");
    await pick("fruit", "Pear");
    await pick("tags", "Alpha");
    await pick("tags", "Beta");
    await page.locator('#city input[role="combobox"]').fill("Oslo");
    assert.equal(await page.locator('#fruit input[role="combobox"]').inputValue(), "Pear");
    assert.deepEqual(await entries(), [["fruit", "pear"], ["tags", "alpha"], ["tags", "beta"], ["city", "Oslo"], ["country", "no"]]);
    assert.equal(await page.locator("#unnamed input").count(), 1, "an unnamed combobox adds no form field");
  };
  const fruit = `<option value="apple">Apple</option><option value="pear">Pear</option>`;
  const tags = `<option value="alpha">Alpha</option><option value="beta">Beta</option>`;

  it("submits the value, not the label, in HTML", async () => {
    const path = await bundle("html-combobox-name", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <form id="form">
        <ui-combobox id="fruit" name="fruit" label="Fruit">${fruit}</ui-combobox>
        <ui-combobox id="tags" name="tags" label="Tags" multiple>${tags}</ui-combobox>
        <ui-combobox id="city" name="city" label="City" allow-free-text></ui-combobox>
        <ui-combobox name="country" label="Country" value="no" readonly><option value="no">Norway</option></ui-combobox>
        <ui-combobox id="off" name="off" label="Off" value="apple" disabled>${fruit}</ui-combobox>
        <ui-combobox id="unnamed" label="Unnamed">${fruit}</ui-combobox>
      </form>
    `, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });

  it("submits the value, not the label, in Vue", async () => {
    const path = await bundle("vue-combobox-name", `
      import { createApp, h } from "vue";
      import { Combobox } from "@threadlabs/looma/vue";
      const list = (pairs) => () => pairs.map(([value, label]) => h("option", { value }, label));
      const fruit = list([["apple", "Apple"], ["pear", "Pear"]]);
      createApp({
        render: () => h("form", { id: "form" }, [
          h(Combobox, { id: "fruit", name: "fruit", label: "Fruit" }, fruit),
          h(Combobox, { id: "tags", name: "tags", label: "Tags", multiple: true }, list([["alpha", "Alpha"], ["beta", "Beta"]])),
          h(Combobox, { id: "city", name: "city", label: "City", allowFreeText: true }),
          h(Combobox, { name: "country", label: "Country", value: "no", readonly: true }, list([["no", "Norway"]])),
          h(Combobox, { id: "off", name: "off", label: "Off", value: "apple", disabled: true }, fruit),
          h(Combobox, { id: "unnamed", label: "Unnamed" }, fruit),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await check(page);
    await page.close();
  });
});

describe("Editable click away", () => {
  // Clicking another field saves the edit and leaves focus in the field that was clicked.
  const check = async (page: Page) => {
    await page.locator("#note .preview").click();
    await page.waitForFunction(() => document.activeElement?.matches("#note input"));
    await page.locator("#other").click();
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    assert.equal(await page.evaluate(() => document.activeElement?.id), "other");
  };

  it("keeps focus where the user clicked in HTML", async () => {
    const path = await bundle("html-editable-away", `import "@threadlabs/looma";`);
    const page = await open(path, `<ui-editable id="note" value="Inline"></ui-editable><input id="other" aria-label="Other">`, [join(root, "tokens.css")]);
    await page.locator('#note[data-component~="ui-editable"]').waitFor();
    await check(page);
    await page.close();
  });

  it("keeps focus where the user clicked in Vue", async () => {
    const path = await bundle("vue-editable-away", `
      import { createApp, h } from "vue";
      import { Editable } from "@threadlabs/looma/vue";
      createApp({ render: () => h("div", [h(Editable, { id: "note", value: "Inline" }), h("input", { id: "other", "aria-label": "Other" })]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await check(page);
    await page.close();
  });
});

// Every Looma control that can carry a name sits in a real form here, in HTML and in Vue, and is
// used the way a person would use it. The form's own FormData is the contract: what a submit sends.
// tools/scripts/form-participation-rule.test.mjs fails if a named control is missing from this block.
describe("Form participation", () => {
  const options = (values: readonly [string, string][]) => values.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  const fruit = options([["apple", "Apple"], ["pear", "Pear"]]);
  const tags = options([["alpha", "Alpha"], ["beta", "Beta"]]);
  const topics = options([["problem", "Problem"], ["help", "Help"]]);
  const html = `
    <form id="form">
      <ui-input id="title" name="title" value="Draft"></ui-input>
      <ui-input name="off-input" value="Hidden" disabled></ui-input>
      <ui-input-group><span slot="prefix">https://</span><ui-input id="site" name="site" value="docs"></ui-input><span slot="suffix">.example.com</span></ui-input-group>
      <ui-textarea id="body" name="body" value="Hello"></ui-textarea>
      <ui-select id="topic" name="topic" value="help">${topics}</ui-select>
      <ui-listbox id="regions" name="regions" rows="3" multiple values='["north","west"]'><option value="north">North</option><option value="south">South</option><option value="west">West</option></ui-listbox>
      <ui-checkbox id="agree" name="agree" value="yes">Agree</ui-checkbox>
      <ui-checkbox id="news" name="news" value="weekly" checked>News</ui-checkbox>
      <ui-checkbox name="unticked">Unticked</ui-checkbox>
      <ui-checkbox name="off-check" checked disabled>Off</ui-checkbox>
      <ui-switch id="alerts" name="alerts" value="push">Alerts</ui-switch>
      <ui-switch name="off-switch" checked disabled>Off</ui-switch>
      <ui-radio-group id="size" name="size" value="m" label="Size">
        <ui-radio value="s">Small</ui-radio><ui-radio value="m">Medium</ui-radio><ui-radio id="size-l" value="l" disabled>Large</ui-radio>
      </ui-radio-group>
      <ui-radio-group name="off-group" value="a" label="Off" disabled><ui-radio value="a">A</ui-radio></ui-radio-group>
      <ui-radio id="free" name="plan" value="free">Free</ui-radio>
      <ui-radio name="plan" value="pro" checked>Pro</ui-radio>
      <ui-combobox id="fruit" name="fruit" label="Fruit">${fruit}</ui-combobox>
      <ui-combobox id="tags" name="tags" label="Tags" multiple>${tags}</ui-combobox>
      <ui-combobox id="city" name="city" label="City" allow-free-text></ui-combobox>
      <ui-combobox name="country" label="Country" value="no" readonly><option value="no">Norway</option></ui-combobox>
      <ui-combobox name="off-combo" label="Off" value="apple" disabled>${fruit}</ui-combobox>
      <ui-editable id="note" value="Inline"></ui-editable>
    </form>
    <form id="rules">
      <ui-radio-group id="req-group" name="req" label="Required" required><ui-radio value="x">X</ui-radio><ui-radio value="y">Y</ui-radio></ui-radio-group>
      <ui-combobox id="req-tags" name="req-tags" label="Required tags" multiple required>${tags}</ui-combobox>
    </form>
  `;
  const vue = `
    import { createApp, h } from "vue";
    import { Checkbox, Combobox, Editable, Input, InputGroup, Listbox, Radio, RadioGroup, Select, Switch, Textarea } from "@threadlabs/looma/vue";
    const list = (pairs) => () => pairs.map(([value, label]) => h("option", { value }, label));
    const fruit = list([["apple", "Apple"], ["pear", "Pear"]]);
    const tags = list([["alpha", "Alpha"], ["beta", "Beta"]]);
    const text = (value) => () => value;
    createApp({
      render: () => h("div", [
        h("form", { id: "form" }, [
          h(Input, { id: "title", name: "title", value: "Draft" }),
          h(Input, { name: "off-input", value: "Hidden", disabled: true }),
          h(InputGroup, null, { prefix: text("https://"), default: () => h(Input, { id: "site", name: "site", value: "docs" }), suffix: text(".example.com") }),
          h(Textarea, { id: "body", name: "body", value: "Hello" }),
          h(Select, { id: "topic", name: "topic", value: "help" }, list([["problem", "Problem"], ["help", "Help"]])),
          h(Listbox, { id: "regions", name: "regions", rows: 3, multiple: true, values: ["north", "west"] }, list([["north", "North"], ["south", "South"], ["west", "West"]])),
          h(Checkbox, { id: "agree", name: "agree", value: "yes" }, text("Agree")),
          h(Checkbox, { id: "news", name: "news", value: "weekly", checked: true }, text("News")),
          h(Checkbox, { name: "unticked" }, text("Unticked")),
          h(Checkbox, { name: "off-check", checked: true, disabled: true }, text("Off")),
          h(Switch, { id: "alerts", name: "alerts", value: "push" }, text("Alerts")),
          h(Switch, { name: "off-switch", checked: true, disabled: true }, text("Off")),
          h(RadioGroup, { id: "size", name: "size", value: "m", label: "Size" }, () => [
            h(Radio, { value: "s" }, text("Small")), h(Radio, { value: "m" }, text("Medium")), h(Radio, { id: "size-l", value: "l", disabled: true }, text("Large")),
          ]),
          h(RadioGroup, { name: "off-group", value: "a", label: "Off", disabled: true }, () => [h(Radio, { value: "a" }, text("A"))]),
          h(Radio, { id: "free", name: "plan", value: "free" }, text("Free")),
          h(Radio, { name: "plan", value: "pro", checked: true }, text("Pro")),
          h(Combobox, { id: "fruit", name: "fruit", label: "Fruit" }, fruit),
          h(Combobox, { id: "tags", name: "tags", label: "Tags", multiple: true }, tags),
          h(Combobox, { id: "city", name: "city", label: "City", allowFreeText: true }),
          h(Combobox, { name: "country", label: "Country", value: "no", readonly: true }, list([["no", "Norway"]])),
          h(Combobox, { name: "off-combo", label: "Off", value: "apple", disabled: true }, fruit),
          h(Editable, { id: "note", value: "Inline" }),
        ]),
        h("form", { id: "rules" }, [
          h(RadioGroup, { id: "req-group", name: "req", label: "Required", required: true }, () => [h(Radio, { value: "x" }, text("X")), h(Radio, { value: "y" }, text("Y"))]),
          h(Combobox, { id: "req-tags", name: "req-tags", label: "Required tags", multiple: true, required: true }, tags),
        ]),
      ]),
    }).mount("#app");
  `;

  // Defaults: unchecked boxes, disabled controls, the multiple combobox with nothing chosen, and the
  // in-place editor (which has no form value by design) send nothing.
  const initial = [
    ["title", "Draft"], ["site", "docs"], ["body", "Hello"], ["topic", "help"], ["regions", "north"], ["regions", "west"], ["news", "weekly"], ["size", "m"], ["plan", "pro"],
    ["fruit", ""], ["city", ""], ["country", "no"],
  ];
  const chosen = [
    ["title", "Final"], ["site", "wiki"], ["body", "Hi there"], ["topic", "problem"], ["regions", "south"], ["agree", "yes"], ["alerts", "push"], ["size", "s"],
    ["plan", "free"], ["fruit", "pear"], ["tags", "alpha"], ["tags", "beta"], ["city", "Oslo"], ["country", "no"],
  ];
  const entries = (page: Page, form = "#form") => page.locator(form).evaluate((element) =>
    Array.from(new FormData(element as HTMLFormElement), ([name, value]) => [name, String(value)]));
  // Some controls resync after the browser's own reset, so the entries are given a moment to settle.
  const settles = async (page: Page, expected: string[][]) => {
    await page.waitForFunction((want) => {
      const got = Array.from(new FormData(document.querySelector("#form") as HTMLFormElement), ([name, value]) => [name, String(value)]);
      return JSON.stringify(got) === JSON.stringify(want);
    }, expected, { timeout: 2000 }).catch(() => undefined);
    assert.deepEqual(await entries(page), expected);
  };
  const pick = async (page: Page, id: string, typed: string) => {
    await page.locator(`#${id} input[role="combobox"]`).click();
    await page.locator(`#${id} input[role="combobox"]`).fill(typed);
    await page.locator(`#${id} [role="option"]`).filter({ hasText: typed }).first().click();
  };

  const exercise = async (page: Page) => {
    await page.waitForSelector('#req-tags[data-component~="ui-combobox"] input[role="combobox"]');
    assert.deepEqual(await entries(page), initial);

    await page.locator("#title").fill("Final");
    await page.locator("#site").fill("wiki");
    await page.locator("#body").fill("Hi there");
    await page.locator("#topic").selectOption("problem");
    await page.locator('#regions [data-index="0"]').click();
    await page.locator('#regions [data-index="2"]').click();
    await page.locator('#regions [data-index="1"]').click();
    await page.locator("#agree input").check();
    await page.locator("#news input").uncheck();
    await page.locator("#alerts input").check();
    await page.locator('#size input[value="s"]').check();
    await page.locator("#free input").check();
    await pick(page, "fruit", "Pear");
    await page.locator("#note .preview").click();
    await pick(page, "tags", "Alpha");
    await pick(page, "tags", "Beta");
    await page.locator('#city input[role="combobox"]').fill("Oslo");
    await page.locator("#title").focus();
    assert.equal(await page.locator('#fruit input[role="combobox"]').inputValue(), "Pear", "the field shows the label");
    assert.deepEqual(await entries(page), chosen);
    // A radio its author disabled stays disabled inside an enabled group.
    assert.equal(await page.locator("#size-l input").isDisabled(), true);

    await page.locator("#form").evaluate((form) => (form as HTMLFormElement).reset());
    await settles(page, initial);
    assert.equal(await page.locator("#agree input").isChecked(), false);
    assert.equal(await page.locator("#news input").isChecked(), true);
    assert.equal(await page.locator('#fruit input[role="combobox"]').inputValue(), "");
    assert.equal(await page.locator("#tags .item").count(), 0);

    // A required group is required to assistive technology and to the form's own validation, and a
    // required multiple combobox is satisfied by its chosen items, not by text left in its input.
    const valid = () => page.locator("#rules").evaluate((form) => (form as HTMLFormElement).checkValidity());
    assert.equal(await page.locator('#req-group [role="radiogroup"], #req-group[role="radiogroup"]').first().getAttribute("aria-required"), "true");
    assert.deepEqual(await page.locator("#req-group input").evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).required)), [true, true]);
    assert.equal(await valid(), false);
    await page.locator('#req-group input[value="y"]').check();
    await pick(page, "req-tags", "Alpha");
    await page.locator("#title").focus();
    assert.equal(await valid(), true);
    assert.deepEqual(await entries(page, "#rules"), [["req", "y"], ["req-tags", "alpha"]]);
  };

  it("submits each HTML control's value, leaves out what a native control would, and resets", async () => {
    const path = await bundle("html-form", `import "@threadlabs/looma";`);
    const page = await open(path, html, [join(root, "tokens.css")]);
    await exercise(page);
    await page.close();
  });

  it("submits the same entries from the Vue components", async () => {
    const path = await bundle("vue-form-participation", vue);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await exercise(page);
    await page.close();
  });
});

describe("Table", () => {
  // A comfortable and a compact table, each with a text row and a row of controls; a table too wide
  // for its box; and a bounded table whose header sticks.
  const figures = ["1,204,000", "1,388,000", "1,522,000", "1,610,000", "5,724,000", "4,443,000"];
  const markup = `
    <div id="fits-box" style="width: 640px">
      <ui-table id="fits">
        <table>
          <caption>Orders</caption>
          <thead><tr><th scope="col" id="fits-head">Name</th><th scope="col" data-ui-align="end">Seats</th></tr></thead>
          <tbody>
            <tr id="fits-text"><th scope="row">Ada</th><td data-ui-align="end" id="fits-figure">3</td></tr>
            <tr id="fits-control"><th scope="row"><ui-checkbox>Grace</ui-checkbox></th><td><ui-select aria-label="Role"><option>Editor</option></ui-select></td></tr>
          </tbody>
        </table>
      </ui-table>
    </div>
    <ui-table id="compact" density="compact">
      <table>
        <caption>Members</caption>
        <tbody>
          <tr id="compact-text"><th scope="row">Ada</th><td>Owner</td></tr>
          <tr id="compact-control"><th scope="row"><ui-checkbox>Grace</ui-checkbox></th><td><ui-button size="sm">Edit</ui-button></td></tr>
        </tbody>
      </table>
    </ui-table>
    <div id="wide-box" style="width: 200px">
      <ui-table id="wide">
        <table>
          <caption>Quarterly figures</caption>
          <tbody><tr>${figures.map((figure) => `<td>${figure}</td>`).join("")}</tr></tbody>
        </table>
      </ui-table>
    </div>
    <ui-table id="sticky" sticky-header style="block-size: 7rem">
      <table>
        <caption>Days</caption>
        <thead><tr><th scope="col" id="sticky-head">Day</th></tr></thead>
        <tbody>${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => `<tr><td>${day}</td></tr>`).join("")}</tbody>
      </table>
    </ui-table>`;

  async function checkTable(page: Page) {
    await page.locator("#sticky-head").waitFor();
    // A row's height inside its separator: the last row has none.
    const height = (selector: string) => page.locator(selector).evaluate((row) => (row as HTMLTableRowElement).cells[0].clientHeight);

    // The authored table stays a table, captioned, with its header scopes.
    assert.equal(await page.locator("#fits > table > caption").textContent(), "Orders");
    assert.equal(await page.getByRole("table", { name: "Orders" }).count(), 1);
    assert.equal(await page.locator('#fits th[scope="col"]').count(), 2);
    assert.equal(await page.locator("#fits-figure").evaluate((element) => getComputedStyle(element).textAlign), "end");

    // A row of controls keeps the rhythm of a row of text, and compact rows are shorter.
    assert.equal(await height("#fits-control"), await height("#fits-text"));
    assert.equal(await height("#compact-control"), await height("#compact-text"));
    assert.ok(await height("#compact-text") < await height("#fits-text"), "compact rows are shorter");

    // A table that fits is not a region or a tab stop.
    assert.equal(await page.locator("#fits").getAttribute("role"), null);
    assert.equal(await page.locator("#fits").getAttribute("tabindex"), null);

    // A table wider than its box is a region named by its caption, which the keyboard scrolls.
    const region = page.getByRole("region", { name: "Quarterly figures" });
    await region.waitFor();
    assert.equal(await region.getAttribute("tabindex"), "0");
    await region.focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(() => document.querySelector("#wide")!.scrollLeft > 0);

    // Given room, it is plain again; narrowed, the fitting table becomes a region.
    await page.locator("#wide-box").evaluate((element) => { element.style.width = "2000px"; });
    await page.waitForFunction(() => !document.querySelector("#wide")!.hasAttribute("role"));
    assert.equal(await page.locator("#wide").getAttribute("tabindex"), null);
    await page.locator("#fits-box").evaluate((element) => { element.style.width = "80px"; });
    await page.getByRole("region", { name: "Orders" }).waitFor();

    // A sticky header stays at the top of its table as the rows scroll, and a table that scrolls
    // only down is a region the keyboard can reach too.
    await page.getByRole("region", { name: "Days" }).waitFor();
    assert.equal(await page.locator("#fits-head").evaluate((element) => getComputedStyle(element).position), "static");
    await page.locator("#sticky").evaluate((element) => { element.scrollTop = 60; });
    const [head, box] = await Promise.all([page.locator("#sticky-head").boundingBox(), page.locator("#sticky").boundingBox()]);
    assert.ok(Math.abs(head!.y - box!.y) <= 1, `header ${head!.y} at the top ${box!.y}`);
  }

  it("styles an authored table, and makes a table too wide a named, scrollable region, in HTML", async () => {
    const path = await bundle("html-table", `import "@threadlabs/looma";`);
    const page = await open(path, markup, [join(root, "tokens.css")]);
    await checkTable(page);
    await page.close();
  });

  it("judges a moved table again, so a table re-inserted and then widened is plain", async () => {
    const path = await bundle("html-table", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <div id="moved-box" style="width: 200px">
        <ui-table id="moved"><table><caption>Moved</caption><tbody><tr>${figures.map((figure) => `<td>${figure}</td>`).join("")}</tr></tbody></table></ui-table>
      </div>`, [join(root, "tokens.css")]);
    await page.getByRole("region", { name: "Moved" }).waitFor();
    await page.evaluate(() => { (window as unknown as { moved: Element }).moved = document.querySelector("#moved")!; document.querySelector("#moved")!.remove(); });
    await page.waitForTimeout(50);
    await page.evaluate(() => { document.querySelector("#moved-box")!.append((window as unknown as { moved: Element }).moved); });
    await page.getByRole("region", { name: "Moved" }).waitFor();
    await page.locator("#moved-box").evaluate((element) => { element.style.width = "2000px"; });
    await page.waitForFunction(() => !document.querySelector("#moved")!.hasAttribute("role"));
    assert.equal(await page.locator("#moved").getAttribute("tabindex"), null);
    assert.equal(await page.locator("#moved").getAttribute("aria-labelledby"), null);
    await page.close();
  });

  it("styles an authored table, and makes a table too wide a named, scrollable region, in Vue", async () => {
    const path = await bundle("vue-table", `
      import { createApp, h } from "vue";
      import { Button, Checkbox, Select, Table } from "@threadlabs/looma/vue";
      const figures = ${JSON.stringify(figures)};
      createApp({ render: () => [
        h("div", { id: "fits-box", style: "width: 640px" }, h(Table, { id: "fits" }, () => h("table", [
          h("caption", "Orders"),
          h("thead", h("tr", [h("th", { scope: "col", id: "fits-head" }, "Name"), h("th", { scope: "col", "data-ui-align": "end" }, "Seats")])),
          h("tbody", [
            h("tr", { id: "fits-text" }, [h("th", { scope: "row" }, "Ada"), h("td", { "data-ui-align": "end", id: "fits-figure" }, "3")]),
            h("tr", { id: "fits-control" }, [
              h("th", { scope: "row" }, h(Checkbox, null, () => "Grace")),
              h("td", h(Select, { "aria-label": "Role" }, () => h("option", "Editor"))),
            ]),
          ]),
        ]))),
        h(Table, { id: "compact", density: "compact" }, () => h("table", [
          h("caption", "Members"),
          h("tbody", [
            h("tr", { id: "compact-text" }, [h("th", { scope: "row" }, "Ada"), h("td", "Owner")]),
            h("tr", { id: "compact-control" }, [h("th", { scope: "row" }, h(Checkbox, null, () => "Grace")), h("td", h(Button, { size: "sm" }, () => "Edit"))]),
          ]),
        ])),
        h("div", { id: "wide-box", style: "width: 200px" }, h(Table, { id: "wide" }, () => h("table", [
          h("caption", "Quarterly figures"),
          h("tbody", h("tr", figures.map((figure) => h("td", figure)))),
        ]))),
        h(Table, { id: "sticky", stickyHeader: true, style: "block-size: 7rem" }, () => h("table", [
          h("caption", "Days"),
          h("thead", h("tr", h("th", { scope: "col", id: "sticky-head" }, "Day"))),
          h("tbody", ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => h("tr", h("td", day)))),
        ])),
      ] }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await checkTable(page);
    await page.close();
  });

  it("renders the authored table on the server, with no region until it scrolls", async () => {
    const { createSSRApp, h } = await import("vue");
    const { renderToString } = await import("vue/server-renderer");
    const { Table } = await import("@threadlabs/looma/vue");
    const html = await renderToString(createSSRApp({
      render: () => h(Table, { density: "compact", stickyHeader: true }, () => h("table", [h("caption", "Orders"), h("tbody", h("tr", h("td", "1")))])),
    }));
    assert.match(html, /^<div data-component="ui-table"/);
    assert.match(html, /data-ui-table-state="density density=compact stickyHeader"/);
    assert.match(html, /<table[^>]*><caption[^>]*>Orders<\/caption>/);
    assert.doesNotMatch(html, /role=|tabindex=/);
  });
});

describe("Description list layouts", () => {
  const hash = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";
  // A default list in a shrink-to-fit box and in a flex row keeps its content width.
  const lists = [
    { id: "rows", style: "width: 720px", props: {} },
    { id: "stacked", style: "width: 720px", props: { layout: "stacked" } },
    { id: "grid", style: "width: 720px", props: { layout: "grid", columns: "3" } },
    { id: "compact", style: "width: 720px", props: { density: "compact" } },
    { id: "floating", style: "position: absolute; inset-block-start: 0; inset-inline-end: 0; width: fit-content", props: {} },
    { id: "flex", style: "display: flex; width: 720px", props: {} },
  ];
  const terms = ["Order", "Status", "Total", "Checksum"];

  async function checkLists(page: Page) {
    await page.locator("#grid-4 dd").waitFor();
    const box = async (selector: string) => (await page.locator(selector).boundingBox())!;

    // Rows set the term beside its value; stacked sets it above.
    assert.ok(Math.abs((await box("#rows-1 dt")).y - (await box("#rows-1 dd")).y) <= 1, "rows: term beside value");
    const [term, value] = [await box("#stacked-1 dt"), await box("#stacked-1 dd")];
    assert.ok(value.y >= term.y + term.height - 1, "stacked: term above value");

    // Sized by its content, a default list neither collapses in a shrink-to-fit box nor stretches
    // across a flex row.
    for (const id of ["floating", "flex"]) {
      const [list, term, value] = [await box(`#${id}`), await box(`#${id}-1 dt`), await box(`#${id}-1 dd`)];
      assert.ok(Math.abs(term.y - value.y) <= 1, `${id}: term beside value`);
      assert.ok(value.x + value.width <= list.x + list.width + 1 && value.width > 0, `${id}: the value is inside the list`);
      assert.ok(list.width < 400, `${id}: the list is ${list.width}px, not stretched`);
    }

    // A grid of three columns: three facts per row, the fourth on the next.
    const tops = await Promise.all([1, 2, 3, 4].map(async (n) => Math.round((await box(`#grid-${n}`)).y)));
    assert.deepEqual(tops.slice(0, 3), [tops[0], tops[0], tops[0]]);
    assert.ok(tops[3] > tops[0], "the fourth fact starts a new row");

    // A long identifier wraps inside its value rather than overflowing.
    const [list, fact] = [await box("#grid"), await box("#grid-4")];
    assert.ok(fact.x + fact.width <= list.x + list.width + 1, "the fact stays within the list");
    assert.equal(await page.locator("#grid-4 dd").evaluate((element) => element.scrollWidth <= element.clientWidth), true);

    // Compact sets the pairs closer together.
    const gap = async (id: string) => (await box(`#${id}-2`)).y - ((await box(`#${id}-1`)).y + (await box(`#${id}-1`)).height);
    assert.ok(await gap("compact") < await gap("rows"), "compact pairs are closer");
  }

  it("lays out facts in rows, stacked, and in a grid, in HTML", async () => {
    const path = await bundle("html-description-list-layouts", `import "@threadlabs/looma";`);
    const attributes = (props: Record<string, unknown>) => Object.entries(props).map(([name, value]) => ` ${name}="${value}"`).join("");
    const page = await open(path, lists.map(({ id, style, props }) => `
      <div style="${style}"><ui-description-list id="${id}"${attributes(props)}>
        ${terms.map((term, index) => `<ui-description-item id="${id}-${index + 1}" term="${term}">${id === "grid" && index === 3 ? `<ui-text variant="code">${hash}</ui-text>` : "Value"}</ui-description-item>`).join("")}
      </ui-description-list></div>`).join(""), [join(root, "tokens.css")]);
    await checkLists(page);
    await page.close();
  });

  it("lays out facts in rows, stacked, and in a grid, in Vue", async () => {
    const path = await bundle("vue-description-list-layouts", `
      import { createApp, h } from "vue";
      import { DescriptionItem, DescriptionList, Text } from "@threadlabs/looma/vue";
      const lists = ${JSON.stringify(lists)};
      const terms = ${JSON.stringify(terms)};
      createApp({ render: () => lists.map(({ id, style, props }) => h("div", { style }, h(DescriptionList, { id, ...props }, () =>
        terms.map((term, index) => h(DescriptionItem, { id: \`\${id}-\${index + 1}\`, term }, () => id === "grid" && index === 3 ? h(Text, { variant: "code" }, () => "${hash}") : "Value"))))) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await checkLists(page);
    await page.close();
  });
});

describe("Sidebar", () => {
  it("animates docked occupancy with a fixed content canvas and follows pointer resizing immediately", async () => {
    const path = await bundle("html-sidebar-layout-motion", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <div style="display:flex;width:900px;height:480px;--ui-motion-layout:1000ms">
        <ui-sidebar id="nav" width="280" resizable style="--ui-sidebar-collapsed-width:56px"><a href="#content">Navigation</a></ui-sidebar>
        <main id="content" style="flex:1">Content</main>
      </div>
      <button id="toggle" commandfor="nav" command="--toggle">Toggle</button>
    `, [join(root, "tokens.css")], { viewport: { width: 1280, height: 800 }, reducedMotion: "no-preference" });
    await page.locator("#toggle").click();
    await page.waitForTimeout(80);
    const intermediate = await page.evaluate(() => ({
      sidebar: document.querySelector("#nav")!.getBoundingClientRect().width,
      canvas: document.querySelector("#nav .content")!.getBoundingClientRect().width,
      main: document.querySelector("#content")!.getBoundingClientRect().width,
      inert: document.querySelector("#nav")!.hasAttribute("inert"),
    }));
    assert.ok(intermediate.sidebar > 56 && intermediate.sidebar < 280, JSON.stringify(intermediate));
    assert.equal(intermediate.canvas, 279);
    assert.ok(intermediate.main > 620 && intermediate.main < 844);
    assert.equal(intermediate.inert, true);
    await page.locator("#toggle").click();
    await page.waitForTimeout(1100);
    const handle = await page.locator("#nav .resizer").boundingBox();
    await page.mouse.move(handle!.x + 4, handle!.y + 40);
    await page.mouse.down();
    await page.mouse.move(handle!.x + 84, handle!.y + 40);
    assert.equal((await page.locator("#nav").boundingBox())!.width, 360);
    await page.mouse.up();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator("#toggle").click();
    assert.equal((await page.locator("#nav").boundingBox())!.width, 56);
    await page.close();
  });
  type Probe = { toggles: unknown[]; resizes: unknown[] };
  const probe = (page: Page) => page.evaluate(() => (window as unknown as { probe: Probe }).probe);
  const watchErrors = (page: Page) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    return errors;
  };

  // Below its breakpoint the sidebar is a popover drawer; the invoker opens and closes it, and each
  // change is one toggle event, not a loop through the popover's own toggle event of the same name.
  async function checkDrawer(page: Page) {
    await page.setViewportSize({ width: 375, height: 700 });
    await page.locator("#nav[popover]").waitFor({ state: "attached" });
    const errors = watchErrors(page);
    await page.locator("#menu").click();
    await page.locator("#nav").waitFor({ state: "visible" });
    await page.waitForTimeout(50);
    // The open drawer covers the invoker, as it would a phone's menu button; activate it directly.
    await page.locator("#menu").evaluate((button) => (button as HTMLButtonElement).click());
    await page.locator("#nav").waitFor({ state: "hidden" });
    await page.waitForTimeout(50);
    assert.deepEqual(errors, []);
    assert.deepEqual((await probe(page)).toggles, [
      { open: true, mode: "drawer", trigger: "programmatic" },
      { open: false, mode: "drawer", trigger: "programmatic" },
    ]);
  }

  it("opens and closes as a drawer, announcing each change once, in HTML", async () => {
    const path = await bundle("html-sidebar-drawer", `
      import "@threadlabs/looma";
      window.probe = { toggles: [], resizes: [] };
      document.getElementById("nav").addEventListener("toggle", (event) => {
        if (event instanceof CustomEvent) window.probe.toggles.push(event.detail);
      });
    `);
    const page = await open(path, `
      <button id="menu" commandfor="nav" command="--toggle">Menu</button>
      <ui-sidebar id="nav" aria-label="Workspace"><a href="#inbox">Inbox</a></ui-sidebar>
    `, [join(root, "tokens.css")]);
    await checkDrawer(page);
    await page.close();
  });

  it("opens and closes as a drawer, announcing each change once, in Vue", async () => {
    const path = await bundle("vue-sidebar-drawer", `
      import { createApp, h } from "vue";
      import { Sidebar } from "@threadlabs/looma/vue";
      window.probe = { toggles: [], resizes: [] };
      createApp({ render: () => [
        h("button", { id: "menu", commandfor: "nav", command: "--toggle" }, "Menu"),
        h(Sidebar, { id: "nav", "aria-label": "Workspace", width: 256, onToggle: (event) => window.probe.toggles.push(event.detail) },
          () => h("a", { href: "#inbox" }, "Inbox")),
      ] }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await checkDrawer(page);
    await page.close();
  });

  it("takes its docked width from the width prop, in Vue", async () => {
    const path = await bundle("vue-sidebar-width", `
      import { createApp, h, ref } from "vue";
      import { Sidebar } from "@threadlabs/looma/vue";
      window.probe = { toggles: [], resizes: [] };
      const width = ref(256);
      window.width = width;
      createApp({ render: () => h(Sidebar, {
        id: "nav", "aria-label": "Workspace", width: width.value, resizable: true,
        onResize: (event) => window.probe.resizes.push(event.detail),
      }, () => h("a", { href: "#inbox" }, "Inbox")) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const errors = watchErrors(page);
    const width = () => page.locator("#nav").evaluate((element) => element.getBoundingClientRect().width);
    assert.equal(await width(), 256);
    await page.evaluate(() => { (window as unknown as { width: { value: number } }).width.value = 300; });
    await page.waitForFunction(() => document.querySelector("#nav")!.getBoundingClientRect().width === 300);
    assert.equal(await width(), 300);
    assert.equal(await page.locator("#nav .resizer").getAttribute("aria-valuenow"), "300");
    assert.deepEqual(errors, []);
    assert.deepEqual((await probe(page)).resizes, [{ width: 256, trigger: "programmatic" }, { width: 300, trigger: "programmatic" }]);
    await page.close();
  });
});

describe("Component hooks", () => {
  // A tree of components, one spec for both adapters: [component or element, attributes, children].
  type Node = [string, Record<string, string | boolean>, (Node | string)[]?];
  const hook = (name: string, value: string) => ({ style: `${name}: ${value}` });
  const mark = "rgb(1, 2, 3)";
  const tree: Node[] = [
    // A hook on the outer stack removes only its gap; the nested stacks keep their prop or default.
    ["Stack", { id: "stack-outer", ...hook("--ui-stack-gap", "0") }, [
      ["Stack", { id: "stack-prop", gap: "l" }, [["span", {}, ["a"]], ["span", {}, ["b"]]]],
      ["Stack", { id: "stack-default" }, [["span", {}, ["a"]], ["span", {}, ["b"]]]],
      ["Stack", { id: "stack-own", ...hook("--ui-stack-gap", "7px") }, [["span", {}, ["a"]], ["span", {}, ["b"]]]],
    ]],
    ["Cluster", { id: "cluster-outer", ...hook("--ui-cluster-gap", "0") }, [
      ["Cluster", { id: "cluster-nested" }, [["span", {}, ["a"]], ["span", {}, ["b"]]]],
      ["Cluster", { id: "cluster-own", ...hook("--ui-cluster-gap", "7px") }, [["span", {}, ["a"]], ["span", {}, ["b"]]]],
    ]],
    ["Grid", { id: "grid-outer", ...hook("--ui-grid-gap", "0") }, [
      ["Grid", { id: "grid-nested" }, [["span", {}, ["a"]], ["span", {}, ["b"]]]],
      ["Grid", { id: "grid-own", ...hook("--ui-grid-gap", "7px") }, [["span", {}, ["a"]], ["span", {}, ["b"]]]],
    ]],
    ["div", hook("--ui-badge-border", mark), [["Badge", { id: "badge-nested" }, ["New"]]]],
    ["Badge", { id: "badge-plain" }, ["New"]],
    ["Badge", { id: "badge-own", ...hook("--ui-badge-border", mark) }, ["New"]],
    ["div", hook("--ui-button-surface", mark), [["Button", { id: "button-nested" }, ["Save"]]]],
    ["Button", { id: "button-plain" }, ["Save"]],
    ["Button", { id: "button-own", ...hook("--ui-button-surface", mark) }, ["Save"]],
    ["div", hook("--ui-input-radius", "7px"), [["Input", { id: "input-nested", "aria-label": "Nested" }]]],
    ["Input", { id: "input-plain", "aria-label": "Plain" }],
    ["Input", { id: "input-own", "aria-label": "Own", ...hook("--ui-input-radius", "7px") }],
    ["nav", { "aria-label": "Hooked", ...hook("--ui-nav-item-indicator-color", mark) }, [["NavItem", { id: "nav-nested", variant: "line", current: "true" }, ["Home"]]]],
    ["NavItem", { id: "nav-plain", variant: "line", current: "true" }, ["Home"]],
    ["NavItem", { id: "nav-own", variant: "line", current: "true", ...hook("--ui-nav-item-indicator-color", mark) }, ["Home"]],
    // A hook a component reads on an inner part reaches that part from the root, and no further.
    ["Callout", { id: "callout-outer", ...hook("--ui-callout-icon", mark) }, [["Callout", { id: "callout-nested" }, ["Inner"]]]],
    ["Callout", { id: "callout-plain" }, ["Plain"]],
    // Theme tokens still theme a subtree.
    ["div", { style: `--ui-space-5: 40px; --ui-accent: ${mark}` }, [
      ["Stack", { id: "stack-themed", gap: "l" }, [["span", {}, ["a"]], ["span", {}, ["b"]]]],
      ["NavItem", { id: "nav-themed", variant: "line", current: "true" }, ["Home"]],
    ]],
  ];

  const kebab = (name: string) => name.replace(/[A-Z]/g, (letter, index) => `${index ? "-" : ""}${letter.toLowerCase()}`);
  const html = (nodes: (Node | string)[]): string => nodes.map((node) => {
    if (typeof node === "string") return node;
    const [name, attributes, children = []] = node;
    const tag = /^[A-Z]/.test(name) ? `ui-${kebab(name)}` : name;
    const attrs = Object.entries(attributes).map(([key, value]) => value === true ? key : `${key}="${value}"`).join(" ");
    return `<${tag} ${attrs}>${html(children)}</${tag}>`;
  }).join("");

  async function checkHooks(page: Page) {
    await page.locator("#nav-themed").waitFor();
    const style = (id: string, property: string, part?: string) => page.locator(`#${id}`).evaluate((element, [property, part]) =>
      getComputedStyle(part ? element.querySelector(part)! : element).getPropertyValue(property!), [property, part]);

    // The Stack bug: a hook on a container reached every nested Stack and beat an explicit gap prop.
    assert.equal(await style("stack-outer", "row-gap"), "0px", "the hook styles the stack it is set on");
    assert.equal(await style("stack-prop", "row-gap"), "24px", "a nested stack keeps its gap prop");
    assert.equal(await style("stack-default", "row-gap"), "16px", "a nested stack keeps its default");
    assert.equal(await style("stack-own", "row-gap"), "7px", "the hook set on the stack itself wins over its default");
    assert.equal(await style("cluster-nested", "column-gap"), "12px", "a nested cluster keeps its default");
    assert.equal(await style("cluster-own", "column-gap"), "7px", "the hook set on the cluster itself wins");
    assert.equal(await style("grid-nested", "row-gap"), "16px", "a nested grid keeps its default");
    assert.equal(await style("grid-own", "row-gap"), "7px", "the hook set on the grid itself wins");

    for (const [component, property, value, part] of [
      ["badge", "border-top-color", mark],
      ["button", "background-color", mark],
      ["input", "border-top-left-radius", "7px"],
      ["nav", "border-inline-start-color", mark, ".indicator"],
    ] as const) {
      const plain = await style(`${component}-plain`, property, part);
      assert.notEqual(plain, value, `${component}: the default differs from the hook's value`);
      assert.equal(await style(`${component}-nested`, property, part), plain, `${component}: a hook on a container leaves the instance inside at its default`);
      assert.equal(await style(`${component}-own`, property, part), value, `${component}: a hook on the instance styles it`);
    }

    assert.equal(await style("callout-outer", "color", ".icon"), mark, "a callout's hook reaches its own icon");
    assert.equal(await style("callout-nested", "color", ".icon"), await style("callout-plain", "color", ".icon"), "and not a nested callout's");

    assert.equal(await style("stack-themed", "row-gap"), "40px", "a spacing token themes the stacks in its subtree");
    assert.equal(await style("nav-themed", "border-inline-start-color", ".indicator"), mark, "the accent themes the nav items in its subtree");
  }

  it("style only the instance they are set on, in HTML", async () => {
    const path = await bundle("html-hooks", `import "@threadlabs/looma";`);
    const page = await open(path, html(tree), [join(root, "tokens.css")]);
    await page.waitForSelector('#nav-themed[data-component~="ui-nav-item"]');
    await checkHooks(page);
    await page.close();
  });

  it("style only the instance they are set on, in Vue", async () => {
    const path = await bundle("vue-hooks", `
      import { createApp, h } from "vue";
      import * as looma from "@threadlabs/looma/vue";
      const render = (node) => {
        if (typeof node === "string") return node;
        const [name, attributes, children = []] = node;
        return h(/^[A-Z]/.test(name) ? looma[name] : name, attributes, /^[A-Z]/.test(name) ? () => children.map(render) : children.map(render));
      };
      createApp({ render: () => ${JSON.stringify(tree)}.map(render) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await checkHooks(page);
    await page.close();
  });
});

describe("Theme levels", () => {
  it("applies global, inherited group, and instance values in that order across themes", async () => {
    const path = await bundle("html-theme-levels", `import "@threadlabs/looma";`);
    const body = `
      <style>:root { --ui-radius-md: 12px; --ui-danger: rgb(180, 10, 30); }</style>
      <ui-input id="global-input" aria-label="Global" invalid></ui-input>
      <ui-button id="global-danger" tone="danger" variant="solid">Delete</ui-button>
      <section id="group" style="--ui-field-radius: 3px; --ui-field-danger: rgb(150, 20, 40); --ui-action-radius: 5px; --ui-overlay-radius: 9px; --ui-overlay-surface: rgb(237, 239, 242); --ui-overlay-border: rgb(22, 33, 44); --ui-overlay-shadow: none">
        <ui-input id="group-input" aria-label="Grouped" invalid></ui-input>
        <ui-input id="local-input" aria-label="Local" invalid style="--ui-input-radius: 7px"></ui-input>
        <ui-select id="group-select" aria-label="Grouped select" invalid><option>One</option></ui-select>
        <ui-select id="local-select" aria-label="Local select" invalid style="--ui-select-radius: 6px; --ui-select-invalid-border: rgb(90, 70, 130)"><option>One</option></ui-select>
        <ui-listbox id="group-listbox" aria-label="Grouped listbox" invalid><option>One</option><option>Two</option></ui-listbox>
        <ui-listbox id="local-listbox" aria-label="Local listbox" invalid style="--ui-listbox-radius: 6px; --ui-listbox-invalid-border: rgb(90, 70, 130)"><option>One</option><option>Two</option></ui-listbox>
        <ui-textarea id="group-textarea" aria-label="Grouped textarea" invalid></ui-textarea>
        <ui-form-field id="group-field" invalid><ui-input aria-label="Field input"></ui-input><span slot="error" role="alert" id="field-message">Required</span></ui-form-field>
        <ui-button id="group-button">Save</ui-button>
        <ui-button id="group-danger" tone="danger" variant="solid">Delete</ui-button>
        <ui-icon-button id="group-icon-button" label="More"><ui-icon name="ellipsis"></ui-icon></ui-icon-button>
        <ui-menu id="group-menu"><ui-menu-item value="one">One</ui-menu-item></ui-menu>
        <ui-menu id="local-menu" style="--ui-menu-radius: 4px; --ui-menu-surface: rgb(210, 211, 212); --ui-menu-border: rgb(80, 81, 82); --ui-menu-shadow: none"><ui-menu-item value="two">Two</ui-menu-item></ui-menu>
      </section>`;
    const css = ["tokens.css", "theme-light.css", "theme-dark.css", "theme-high-contrast.css"].map((file) => join(root, file));
    const page = await open(path, body, css);
    await page.waitForSelector('#group-input[data-component~="ui-input"]');
    const look = (selector: string, property: string) => page.locator(selector).evaluate((element, name) =>
      getComputedStyle(element).getPropertyValue(name), property);

    for (const [theme, value] of [["data-theme", "light"], ["data-theme", "dark"], ["data-contrast", "high"]] as const) {
      await page.evaluate(() => { document.documentElement.removeAttribute("data-theme"); document.documentElement.removeAttribute("data-contrast"); });
      await page.evaluate(([name, setting]) => document.documentElement.setAttribute(name, setting), [theme, value]);
      assert.equal(await look("#global-input", "border-top-left-radius"), "12px", `${value}: global radius`);
      for (const id of ["group-input", "group-select", "group-listbox", "group-textarea"]) {
        assert.equal(await look(`#${id}`, "border-top-left-radius"), "3px", `${value}: ${id} inherits the field radius`);
        assert.equal(await look(`#${id}`, "border-top-color"), "rgb(150, 20, 40)", `${value}: ${id} inherits field danger`);
      }
      assert.equal(await look("#local-input", "border-top-left-radius"), "7px", `${value}: component hook wins`);
      assert.equal(await look("#local-select", "border-top-left-radius"), "6px", `${value}: local select radius wins`);
      assert.equal(await look("#local-select", "border-top-color"), "rgb(90, 70, 130)", `${value}: local select danger wins`);
      assert.equal(await look("#local-listbox", "border-top-left-radius"), "6px", `${value}: local listbox radius wins`);
      assert.equal(await look("#local-listbox", "border-top-color"), "rgb(90, 70, 130)", `${value}: local listbox danger wins`);
      assert.equal(await look("#field-message", "color"), "rgb(150, 20, 40)", `${value}: field message shares danger`);
      for (const id of ["group-button", "group-icon-button"]) {
        assert.equal(await look(`#${id}`, "border-top-left-radius"), "5px", `${value}: ${id} inherits action radius`);
      }
      assert.equal(await look("#group-menu .surface", "border-top-left-radius"), "9px", `${value}: menu inherits overlay radius`);
      assert.equal(await look("#group-menu .surface", "background-color"), "rgb(237, 239, 242)", `${value}: menu inherits overlay surface`);
      assert.equal(await look("#group-menu .surface", "border-top-color"), "rgb(22, 33, 44)", `${value}: menu inherits overlay border`);
      assert.equal(await look("#group-menu .surface", "box-shadow"), "none", `${value}: menu inherits overlay shadow`);
      assert.equal(await look("#local-menu .surface", "border-top-left-radius"), "4px", `${value}: local menu radius wins`);
      assert.equal(await look("#local-menu .surface", "background-color"), "rgb(210, 211, 212)", `${value}: local menu surface wins`);
      assert.equal(await look("#local-menu .surface", "border-top-color"), "rgb(80, 81, 82)", `${value}: local menu border wins`);
      assert.equal(await look("#global-danger", "background-color"), await look("#group-danger", "background-color"), `${value}: field danger does not change destructive actions`);
    }
    await page.close();
  });

  it("keeps inherited group values in the generated Vue components", async () => {
    const path = await bundle("vue-theme-levels", `
      import { createApp, h } from "vue";
      import { Button, Icon, IconButton, Input, Menu, MenuItem } from "@threadlabs/looma/vue";
      createApp({ render: () => h("section", {
        style: "--ui-field-radius: 3px; --ui-field-danger: rgb(150, 20, 40); --ui-action-radius: 5px; --ui-overlay-radius: 9px",
      }, [
        h(Input, { id: "field", invalid: true, "aria-label": "Field" }),
        h(Button, { id: "action" }, () => "Save"),
        h(IconButton, { id: "icon-action", label: "More" }, () => h(Icon, { name: "ellipsis" })),
        h(Menu, { id: "menu" }, () => h(MenuItem, { value: "one" }, () => "One")),
        h(Menu, { id: "local-menu", style: "--ui-menu-radius: 4px" }, () => h(MenuItem, { value: "two" }, () => "Two")),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const look = (selector: string, property: string) => page.locator(selector).evaluate((element, name) =>
      getComputedStyle(element).getPropertyValue(name), property);
    assert.equal(await look("#field", "border-top-left-radius"), "3px");
    assert.equal(await look("#field", "border-top-color"), "rgb(150, 20, 40)");
    assert.equal(await look("#action", "border-top-left-radius"), "5px");
    assert.equal(await look("#icon-action", "border-top-left-radius"), "5px");
    assert.equal(await look("#menu .surface", "border-top-left-radius"), "9px");
    assert.equal(await look("#local-menu .surface", "border-top-left-radius"), "4px");
    await page.close();
  });

  it("applies the global round radius to round controls and status shapes", async () => {
    const path = await bundle("html-round-radius", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <ui-avatar id="avatar" name="Ada Lovelace"></ui-avatar>
      <ui-switch id="switch">Enabled</ui-switch>
      <ui-avatar-group id="avatars" max="1"><ui-avatar name="Ada"></ui-avatar><ui-avatar name="Grace"></ui-avatar></ui-avatar-group>
    `, [join(root, "tokens.css")]);
    await page.addStyleTag({ content: ":root { --ui-radius-round: 6px; }" });
    const radius = (selector: string) => page.locator(selector).evaluate((element) => getComputedStyle(element).borderTopLeftRadius);
    assert.equal(await radius("#avatar"), "6px");
    assert.equal(await radius("#switch input"), "6px");
    assert.equal(await radius("#avatars .overflow"), "6px");
    await page.close();
  });
});

describe("Meter", () => {
  it("localizes its spoken percentage in native HTML and Vue while keeping CSS numeric", async () => {
    for (const target of ["html", "vue"]) {
      const path = await bundle(`localized-meter-${target}`, target === "html"
        ? `import "@threadlabs/looma";`
        : `import { createApp, h, ref } from "vue";
           import { Meter } from "@threadlabs/looma/vue";
           const value = ref(0.29);
           window.localizedMeterValue = value;
           createApp({ render: () => h(Meter, { value: value.value, label: "Progress" }) }).mount("#app");`);
      const page = await open(path, target === "html"
        ? '<ui-meter id="meter" value="0.29" label="Progress"></ui-meter>'
        : '<div id="app"></div>', css, { locale: "de-DE" });
      const meter = page.getByRole("meter", { name: "Progress" });
      assert.equal(await meter.getAttribute("aria-valuetext"), "29\u00a0%");
      const fill = await meter.locator(".fill").evaluate((element) => (element as HTMLElement).style.inlineSize);
      assert.ok(fill.endsWith("%") && Math.abs(parseFloat(fill) - 29) < 0.000001, fill);
      if (target === "vue") {
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
    assert.equal(await collected.getAttribute("aria-valuetext"), "$750 of $1,240 collected");
    assert.equal(await page.getByRole("meter", { name: "Setup checklist" }).getAttribute("aria-valuetext"), "60%");

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
    assert.equal(await page.locator("#full").getAttribute("aria-valuenow"), "10");
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
    assert.equal(await page.locator("#steps").getAttribute("aria-valuetext"), "Shipped, step 4 of 6");
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
    const path = await bundle("html-meter", `import "@threadlabs/looma";`);
    const attributes = (props: Record<string, unknown>) =>
      Object.entries(props).map(([name, value]) => `${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}="${value}"`).join(" ");
    const page = await open(path, hook + meters.map(([id, props]) => `<ui-meter id="${id}" ${attributes(props)}></ui-meter>`).join(""), css);
    await checkMeters(page);
    await page.close();
  });

  it("fills its track, names its value, keeps its tones legible, and follows its value, in Vue", async () => {
    const path = await bundle("vue-meter", `
      import { createApp, h, ref } from "vue";
      import { Meter } from "@threadlabs/looma/vue";
      const value = ref(750);
      window.meterValue = value;
      const meters = ${JSON.stringify(meters)};
      createApp({ render: () => meters.map(([id, props]) => h(Meter, { id, ...props, ...(id === "partial" ? { value: value.value } : {}) })) }).mount("#app");
    `);
    const page = await open(path, `${hook}<div id="app"></div>`, [...css, join(root, "vue/components.css")]);
    await checkMeters(page);
    await page.evaluate(() => { (window as unknown as { meterValue: { value: number } }).meterValue.value = 1240; });
    await page.waitForFunction(() => document.querySelector("#partial")?.getAttribute("aria-valuenow") === "1240");
    const fill = await page.locator("#partial").evaluate((element) => element.querySelector(".fill")!.getBoundingClientRect().width / element.getBoundingClientRect().width);
    assert.equal(fill, 1);
    await page.close();
  });
});

describe("Input with numbers", () => {
  // A number field's model is a number. v-model reads the field as a number, so text the user is
  // still typing that means the model's number (12., 1.0, 1e3, empty) is never written over. Chromium
  // reports "12." as "12", so the check is that nothing writes the field's value while it has focus.
  const spyOnWrites = `
    window.writes = [];
    const value = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    Object.defineProperty(HTMLInputElement.prototype, "value", {
      ...value,
      set(text) {
        if (document.activeElement === this) window.writes.push(text);
        value.set.call(this, text);
      },
    });
  `;
  const numberField = (name: string, binding: string) => bundle(name, `
    import { createApp, h, ref } from "vue";
    import { Input } from "@threadlabs/looma/vue";
    ${spyOnWrites}
    const amount = ref(12);
    const updates = [];
    window.updates = updates;
    const record = (value) => { updates.push(value); amount.value = value; };
    createApp({
      render: () => h(Input, { id: "amount", type: "number", "aria-label": "Amount", ${binding} }),
    }).mount("#app");
  `);
  const read = (page: Page) => page.evaluate(() => {
    const { updates, writes } = window as unknown as { updates: unknown[]; writes: string[] };
    return { updates: [...updates], writes: [...writes] };
  });

  const typing = async (page: Page) => {
    const input = page.locator("#amount");
    assert.equal(await input.inputValue(), "12");
    await input.click();
    await input.press("ControlOrMeta+a");
    await input.press("Backspace");
    // 12.5, then Backspace leaves "12.", and 8 makes 12.8, not 128 or 812.
    await input.pressSequentially("12.5");
    await input.press("Backspace");
    await input.pressSequentially("8");
    assert.equal(await input.inputValue(), "12.8");
    for (const text of ["1.0", "1e3", "0.50"]) {
      await input.press("ControlOrMeta+a");
      await input.press("Backspace");
      await input.pressSequentially(text);
      assert.equal(await input.inputValue(), text);
    }
    // 1e3 less its 3 is not yet a number, so the field reads as empty; its 1 is 1 again.
    await input.press("ControlOrMeta+a");
    await input.pressSequentially("1e3");
    await input.press("Backspace");
    await input.press("Backspace");
    assert.equal(await input.inputValue(), "1");
    await input.press("Backspace");
    assert.equal(await input.inputValue(), "");
    return read(page);
  };

  it("reports numbers through v-model and never rewrites the text being typed", async () => {
    const path = await numberField("vue-input-number-model", `modelValue: amount.value, "onUpdate:modelValue": record`);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const { updates, writes } = await typing(page);
    assert.deepEqual(writes, []);
    // The declared numeric value is null while the field holds no number.
    assert.ok(updates.every((value) => typeof value === "number" || value === null), JSON.stringify(updates));
    for (const value of [12.5, 12.8, 1, 1000, 0.5]) assert.ok(updates.includes(value), `reports ${value}`);
    assert.equal(updates.at(-1), null);
    await page.close();
  });

  it("takes a number value and follows input events without rewriting the text being typed", async () => {
    const path = await numberField("vue-input-number-value", `value: amount.value, onInput: (event) => record(event.target.value === "" ? null : Number(event.target.value))`);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const { writes } = await typing(page);
    assert.deepEqual(writes, []);
    await page.close();
  });
});

describe("App styling hooks", () => {
  // An app styles a component from a plain class of its own, through the component's hooks: no
  // selector of Looma's markup and no specificity to win. Each check runs on both targets.
  const appCss = `
    :root { --ui-motion-fast: 0s; }
    .frame { inline-size: 400px; }
    .narrow-input { --ui-input-inline-size: 150px; }
    .narrow-select {
      --ui-select-inline-size: 160px;
      --ui-select-surface: rgb(1, 2, 3);
      --ui-select-border: rgb(4, 5, 6);
      --ui-select-focus-border: rgb(7, 8, 9);
    }
    .narrow-nav { --ui-nav-item-inline-size: 170px; }
    .wide-field {
      --ui-form-field-min-inline-size: 300px;
      --ui-form-field-label-text: rgb(10, 20, 30);
      --ui-form-field-label-font-size: 18px;
      --ui-form-field-help-text: rgb(40, 50, 60);
      --ui-form-field-help-font-size: 11px;
    }
    .one-line { --ui-button-white-space: nowrap; }
    .tight { inline-size: 60px; }
  `;
  const label = "Save all the changes";

  async function check(page: Page) {
    await page.addStyleTag({ content: appCss });
    await page.locator("#heading-sized").waitFor();
    const style = (selector: string, property: string) =>
      page.locator(selector).evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property);
    const width = async (selector: string) => Math.round((await page.locator(selector).boundingBox())!.width);

    // Widths: the hook sizes the component; unset, it fills its container as before.
    assert.equal(await width("#input"), 150);
    assert.equal(await width("#input-default"), 400);
    assert.equal(await width("#select"), 160);
    assert.equal(await width("#select-default"), 400);
    assert.equal(await width("#nav"), 170);
    assert.equal(await width("#nav-default"), 400);
    assert.equal(await width("#field"), 300, "a field keeps its minimum in a narrower track");

    // Select takes Input's surface and border hooks.
    assert.equal(await style("#select", "background-color"), "rgb(1, 2, 3)");
    assert.equal(await style("#select", "border-top-color"), "rgb(4, 5, 6)");
    await page.locator("#select").focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    assert.equal(await style("#select", "border-top-color"), "rgb(7, 8, 9)");

    // Form Field's label and help text.
    assert.equal(await style("#field-label", "color"), "rgb(10, 20, 30)");
    assert.equal(await style("#field-label", "font-size"), "18px");
    assert.equal(await style("#field-help", "color"), "rgb(40, 50, 60)");
    assert.equal(await style("#field-help", "font-size"), "11px");

    // A label kept on one line; unset, a button still wraps as its container does.
    assert.equal(await style("#one-line", "white-space"), "nowrap");
    assert.equal(await style("#wraps", "white-space"), "normal");
    const height = async (selector: string) => (await page.locator(selector).boundingBox())!.height;
    assert.ok(await height("#wraps") > await height("#one-line"), "the unset label wraps in a narrow row");

    // A heading level on Text: its size and weight come from its options, not the browser's.
    assert.equal(await page.locator("#heading").evaluate((element) => element.tagName), "H3");
    assert.equal(await style("#heading", "font-size"), await style(".frame", "font-size"));
    assert.equal(await style("#heading", "font-weight"), await style(".frame", "font-weight"));
    assert.equal(await page.locator("#heading-sized").evaluate((element) => element.tagName), "H2");
    assert.equal(await style("#heading-sized", "font-size"), await page.evaluate(() => {
      const probe = document.body.appendChild(document.createElement("i"));
      probe.style.fontSize = "var(--ui-font-size-lg)";
      const size = getComputedStyle(probe).fontSize;
      probe.remove();
      return size;
    }));
    assert.equal(await style("#heading-sized", "font-weight"), "600");
  }

  it("apply from an app class in HTML", async () => {
    const path = await bundle("html-app-hooks", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <div class="frame">
        <ui-input id="input" class="narrow-input" aria-label="Amount"></ui-input>
        <ui-input id="input-default" aria-label="Note"></ui-input>
        <ui-select id="select" class="narrow-select" aria-label="Status"><option>Open</option></ui-select>
        <ui-select id="select-default" aria-label="Owner"><option>Ada</option></ui-select>
        <ui-nav-item id="nav" class="narrow-nav">Shipments</ui-nav-item>
        <ui-nav-item id="nav-default">Orders</ui-nav-item>
        <div class="tight"><ui-form-field id="field" class="wide-field">
          <label slot="label" id="field-label" for="name">Name</label>
          <ui-input id="name"></ui-input>
          <p slot="help" id="field-help">As it appears on the invoice.</p>
        </ui-form-field></div>
        <div class="tight"><ui-button id="one-line" class="one-line">${label}</ui-button></div>
        <div class="tight"><ui-button id="wraps">${label}</ui-button></div>
        <ui-text id="heading" as="h3">Billing</ui-text>
        <ui-text id="heading-sized" as="h2" size="lg" weight="semibold">Billing</ui-text>
      </div>`, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });

  it("apply from an app class in Vue", async () => {
    const path = await bundle("vue-app-hooks", `
      import { createApp, h } from "vue";
      import { Button, FormField, Input, NavItem, Select, Text } from "@threadlabs/looma/vue";
      createApp({
        render: () => h("div", { class: "frame" }, [
          h(Input, { id: "input", class: "narrow-input", "aria-label": "Amount" }),
          h(Input, { id: "input-default", "aria-label": "Note" }),
          h(Select, { id: "select", class: "narrow-select", "aria-label": "Status" }, () => [h("option", "Open")]),
          h(Select, { id: "select-default", "aria-label": "Owner" }, () => [h("option", "Ada")]),
          h(NavItem, { id: "nav", class: "narrow-nav" }, () => "Shipments"),
          h(NavItem, { id: "nav-default" }, () => "Orders"),
          h("div", { class: "tight" }, [h(FormField, { id: "field", class: "wide-field" }, {
            label: () => h("label", { id: "field-label", for: "name" }, "Name"),
            default: () => h(Input, { id: "name" }),
            help: () => h("p", { id: "field-help" }, "As it appears on the invoice."),
          })]),
          h("div", { class: "tight" }, [h(Button, { id: "one-line", class: "one-line" }, () => "${label}")]),
          h("div", { class: "tight" }, [h(Button, { id: "wraps" }, () => "${label}")]),
          h(Text, { id: "heading", as: "h3" }, () => "Billing"),
          h(Text, { id: "heading-sized", as: "h2", size: "lg", weight: "semibold" }, () => "Billing"),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await check(page);
    await page.close();
  });
});

describe("Combobox completion", () => {
  const check = async (page: Page) => {
    const input = page.locator('#choices input[role="combobox"]');
    await input.fill("Des");
    await page.waitForFunction(() => Boolean(document.querySelector('#choices input')?.getAttribute('aria-activedescendant')));
    assert.equal(await page.locator('#choices [role="option"].active').textContent(), "Design");
    await input.press("Tab");
    assert.equal(await page.locator('#choices .item').count(), 1);
    assert.equal(await input.inputValue(), "");
    assert.equal(await page.locator('#after').evaluate(element => element === document.activeElement), true);
    await input.fill("Des");
    await input.press("Tab");
    assert.equal(await page.locator('#choices .item').count(), 1, "completion never toggles off a selected item");
    await input.fill("Pla");
    await input.press("Shift+Tab");
    assert.equal(await page.locator('#choices .item').count(), 1, "reverse focus does not commit");
    await input.fill("D");
    assert.equal(await input.getAttribute("aria-activedescendant"), null, "ambiguous results stay unhighlighted");
    await input.press("Tab");
    assert.equal(await page.locator('#choices .item').count(), 1);
  };
  it("keeps default multiple completion manual and excludes disabled suggestions", async () => {
    const path = await bundle("html-combobox-completion-default", `import "@threadlabs/looma";`);
    const page = await open(path, `<ui-combobox id="manual" label="Manual" multiple><option value="design">Design</option></ui-combobox><ui-combobox id="disabled" label="Disabled" multiple auto-highlight="single" select-on-tab><option value="design" disabled>Design</option></ui-combobox><button>After</button>`, [join(root, "tokens.css")]);
    try {
      for (const id of ["manual", "disabled"]) {
        const input = page.locator(`#${id} input[role="combobox"]`);
        await input.fill("Des");
        assert.equal(await input.getAttribute("aria-activedescendant"), null);
        await input.press("Tab");
        assert.equal(await page.locator(`#${id} .item`).count(), 0);
      }
    } finally { await page.close(); }
  });
  it("highlights a sole authored result and commits Tab in HTML", async () => {
    const path = await bundle("html-combobox-completion", `import "@threadlabs/looma";`);
    const page = await open(path, `<button id="before">Before</button><ui-combobox id="choices" label="Teams" multiple auto-highlight="single" select-on-tab><option value="design">Design</option><option value="docs">Docs</option><option value="platform">Platform</option></ui-combobox><button id="after">After</button>`, [join(root, "tokens.css")]);
    try { await check(page); } finally { await page.close(); }
  });
  it("highlights a sole authored result and commits Tab in controlled Vue", async () => {
    const path = await bundle("vue-combobox-completion", `
      import { createApp, h, ref } from "vue";
      import { Combobox } from "@threadlabs/looma/vue";
      const selected = ref([]);
      createApp({ render: () => h("div", [h("button", { id: "before" }, "Before"), h(Combobox, { id: "choices", label: "Teams", multiple: true, autoHighlight: "single", selectOnTab: true, selectedValues: selected.value, "onUpdate:selectedValues": values => selected.value = values }, () => [["design", "Design"], ["docs", "Docs"], ["platform", "Platform"]].map(([value,label]) => h("option", {value}, label))), h("button", {id:"after"}, "After")]) }).mount("#app");`);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    try { await check(page); } finally { await page.close(); }
  });
});


describe("Combobox chip truncation", () => {
  const label = "workspace:averylongidentifierthatmuststayinsideitsbadge";
  const checkTextRoom = async (page: Page) => {
    const bounds = await page.locator(".item .label").evaluateAll((labels) => labels.map((label) => {
      const box = label.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(label);
      const text = range.getBoundingClientRect();
      return { label: label.textContent, top: box.top, bottom: box.bottom, textTop: text.top, textBottom: text.bottom };
    }));
    assert.ok(bounds.length > 0);
    for (const box of bounds) {
      assert.ok(box.textBottom <= box.bottom + 1, `${box.label}: the label does not crop descenders`);
      assert.ok(box.textTop >= box.top - 1, `${box.label}: the label leaves room above its text`);
    }
  };
  const check = async (page: Page) => {
    for (const width of [1280, 375]) {
      await page.setViewportSize({ width, height: 812 });
      const chip = page.getByRole("button", { name: `${label}, press Delete or Backspace to remove` });
      await chip.waitFor();
      const geometry = await chip.evaluate((item) => {
        const badge = item.querySelector<HTMLElement>('[data-component~="ui-badge"]')!;
        const label = badge.querySelector<HTMLElement>(".label")!;
        const box = item.getBoundingClientRect();
        const badgeBox = badge.getBoundingClientRect();
        const labelBox = label.getBoundingClientRect();
        return { itemWidth: box.width, badgeWidth: badgeBox.width, labelInside: labelBox.right <= badgeBox.right && labelBox.left >= badgeBox.left, clipped: label.scrollWidth > label.clientWidth, overflow: getComputedStyle(label).overflow, ellipsis: getComputedStyle(label).textOverflow, text: label.textContent };
      });
      assert.ok(geometry.badgeWidth <= geometry.itemWidth + 1, "badge stays within the capped chip");
      assert.ok(geometry.labelInside, "label stays inside the badge");
      assert.ok(geometry.clipped, "long label is constrained");
      assert.equal(geometry.overflow, "hidden");
      assert.equal(geometry.ellipsis, "ellipsis");
      assert.equal(geometry.text, label, "full label remains available to assistive technology");
      await checkTextRoom(page);
      await page.screenshot({ path: join(root, ".build", `chip-ellipsis-${width}.png`) });
    }
    await page.getByRole("combobox", { name: "Filter" }).focus();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Backspace");
    assert.equal(await page.locator(".item").count(), 0, "truncation preserves keyboard removal");
  };
  it("ellipsizes native chip labels inside their badge at desktop and 375px", async () => {
    const path = await bundle("html-chip-truncation", `import "@threadlabs/looma";`);
    const page = await open(path, `<ui-combobox label="Filter" multiple items='[{"id":"long","value":"long","label":"${label}"}]'><option value="long">${label}</option></ui-combobox>`, [join(root, "tokens.css")]);
    try { await check(page); } finally { await page.close(); }
  });
  it("ellipsizes Vue chip labels inside their badge at desktop and 375px", async () => {
    const path = await bundle("vue-chip-truncation", `import { createApp, h } from "vue"; import { Combobox } from "@threadlabs/looma/vue"; createApp({ render: () => h(Combobox, { label: "Filter", multiple: true, items: [{id: "long", value: "long", label: ${JSON.stringify(label)}}] }, () => h("option", {value: "long"}, ${JSON.stringify(label)})) }).mount("#app");`);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    try { await check(page); } finally { await page.close(); }
  });
  for (const adapter of ["native", "Vue"]) {
    it(`keeps short ${adapter} chip text and descenders visible at desktop and 375px`, async () => {
      const items = [{ id: "date", value: "date", label: "date:today" }, { id: "entry", value: "entry", label: "entry:review" }];
      const options = items.map((item) => `<option value="${item.value}">${item.label}</option>`).join("");
      const source = adapter === "native" ? `import "@threadlabs/looma";`
        : `import { createApp, h } from "vue"; import { Combobox } from "@threadlabs/looma/vue"; createApp({ render: () => h(Combobox, { label: "Filter", multiple: true, items: ${JSON.stringify(items)} }, () => ${JSON.stringify(items)}.map(item => h("option", {value: item.value}, item.label))) }).mount("#app");`;
      const path = await bundle(`${adapter}-chip-descenders`, source);
      const page = await open(path, adapter === "native" ? `<ui-combobox label="Filter" multiple items='${JSON.stringify(items)}'>${options}</ui-combobox>` : `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
      try {
        for (const width of [1280, 375]) {
          await page.setViewportSize({ width, height: 812 });
          await page.locator(".item .label").first().waitFor();
          await checkTextRoom(page);
          await page.screenshot({ path: join(root, ".build", `chip-descenders-${adapter}-${width}.png`) });
        }
      } finally { await page.close(); }
    });
  }
});

describe("CardButton layout", () => {
  for (const adapter of ["native", "Vue"]) {
    it(`keeps ${adapter} icon/content top-aligned and action centered with equal edges at 375px and RTL`, async () => {
      const label = "Read the latest project notes and decisions, including the changes that need another look.";
      const source = adapter === "native" ? `import "@threadlabs/looma";`
        : `import {createApp,h} from "vue"; import {Button,Icon} from "@threadlabs/looma/vue"; createApp({render:()=>h(Button,{variant:"card",tone:"accent",id:"card"},{default:()=>${JSON.stringify(label)},icon:()=>h(Icon,{name:"book-user","aria-hidden":"true"})})}).mount("#app");`;
      const path = await bundle(`card-button-${adapter}`, source);
      const page = await open(path, adapter === "native" ? `<ui-button id="card" variant="card" tone="accent"><ui-icon slot="icon" name="book-user" aria-hidden="true"></ui-icon>${label}</ui-button>` : `<div id="app"></div>`, [join(root,"tokens.css"),join(root,"vue/components.css")]);
      try {
        for (const width of [1280,375]) for (const dir of ["ltr","rtl"]) {
          await page.setViewportSize({width,height:812});
          await page.locator("html").evaluate((el,dir)=>el.setAttribute("dir",dir),dir);
          const geometry = await page.locator("#card").evaluate(el => {
            const style=getComputedStyle(el), box=el.getBoundingClientRect();
            const icon=el.querySelector(".card-icon")!.getBoundingClientRect(), content=el.querySelector(".card-content")!.getBoundingClientRect(), action=el.querySelector(".card-action")!.getBoundingClientRect();
            return {contentHeight:content.height,lineHeight:parseFloat(style.lineHeight),contentMiddle:(content.top+content.bottom)/2,iconHeight:icon.height,height:box.height,overflow:document.documentElement.scrollWidth>innerWidth,iconTop:icon.top,contentTop:content.top,actionMiddle:(action.top+action.bottom)/2,middle:(box.top+box.bottom)/2,paddingStart:style.paddingInlineStart,paddingEnd:style.paddingInlineEnd,borders:[style.borderTopWidth,style.borderRightWidth,style.borderBottomWidth,style.borderLeftWidth],colors:[style.borderTopColor,style.borderRightColor,style.borderBottomColor,style.borderLeftColor],gap:style.columnGap};
          });
          assert.ok(geometry.height>=44); assert.ok(geometry.iconHeight>0); assert.equal(geometry.overflow,false);
          assert.ok(Math.abs(geometry.iconTop-geometry.contentTop)<=1);
          assert.ok(Math.abs(geometry.actionMiddle-geometry.middle)<=1);
          if (geometry.contentHeight <= geometry.lineHeight + 1) {
            assert.ok(Math.abs(geometry.contentMiddle-geometry.middle)<=1, "a single-line label is vertically centered within the card");
          }
          assert.equal(geometry.paddingStart,geometry.paddingEnd);
          assert.equal(new Set(geometry.borders).size,1); assert.equal(new Set(geometry.colors).size,1);
          assert.notEqual(geometry.gap,"normal");
        }
        await page.locator("#card").evaluate(el=>{ (window as unknown as {cardClicks:number}).cardClicks=0; el.addEventListener("click",()=>{(window as unknown as {cardClicks:number}).cardClicks++}); });
        await page.locator("#card").focus();
        await page.keyboard.press("Enter");
        assert.equal(await page.locator("#card").evaluate(el=>el===document.activeElement),true);
        assert.equal(await page.evaluate(()=>(window as unknown as {cardClicks:number}).cardClicks),1);
        await page.locator("html").evaluate(el=>el.setAttribute("dir","ltr"));
        await page.screenshot({path:join(root,".build",`card-button-${adapter}-375.png`)});
        await page.locator("#card .card-icon").evaluate(el=>el.replaceChildren());
        assert.equal(await page.locator("#card .card-icon").evaluate(el=>getComputedStyle(el).display),"none");


      } finally {await page.close();}
    });
  }
});

describe("Image surface", () => {
  const source = "https://example.test/primitive-image.svg";
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="80"><rect width="160" height="80" fill="#569d86"/></svg>';
  for (const adapter of ["HTML", "Vue"]) {
    it(`owns corner resize, cancellation, and bounds in ${adapter}`, async () => {
      const path = await bundle(`image-surface-${adapter}`, adapter === "HTML" ? `import "@threadlabs/looma";` : `
        import { createApp, h } from "vue";
        import { Image } from "@threadlabs/looma/vue";
        createApp({ render: () => h(Image, { id: "image", src: ${JSON.stringify(source)}, alt: "Landscape", width: 160, height: 80, selected: true, resizable: true }) }).mount("#mount");
      `);
      const page = await open(path, `<div style="width: 260px; padding: 20px; box-sizing: border-box">${adapter === "HTML" ? `<ui-image id="image" src="${source}" alt="Landscape" width="160" height="80" selected resizable></ui-image>` : '<div id="mount"></div>'}</div>`, [join(root, "tokens.css"), ...(adapter === "Vue" ? [join(root, "vue/components.css")] : [])], {}, async page => {
        await page.route(source, route => route.fulfill({ contentType: "image/svg+xml", body: svg }));
      });
      await page.locator("#image img").evaluate(async element => { await (element as HTMLImageElement).decode(); });
      await page.evaluate(() => {
        (window as unknown as { resizeEvents: unknown[] }).resizeEvents = [];
        document.querySelector("#image")!.addEventListener("resize", event => {
          (window as unknown as { resizeEvents: unknown[] }).resizeEvents.push((event as CustomEvent).detail);
        });
      });
      for (const corner of ["top-left", "top-right", "bottom-left", "bottom-right"]) {
        const handle = page.locator(`#image [data-corner="${corner}"]`);
        const box = (await handle.boundingBox())!;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + (corner.endsWith("left") ? -40 : 40), box.y + box.height / 2 + (corner.startsWith("top") ? -20 : 20));
        assert.ok(Math.abs((await page.locator("#image img").boundingBox())!.width - 200) < 1);
        await page.mouse.up();
        const event = await page.evaluate(() => (window as unknown as { resizeEvents: { width: number; height: number; phase: string; trigger: string }[] }).resizeEvents.at(-1));
        assert.deepEqual(event, { width: 200, height: 100, phase: "commit", trigger: "pointer" });
      }
      const handle = page.locator('#image [data-corner="bottom-right"]');
      const box = (await handle.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 600, box.y + box.height / 2 + 300);
      assert.ok((await page.locator("#image img").boundingBox())!.width <= 220);
      await handle.dispatchEvent("pointercancel", { pointerId: 1 });
      await page.mouse.up();
      assert.ok(Math.abs((await page.locator("#image img").boundingBox())!.width - 160) < 1);
      const cancelled = await page.evaluate(() => (window as unknown as { resizeEvents: { phase: string }[] }).resizeEvents.at(-1)?.phase);
      assert.equal(cancelled, "cancel");
      await page.close();
    });
  }
  for (const adapter of ["HTML", "Vue"]) {
    it(`fits narrow grid tracks without horizontal scrolling in ${adapter}`, async () => {
      const path = await bundle(`image-grid-${adapter}`, adapter === "HTML" ? `import "@threadlabs/looma";` : `
        import { createApp, h } from "vue";
        import { Image } from "@threadlabs/looma/vue";
        createApp({ render: () => h(Image, { src: ${JSON.stringify(source)}, alt: "Landscape", width: 480, height: 240 }) }).mount("#grid");
      `);
      const page = await open(path, `<div id="grid" style="display: grid; place-items: center; width: 260px; padding: 20px; box-sizing: border-box">${adapter === "HTML" ? `<ui-image src="${source}" alt="Landscape" width="480" height="240"></ui-image>` : '<div id="mount"></div>'}</div>`, [join(root, "tokens.css"), ...(adapter === "Vue" ? [join(root, "vue/components.css")] : [])], {}, async page => {
        await page.route(source, route => route.fulfill({ contentType: "image/svg+xml", body: svg }));
      });
      await page.locator("#grid img").evaluate(async element => { await (element as HTMLImageElement).decode(); });
      assert.ok((await page.locator("#grid img").boundingBox())!.width <= 220);
      assert.ok(await page.locator("#grid").evaluate(el => el.scrollWidth <= el.clientWidth));
      await page.close();
    });
  }
  it("renders semantic media on the server before controllers run", async () => {
    const { createSSRApp, h } = await import("vue");
    const { renderToString } = await import("vue/server-renderer");
    const { Image } = await import("@threadlabs/looma/vue");
    const html = await renderToString(createSSRApp({ render: () => h(Image, { src: source, alt: "Landscape", width: 160, height: 80 }) }));
    assert.match(html, /^<figure data-component="ui-image"/);
    assert.match(html, /<img[^>]*alt="Landscape"[^>]*width="160"[^>]*height="80"/);
    assert.match(html, /class="handles" hidden/);
  });
});

describe("Input with files", () => {
  for (const mode of ["HTML", "Vue"] as const) {
    it(`keeps ${mode} file selection and its native change event through prop updates`, async () => {
      const path = await bundle(`file-input-${mode.toLowerCase()}`, mode === "HTML" ? `import "@threadlabs/looma";` : `
        import { createApp, h, ref } from "vue";
        import { Input } from "@threadlabs/looma/vue";
        const disabled = ref(false);
        window.setFileDisabled = (value) => { disabled.value = value; };
        createApp({ render: () => h(Input, { id: "upload", type: "file", name: "upload", disabled: disabled.value }) }).mount("#app");
      `);
      const page = await open(path, mode === "HTML"
        ? '<form><ui-input id="upload" type="file" name="upload"></ui-input></form>'
        : '<form><div id="app"></div></form>', []);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        await page.evaluate(() => {
          const input = document.querySelector<HTMLInputElement>("input[type=file]")!;
          input.addEventListener("change", (event) => {
            (window as unknown as { selectedFile: string }).selectedFile = (event.target as HTMLInputElement).files?.[0]?.name ?? "";
          });
        });
        const input = page.locator("input[type=file]");
        await input.setInputFiles({ name: "records.csv", mimeType: "text/csv", buffer: Buffer.from("name\nAda\n") });
        assert.equal(await page.evaluate(() => (window as unknown as { selectedFile: string }).selectedFile), "records.csv");
        for (const disabled of [true, false]) {
          await page.evaluate(({ mode, disabled }) => {
            if (mode === "HTML") document.querySelector("#upload")!.toggleAttribute("disabled", disabled);
            else (window as unknown as { setFileDisabled(value: boolean): void }).setFileDisabled(disabled);
          }, { mode, disabled });
          await page.waitForFunction((disabled) => document.querySelector<HTMLInputElement>("input[type=file]")!.disabled === disabled, disabled);
          assert.equal(await input.evaluate((element) => (element as HTMLInputElement).files?.[0]?.name), "records.csv");
        }
        assert.equal(await page.evaluate(() => (new FormData(document.querySelector("form")!).get("upload") as File).name), "records.csv");
        await input.evaluate((element) => { (element as HTMLInputElement).value = ""; });
        assert.equal(await input.evaluate((element) => (element as HTMLInputElement).files?.length), 0);
        assert.deepEqual(errors, []);
      } finally { await page.close(); }
    });
  }
});

it("preserves the native first option when Select has no controlled value", async () => {
  const htmlPath = await bundle("html-select-uncontrolled", 'import "@threadlabs/looma";');
  const vuePath = await bundle("vue-select-uncontrolled", `import { createApp, h } from "vue"; import { Select } from "@threadlabs/looma/vue"; createApp({ render: () => h(Select, { value: null }, () => [h('option', { value: 'a' }, 'A'), h('option', { value: 'b' }, 'B')]) }).mount('#app');`);
  const html = await open(htmlPath, '<ui-select><option value="a">A</option><option value="b">B</option></ui-select>', []);
  const vue = await open(vuePath, '<div id="app"></div>', []);
  try {
    const native = await html.locator('select').inputValue();
    const converted = await vue.locator('select').inputValue();
    assert.equal(native, "a");
    assert.equal(converted, native);
  } finally { await html.close(); await vue.close(); }
});


describe("Prop-driven reading surfaces", () => {
  it("keeps soft tones distinct in HTML and Vue without recoloring child actions", async () => {
    for (const framework of ["html", "vue"]) {
      const path = await bundle(`soft-card-${framework}`, framework === "html" ? `import "@threadlabs/looma";` : `
        import { createApp, h } from "vue";
        import { Card, Button, Stack } from "@threadlabs/looma/vue";
        createApp({ render: () => h(Stack, {}, () => ["neutral", "accent", "info", "success", "warning"].map(tone => h(Card, { id: tone, variant: "subtle", tone }, () => h(Button, { tone: "neutral" }, () => "Inspect")))) }).mount("#app");
      `);
      const page = await open(path, framework === "html" ? ["neutral", "accent", "info", "success", "warning"].map(tone => `<ui-card id="${tone}" variant="subtle" tone="${tone}"><ui-button tone="neutral">Inspect</ui-button></ui-card>`).join("") : `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")], { viewport: { width: 375, height: 812 } });
      const colors = await page.evaluate(() => ["neutral", "accent", "info", "success", "warning"].map(id => {
        const card = document.getElementById(id)!;
        const button = card.querySelector("button, ui-button")!;
        return { surface: getComputedStyle(card).backgroundColor, button: getComputedStyle(button).backgroundColor, border: getComputedStyle(card).borderTopColor };
      }));
      assert.equal(new Set(colors.map(color => color.surface)).size, 5);
      assert.equal(new Set(colors.map(color => color.button)).size, 1);
      assert.ok(colors.every(color => color.border === "rgba(0, 0, 0, 0)"));
      await page.close();
    }
  });
  it("bounds a scrolling stack and protects its footer in HTML and Vue", async () => {
    for (const framework of ["html", "vue"]) {
      const path = await bundle(`bounded-stack-${framework}`, framework === "html" ? `import "@threadlabs/looma";` : `
        import { createApp, h } from "vue";
        import { Stack, ScrollArea, Cluster, Text, Button } from "@threadlabs/looma/vue";
        createApp({ render: () => h(Stack, { id:"frame", height: 500 }, () => [
          h(Text, {}, () => "Files"),
          h(ScrollArea, { id:"scroll", fill:true }, () => h(Stack, {}, () => Array.from({length:40}, (_, i) => h(Text, {}, () => "Line " + i)))),
          h(Cluster, { id:"footer", fixed:true, padding:"m", paddingEnd:"xl" }, () => [h(Text, {grow:true, truncate:true}, () => "A long selected document path"), h(Button, {}, () => "Save")])
        ]) }).mount("#app");
      `);
      const page = await open(path, framework === "html" ? `<ui-stack id="frame" height="500"><ui-text>Files</ui-text><ui-scroll-area id="scroll" fill><ui-stack>${Array.from({length:40}, (_, i) => `<ui-text>Line ${i}</ui-text>`).join("")}</ui-stack></ui-scroll-area><ui-cluster id="footer" fixed padding="m" padding-end="xl"><ui-text grow truncate>A long selected document path</ui-text><ui-button>Save</ui-button></ui-cluster></ui-stack>` : `<div id="app"></div>`, [join(root,"tokens.css"), join(root,"vue/components.css")], {viewport:{width:375,height:812}});
      const state = await page.evaluate(() => {
        const frame=document.getElementById("frame")!, scroll=document.getElementById("scroll")!, footer=document.getElementById("footer")!;
        return {height:frame.getBoundingClientRect().height, scrollable:scroll.scrollHeight > scroll.clientHeight, footer:footer.getBoundingClientRect().bottom <= frame.getBoundingClientRect().bottom, clearance:parseFloat(getComputedStyle(footer).paddingInlineEnd), grow:getComputedStyle(footer.querySelector("p, ui-text")!).flexGrow};
      });
      assert.equal(state.height,500);
      assert.equal(state.scrollable,true);
      assert.equal(state.footer,true);
      assert.equal(state.clearance,64);
      assert.equal(state.grow,"1");
      await page.close();
    }
  });

  it("caps a growing textarea through maxRows in HTML and Vue", async () => {
    for (const framework of ["html", "vue"]) {
      const path = await bundle(`bounded-field-${framework}`, framework === "html" ? `import "@threadlabs/looma";` : `
        import { createApp, h } from "vue";
        import { Textarea } from "@threadlabs/looma/vue";
        createApp({ render: () => h(Textarea, {rows:3, maxRows:6, autosize:true}) }).mount("#app");
      `);
      const page = await open(path, framework === "html" ? `<ui-textarea rows="3" max-rows="6" autosize></ui-textarea>` : `<div id="app"></div>`, [join(root,"tokens.css"), join(root,"vue/components.css")], {viewport:{width:375,height:812}});
      const field = page.locator("textarea");
      await field.fill(Array.from({length:40}, (_, i) => "Line " + i).join("\n"));
      const state = await field.evaluate(element => ({height:element.getBoundingClientRect().height, scrollable:element.scrollHeight > element.clientHeight, maximum:parseFloat(getComputedStyle(element).maxHeight)}));
      assert.ok(state.height <= state.maximum + 1);
      assert.ok(state.height > 60 && state.height < 250);
      assert.equal(state.scrollable,true);
      await page.close();
    }
  });

  it("fits compact read-only editor excerpts while preserving the default canvas", async () => {
    const path = await bundle("compact-editor-surface", `
      import { createApp, h } from "vue";
      import { LoomaEditor } from "@threadlabs/looma/vue/editor";
      const content = {type:"doc",content:[{type:"paragraph",content:[{type:"text",text:"Rich excerpt",marks:[{type:"bold"}]}]}]};
      createApp({render: () => h("div", {}, [h(LoomaEditor,{modelValue:content,editable:false,label:"Default excerpt"}),h(LoomaEditor,{modelValue:content,editable:false,contentDensity:"compact",label:"Compact excerpt"})])}).mount("#app");
    `);
    for (const width of [375,1280]) {
      const page = await open(path, `<div id="app"></div>`, [join(root,"tokens.css"), join(root,"vue/components.css")], {viewport:{width,height:812}});
      await page.getByRole("textbox", {name:"Compact excerpt",exact:true}).waitFor();
      const state = await page.evaluate(() => ["Default excerpt","Compact excerpt"].map(label => {
        const node=document.querySelector<HTMLElement>(`[aria-label="${label}"]`)!;
        return {height:node.getBoundingClientRect().height,boundaryHeight:node.closest(".looma-editor")!.getBoundingClientRect().height,padding:getComputedStyle(node).padding,bold:node.querySelector("strong")?.textContent};
      }));
      assert.ok(state[0].height >= 300);
      assert.ok(state[1].height > 0 && state[1].height < 60);
      assert.ok(state[1].boundaryHeight < 60);
      assert.equal(state[1].padding,"0px");
      assert.equal(state[1].bold,state[0].bold);
      if (process.env.LOOMA_SCREENSHOT_DIR) await page.screenshot({path:join(process.env.LOOMA_SCREENSHOT_DIR, `editor-excerpts-${width}.png`)});
      await page.close();
    }
  });

});

describe("Independent leading controls and text baselines", () => {
  it("keeps leading checkbox clicks independent, visible row hover and the first text baseline in HTML and Vue", async () => {
    for (const framework of ["html", "vue"]) {
      const path = await bundle(`${framework}-leading-baselines`, framework === "html" ? `import "@threadlabs/looma";` : `
        import { createApp, h } from "vue";
        import { Checkbox, Cluster, List, ListItem, Stack, Text } from "@threadlabs/looma/vue";
        createApp({ render: () => h("div", [
          h(List, () => [
            h(ListItem, { id: "plain", leadingInteractive: true }, { leading: () => h(Checkbox, { id: "include", label: "Include document", size: "sm" }), default: () => h("a", { href: "#document" }, [h("span", { id: "icon" }, "D"), "Document"]) }),
            h(ListItem, { id: "current", current: true }, () => h("a", { href: "#current" }, "Current document")),
          ]),
          h(Cluster, { id: "baseline", align: "baseline", wrap: "nowrap" }, () => [
            h(Text, { id: "number", size: "md", weight: "normal", font: "sans" }, () => "61"),
            h(Stack, () => h("div", { style: "font: 16px/24px var(--ui-font-family-sans, sans-serif); width: 190px" }, [h("p", { id: "prose", style: "margin: 0" }, "Existing text that wraps onto more than one line of prose.")])),
          ]),
        ]) }).mount("#app");
      `);
      const html = framework === "vue" ? '<div id="app"></div>' : `
        <ui-list><ui-list-item id="plain" leading-interactive><ui-checkbox slot="leading" id="include" label="Include document" size="sm"></ui-checkbox><a href="#document"><span id="icon">D</span>Document</a></ui-list-item>
        <ui-list-item id="current" current><a href="#current">Current document</a></ui-list-item></ui-list>
        <ui-cluster id="baseline" align="baseline" wrap="nowrap"><ui-text id="number" size="md" weight="normal" font="sans">61</ui-text><ui-stack><div style="font: 16px/24px var(--ui-font-family-sans, sans-serif); width: 190px"><p id="prose" style="margin: 0">Existing text that wraps onto more than one line of prose.</p></div></ui-stack></ui-cluster>`;
      const page = await open(path, html, [join(root, "tokens.css"), join(root, "vue/components.css")], { viewport: { width: 375, height: 812 } });
      await page.waitForSelector('#plain[data-component~="ui-list-item"]');
      const input = page.getByRole("checkbox", { name: "Include document", exact: true });
      assert.equal(await input.count(), 1, `${framework} names the unlabeled checkbox`);
      await input.check({timeout: 3000});
      assert.equal(await input.isChecked(), true);
      assert.equal(await page.evaluate(() => location.hash), "", "checkbox does not follow the row link");
      const current = await page.locator("#current").evaluate(el => getComputedStyle(el).backgroundColor);
      const row = await page.locator("#plain").boundingBox();
      assert.ok(row);
      await page.mouse.move(row.x + 2, row.y + 2);
      await page.waitForTimeout(200);
      assert.equal(await page.locator("#plain").evaluate(el => getComputedStyle(el).backgroundColor), current, "whole-row hover uses the quiet selection surface");
      await page.locator("#current a").hover();
      await page.waitForTimeout(200);
      assert.equal(await page.locator("#current").evaluate(el => getComputedStyle(el).backgroundColor), current, "hover retains current selection");
      await page.locator("#icon").click();
      assert.equal(await page.evaluate(() => location.hash), "#document", "the ordinary leading icon still follows its row link");
      const glyphs = await page.evaluate(() => ["number", "prose"].map(id => {
        const el = document.getElementById(id)!;
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        while (node && !node.textContent?.trim()) node = walker.nextNode();
        if (!node) throw new Error("Expected a visible text node");
        const range = document.createRange(); range.setStart(node!, 0); range.setEnd(node!, 1);
        return range.getBoundingClientRect().y;
      }));
      assert.ok(Math.abs(glyphs[0]! - glyphs[1]!) < 1, `${framework} aligns first glyphs through a wrapped column: ${glyphs}`);
      await page.close();
    }
  });
});
