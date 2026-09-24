// Drives the built package (run `pnpm build` first) in Chromium, the way consumers use it: a Vue app
// importing @threadlabs/looma/vue, and a plain page registering the components with dist/index.js.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type Page } from "playwright";
import { build } from "vite";
import { afterAll, beforeAll, describe, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let directory = "";
let browser: Browser;

async function bundle(name: string, source: string): Promise<string> {
  const entry = join(directory, `${name}.js`);
  await writeFile(entry, source);
  await build({
    configFile: false,
    logLevel: "silent",
    root: directory,
    resolve: { alias: { "@threadlabs/looma": root } },
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    build: {
      outDir: join(directory, name),
      minify: false,
      lib: { entry, formats: ["iife"], name: name.replace(/\W/g, "_"), fileName: () => "bundle.js" },
    },
  });
  return join(directory, name, "bundle.js");
}

async function open(bundlePath: string, body: string, css: readonly string[]): Promise<Page> {
  const page = await browser.newPage();
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

describe("Vue components", () => {
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
          h(Checkbox, { id: "agree", checked: checked.value, onChange: (detail) => changes.push(detail) }, () => "Agree"),
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
      ["align", "align=center", "size", "size=md", "tone", "tone=accent", "variant", "variant=solid"]
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
});

describe("Icon Button", () => {
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
          onClose: (detail) => { closes.push(detail); open.value = false; },
        }, { search: () => h("input", { id: "query", type: "search", "aria-label": "Search" }) }),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const region = page.locator("#search .search");
    const edge = () => region.evaluate((element) => getComputedStyle(element).borderBottomColor);
    const idle = await edge();
    await page.locator("#query").fill("wel");
    // The edge colour transitions in; wait for it rather than sampling mid-transition.
    await page.waitForFunction((before) => getComputedStyle(document.querySelector("#search .search")!).borderBottomColor !== before, idle, { timeout: 2000 });
    assert.notEqual(await edge(), idle, "the search region shows focus");
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
            onOpen: (detail) => { events.push(["open", detail]); open.value = true; },
            onClose: (detail) => { events.push(["close", detail]); open.value = false; },
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
      createApp({ render: () => h(Dialog, { id: "dialog", open: true, modal: true, dismissible: true, label: "Details" }, () => "Body") }).mount("#app");
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
      createApp({ render: () => h(Dialog, { id: "dialog", open: true, modal: true, dismissible: true, label: "Details" }, () => "Body") }).mount("#app");
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
  it("paints every variant in its tone, and keeps a trace of it when disabled", async () => {
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
        shadow: style.boxShadow
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

    // Disabled keeps the shape and a trace of the tone, and stops looking raised.
    const off = await paint("off");
    const offDanger = await paint("off-danger");
    const offSolid = await paint("off-solid");
    assert.equal(off.opacity, "1", "disabled is a colour decision, not a transparency one");
    assert.equal(off.shadow, "none", "a disabled button does not look raised");
    assert.notEqual(off.border, off.background, "a disabled outline is still an outline");
    assert.equal(offSolid.border, offSolid.background, "a disabled solid is still filled");
    assert.notEqual(offDanger.border, off.border, "a disabled button still says which action it was");
    assert.notEqual(off.border, accent.border, "and it no longer reads as available");

    // A disabled ghost states itself with a surface, but a wash of its tone, as hover is: an opaque
    // mix toward the ink came out a mid-grey slab for neutral, louder than the enabled button.
    const alpha = (color: string) => Number(/\/\s*([\d.]+)\)$/.exec(color)?.[1] ?? 1);
    for (const id of ["off-ghost", "off-ghost-neutral"]) {
      const ghost = await paint(id);
      assert.ok(alpha(ghost.background) > 0, `${id} still has a surface`);
      assert.ok(alpha(ghost.background) < 0.3, `${id} is a wash, not a slab: ${ghost.background}`);
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
            onSelect: (detail) => events.push(["select", detail]) }),
          h(EditorTableToolbar, { id: "toolbar", open: true, cellAlignment: "center",
            actions: ["align-left", "align-center", "add-row-after", "background-yellow", "delete-table"],
            onAction: (detail) => events.push(["action", detail]) }),
          h(EditorInsertTableGrid, { id: "grid", open: true, maxRows: 4, maxCols: 5,
            onInsert: (detail) => events.push(["insert", detail]) }),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);

    const items = page.locator('#slash [role="option"]');
    assert.deepEqual(await items.locator(".title").allTextContents(), ["Table", "Text"]);
    assert.equal(await page.locator("#slash .header-query").textContent(), "ta");
    assert.ok(await items.first().locator("svg rect, svg path").count() > 0, "icons render as SVG shapes");
    assert.equal(await items.first().getAttribute("aria-selected"), "true");
    await items.nth(1).click();

    const toolbar = page.locator("#toolbar");
    assert.equal(await toolbar.locator('[data-action="align-center"]').getAttribute("aria-pressed"), "true");
    assert.equal(await toolbar.locator(".menu").count(), 0);
    await toolbar.locator('[data-action="toggle-overflow"]').click();
    assert.equal(await toolbar.locator(".menu").count(), 1);
    assert.deepEqual(await toolbar.locator('.menu [role="menuitem"]').allTextContents(), ["Delete table"]);
    await toolbar.locator('[data-action="delete-table"]').click();
    assert.equal(await toolbar.locator(".menu").count(), 0);

    const grid = page.locator("#grid");
    assert.equal(await grid.locator(".cell").count(), 20);
    await grid.locator('[data-row="2"][data-col="4"]').click();
    assert.equal(await grid.locator(".cell.selected").count(), 8);
    await grid.locator(".insert").click();

    assert.deepEqual(await page.evaluate(() => (window as unknown as { events: unknown[] }).events), [
      ["select", { index: 1 }],
      ["action", { action: "delete-table" }],
      ["insert", { rows: 2, cols: 4, withHeaderRow: false }],
    ]);
    await page.close();
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

    // Moving along the row re-points the same tooltip without waiting again.
    const italic = page.locator('[data-component~="ui-editor-toolbar"] button').nth(1);
    await italic.hover();
    await page.waitForFunction(() => /Italic/.test(document.querySelector('[data-component~="ui-tooltip"]')?.textContent ?? ""));
    assert.equal(await tip.isVisible(), true);
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
