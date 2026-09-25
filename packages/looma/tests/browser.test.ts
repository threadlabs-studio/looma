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

async function open(bundlePath: string, body: string, css: readonly string[], options: BrowserContextOptions = {}): Promise<Page> {
  const page = await browser.newPage(options);
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

describe("Badge box", () => {
  const tones = ["neutral", "accent", "info", "success", "warning", "danger"];
  const variants = ["subtle", "solid"];

  // Sizes to its label in a plain block (a table cell), as in a flex row; each variant's edge is its
  // fill in every tone, and forced colors draw that edge in every tone.
  async function checkBadges(page: Page) {
    await page.waitForSelector('#flex [data-component~="ui-badge"]');
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
      return { badge: element.getAttribute("data-ui-badge-state") ?? element.outerHTML, border: style.borderTopColor, surface: style.backgroundColor };
    }));
    const drawn = await edges();
    assert.equal(drawn.length, tones.length * variants.length);
    for (const { badge, border, surface } of drawn) assert.equal(border, surface, `${badge} has an edge of its own`);

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
    <div id="block" style="width: 400px">${badge("", "Open")}</div>
    <div id="flex" style="display: flex; width: 400px">${badge("", "Open")}</div>
    <div id="narrow" style="width: 60px">${badge("", "A label longer than its container")}</div>
    <div id="tones">${variants.flatMap((variant) => tones.map((tone) => badge(`variant="${variant}" tone="${tone}"`, tone))).join("")}</div>`;

  it("sizes to its label and draws the same edge in every tone, in HTML", async () => {
    const path = await bundle("html-badge-box", `import "@threadlabs/looma";`);
    const page = await open(path, body((attributes, label) => `<ui-badge ${attributes}>${label}</ui-badge>`), [join(root, "tokens.css")]);
    await checkBadges(page);
    await page.close();
  });

  it("sizes to its label and draws the same edge in every tone, in Vue", async () => {
    const path = await bundle("vue-badge-box", `
      import { createApp, h } from "vue";
      import { Badge } from "@threadlabs/looma/vue";
      const tones = ${JSON.stringify(tones)}, variants = ${JSON.stringify(variants)};
      createApp({ render: () => [
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
    await page.evaluate(() => (document.querySelector("#fruit") as unknown as { validate(): Promise<unknown> }).validate());
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
  it("takes a press within the control minimum under touch, link-style included", async () => {
    const path = await bundle("html-button-touch", `import "@threadlabs/looma";`);
    const page = await open(path, `<div style="padding: 80px"><ui-button id="see-all" variant="link" size="sm">See all activity</ui-button><ui-button id="boxed" variant="outline" size="sm">Tag</ui-button></div>`, [join(root, "tokens.css")]);
    await page.waitForSelector('#see-all[data-component~="ui-button"]');
    await page.evaluate(() => document.documentElement.setAttribute("data-ui-input-modality", "touch"));
    const reaches = await page.locator("#see-all").evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const x = rect.x + rect.width / 2;
      const y = rect.y + rect.height / 2;
      const lands = (dy: number) => { const hit = document.elementFromPoint(x, y + dy); return Boolean(hit && (hit === element || element.contains(hit))); };
      return { height: rect.height, above: lands(-21), below: lands(21) };
    });
    assert.ok(reaches.height < 44, "the button itself stays small");
    assert.deepEqual({ above: reaches.above, below: reaches.below }, { above: true, below: true });
    // A boxed button gets no hit area, so it cannot reach over a neighbour.
    assert.equal(await page.locator("#boxed").evaluate((element) => getComputedStyle(element, "::after").content), "none");
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
    assert.equal(await page.locator("#loading svg").count() > 0, true);
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

  async function checkNavItem(page: Page) {
    await page.locator("#page").waitFor();
    const box = async (selector: string) => (await page.locator(selector).boundingBox())!;
    const near = (a: number, b: number, what: string) => assert.ok(Math.abs(a - b) <= 1, `${what}: ${a} vs ${b}`);

    // current states aria-current: the page by default, or the kind of place asked for.
    assert.equal(await page.locator("#page").getAttribute("aria-current"), "page");
    assert.equal(await page.locator("#step").getAttribute("aria-current"), "step");
    assert.equal(await page.locator("#other").getAttribute("aria-current"), null);

    // The current item carries a solid bar on its start edge, inset from its top and bottom.
    const checkBar = async (id: string, edge: "start" | "end") => {
      const item = await box(`#${id}`);
      const bar = await box(`#${id} .indicator`);
      near(bar.width, 3, `${id}: the bar is 3px wide`);
      if (edge === "start") near(bar.x, item.x, `${id}: the bar is on the left edge`);
      else near(bar.x + bar.width, item.x + item.width, `${id}: the bar is on the right edge`);
      assert.ok(bar.y > item.y && bar.y + bar.height < item.y + item.height && bar.height > 0, `${id}: the bar is inset vertically`);
    };
    await checkBar("page", "start");
    assert.equal(await page.locator("#other .indicator").isVisible(), false, "an item that is not current has no bar");
    const look = (id: string) => page.locator(id).evaluate((element) => {
      const style = getComputedStyle(element);
      const bar = getComputedStyle(element.querySelector(".indicator")!);
      return { surface: style.backgroundColor, weight: Number(style.fontWeight), bar: bar.borderInlineStartColor, barStyle: bar.borderInlineStartStyle };
    });
    const [current, other] = [await look("#page"), await look("#other")];
    assert.notEqual(current.surface, other.surface, "the current item takes the selected surface");
    assert.ok(current.weight > other.weight, "the current label is stronger");
    assert.equal(current.barStyle, "solid");
    assert.equal(current.bar, await resolveColor(page, "var(--ui-accent)"), "the bar is the accent colour");

    // In a right-to-left page the bar mirrors to the right edge.
    await checkBar("rtl", "end");

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

    // Forced colors drop backgrounds; the bar is a border, so it stays, in the system highlight.
    await page.emulateMedia({ forcedColors: "active" });
    await checkBar("page", "start");
    const forced = await page.locator("#page .indicator").evaluate((element) => getComputedStyle(element).borderInlineStartColor);
    assert.equal(forced, await resolveColor(page, "Highlight"), "the bar takes the system highlight colour");
    await page.emulateMedia({ forcedColors: "none" });
  }

  it("marks the current item with a start-edge bar and works as a link or a button, in HTML", async () => {
    const path = await bundle("html-nav-item", `import "@threadlabs/looma";`);
    const page = await open(path, `
      <script>window.clicks = 0;</script>
      <nav aria-label="Main" style="width: 240px">
        <ui-list>
          <li><ui-nav-item id="page" as="a" href="#shipments" target="_self" rel="bookmark" current><span slot="leading">*</span>Shipments</ui-nav-item></li>
          <li><ui-nav-item id="other" as="a" href="#invoices">Invoices</ui-nav-item></li>
          <li><ui-nav-item id="view" onclick="window.clicks += 1">Overview</ui-nav-item></li>
          <li><ui-nav-item id="step" current="step">Team</ui-nav-item></li>
          <li><ui-nav-item id="long">Customer<span slot="description">${longDescription}</span></ui-nav-item></li>
        </ui-list>
      </nav>
      <nav aria-label="RTL" dir="rtl" style="width: 240px"><ui-nav-item id="rtl" current>Shipments</ui-nav-item></nav>`,
    [join(root, "tokens.css")]);
    await page.waitForSelector('#long[data-component~="ui-nav-item"]');
    await checkNavItem(page);
    await page.close();
  });

  it("marks the current item with a start-edge bar and works as a link or a button, in Vue", async () => {
    const path = await bundle("vue-nav-item", `
      import { createApp, h } from "vue";
      import { List, NavItem } from "@threadlabs/looma/vue";
      window.clicks = 0;
      const item = (props, slots) => h("li", [h(NavItem, props, slots)]);
      createApp({ render: () => [
        h("nav", { "aria-label": "Main", style: "width: 240px" }, [h(List, null, () => [
          item({ id: "page", as: "a", href: "#shipments", target: "_self", rel: "bookmark", current: true }, { leading: () => h("span", "*"), default: () => "Shipments" }),
          item({ id: "other", as: "a", href: "#invoices" }, () => "Invoices"),
          item({ id: "view", onClick: () => { window.clicks += 1; } }, () => "Overview"),
          item({ id: "step", current: "step" }, () => "Team"),
          item({ id: "long" }, { default: () => "Customer", description: () => h("span", ${JSON.stringify(longDescription)}) }),
        ])]),
        h("nav", { "aria-label": "RTL", dir: "rtl", style: "width: 240px" }, [h(NavItem, { id: "rtl", current: true }, () => "Shipments")]),
      ] }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    await checkNavItem(page);
    await page.close();
  });
});

describe("Editor toolbar row", () => {
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
  const texts = ["--ui-text", "--ui-text-primary", "--ui-text-secondary", "--ui-text-muted", "--ui-control-placeholder"];
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
          onCreateItem: ({ query: name }) => {
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
          onCreateItem: ({ query }) => {
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

    // Disabled keeps the shape and a trace of the tone, washes out, and stops looking raised.
    const off = await paint("off");
    const offDanger = await paint("off-danger");
    const offSolid = await paint("off-solid");
    assert.equal(off.opacity, "1", "disabled is a colour decision, not a transparency one");
    assert.equal(off.shadow, "none", "a disabled button does not look raised");
    assert.notEqual(off.border, off.background, "a disabled outline is still an outline");
    assert.equal(offSolid.border, offSolid.background, "a disabled solid is still filled");
    assert.notEqual(offDanger.border, off.border, "a disabled button still says which action it was");
    assert.equal(off.filter, "saturate(0.2) contrast(0.75) brightness(1.25)", "and it is washed out, so it no longer reads as available");
    assert.equal(accent.filter, "none", "an available button is not");

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
          onOptionsChange: (detail) => window.events.push(["options", detail]),
          onValueChange: (detail) => window.events.push(["value", detail]),
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
      const onValueChange = (detail) => window.changes.push(detail);
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
    import { Checkbox, Combobox, Editable, Input, InputGroup, Radio, RadioGroup, Select, Switch, Textarea } from "@threadlabs/looma/vue";
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
    ["title", "Draft"], ["site", "docs"], ["body", "Hello"], ["topic", "help"], ["news", "weekly"], ["size", "m"], ["plan", "pro"],
    ["fruit", ""], ["city", ""], ["country", "no"],
  ];
  const chosen = [
    ["title", "Final"], ["site", "wiki"], ["body", "Hi there"], ["topic", "problem"], ["agree", "yes"], ["alerts", "push"], ["size", "s"],
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

describe("Sidebar", () => {
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
        h(Sidebar, { id: "nav", "aria-label": "Workspace", width: 256, onToggle: (detail) => window.probe.toggles.push(detail) },
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
        onResize: (detail) => window.probe.resizes.push(detail),
      }, () => h("a", { href: "#inbox" }, "Inbox")) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css"), join(root, "vue/components.css")]);
    const errors = watchErrors(page);
    const width = () => page.locator("#nav").evaluate((element) => element.getBoundingClientRect().width);
    assert.equal(await width(), 256);
    await page.evaluate(() => { (window as unknown as { width: { value: number } }).width.value = 300; });
    await page.waitForTimeout(50);
    assert.equal(await width(), 300);
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
    ["nav", { "aria-label": "Hooked", ...hook("--ui-nav-item-indicator-color", mark) }, [["NavItem", { id: "nav-nested", current: true }, ["Home"]]]],
    ["NavItem", { id: "nav-plain", current: true }, ["Home"]],
    ["NavItem", { id: "nav-own", current: true, ...hook("--ui-nav-item-indicator-color", mark) }, ["Home"]],
    // A hook a component reads on an inner part reaches that part from the root, and no further.
    ["Callout", { id: "callout-outer", ...hook("--ui-callout-icon", mark) }, [["Callout", { id: "callout-nested" }, ["Inner"]]]],
    ["Callout", { id: "callout-plain" }, ["Plain"]],
    // Theme tokens still theme a subtree.
    ["div", { style: `--ui-space-5: 40px; --ui-accent: ${mark}` }, [
      ["Stack", { id: "stack-themed", gap: "l" }, [["span", {}, ["a"]], ["span", {}, ["b"]]]],
      ["NavItem", { id: "nav-themed", current: true }, ["Home"]],
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
