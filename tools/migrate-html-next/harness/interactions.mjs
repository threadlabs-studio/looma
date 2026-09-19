import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATION = join(HERE, "..");
const GENERATED = join(MIGRATION, "generated", "core");
const CONTROLLERS = join(HERE, "controllers");
const manifest = JSON.parse(await readFile(join(GENERATED, "manifest.json"), "utf8"));
const runtime = await readFile(join(MIGRATION, "vendor", "html-next-runtime.iife.js"), "utf8");
const definitions = (await Promise.all(manifest.components.map(async ({ tag }) =>
  readFile(join(GENERATED, "components", `${tag}.html`), "utf8"))))
  .map((source) => source.replace(/^<link\s+rel="component"[^>]*>\s*$/gm, ""))
  .join("\n");

const mime = { ".js": "text/javascript" };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(request.url.split("?")[0]);
    const requested = resolve(CONTROLLERS, pathname.slice(1));
    if (!requested.startsWith(`${resolve(CONTROLLERS)}${sep}`)) throw new Error("path escape");
    response.writeHead(200, {
      "content-type": mime[extname(requested)] ?? "application/octet-stream",
      "access-control-allow-origin": "*",
    });
    response.end(await readFile(requested));
  } catch {
    response.writeHead(404);
    response.end("not found");
  }
});
await new Promise((resolveServer) => server.listen(0, resolveServer));
const base = `http://localhost:${server.address().port}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") pageErrors.push(message.text());
});

await page.setContent(`<!doctype html><meta charset="utf-8">${definitions}<main id="fixture"></main>`);
await page.addScriptTag({ content: runtime });
const controllerUrls = Object.fromEntries(manifest.components
  .filter(({ controller }) => controller !== null)
  .map(({ tag, controller }) => [tag, `${base}/${controller}`]));
await page.evaluate(async ({ urls, events }) => {
  window.__loomaEvents = [];
  for (const name of events) document.addEventListener(name, (event) => {
    window.__loomaEvents.push({ name, detail: event.detail ?? null });
  });
  const controllers = {};
  for (const [tag, url] of Object.entries(urls)) controllers[tag] = await import(url);
  window.__stopLooma = window.HtmlRuntime.observeDocument(document, {
    onConnect(root, definition) {
      const module = controllers[definition.contract.tag];
      if (!module) return;
      window.HtmlRuntime.setControllerModule(root, Promise.resolve(module));
      return module.default(window.HtmlRuntime.getComponentHost(root));
    },
  });
}, {
  urls: controllerUrls,
  events: [
    "input", "change", "select", "open", "close", "edit-change", "value-change",
    "query-change", "validation-change", "dismiss", "expand", "reorder", "reorder-rejected",
  ],
});

async function mount(markup, props = {}) {
  await page.evaluate(({ source, componentProps }) => {
    window.__loomaEvents.length = 0;
    const fixture = document.querySelector("#fixture");
    fixture.innerHTML = source;
    const invocation = fixture.firstElementChild;
    Object.assign(invocation, componentProps);
  }, { source: markup, componentProps: props });
  await page.waitForTimeout(50);
  if (pageErrors.length) throw new Error(pageErrors.splice(0).join(" | "));
}

async function events(name) {
  return page.evaluate((eventName) => window.__loomaEvents.filter((event) => event.name === eventName), name);
}

async function debugFixture(label) {
  if (process.env.MIGRATION_DEBUG) {
    console.log(label, await page.locator("#fixture").innerHTML(), await page.evaluate(() => window.__loomaEvents));
  }
}

const results = [];
const only = process.argv.slice(2);
async function check(name, run) {
  if (only.length && !only.some((filter) => name.includes(filter))) return;
  try {
    await run();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

await check("checkbox uncontrolled change", async () => {
  await mount(`<ui-checkbox value="terms"><input type="checkbox"> Accept</ui-checkbox>`);
  const root = page.locator('[data-component-root~="ui-checkbox"]');
  await root.locator("input").click();
  assert.equal(await root.getAttribute("aria-checked"), "true");
  assert.deepEqual((await events("change")).findLast(({ detail }) => detail !== null)?.detail, {
    checked: true,
    value: "terms",
    trigger: "programmatic",
  });
});

await check("switch keyboard activation", async () => {
  await mount(`<ui-switch>Power</ui-switch>`);
  const root = page.locator('[data-component-root~="ui-switch"]');
  await root.focus();
  await root.press("Space");
  assert.equal(await root.getAttribute("aria-checked"), "true");
  assert.equal((await events("change")).at(-1)?.detail.trigger, "keyboard");
});

await check("radio group selection and roving state", async () => {
  await mount(`<ui-radio-group value="starter" name="plan">
    <ui-radio value="starter"><input type="radio">Starter</ui-radio>
    <ui-radio value="pro"><input type="radio">Pro</ui-radio>
  </ui-radio-group>`);
  const radios = page.locator('[data-component-root~="ui-radio"]');
  await radios.nth(1).locator("input").click();
  assert.equal(await radios.nth(0).getAttribute("aria-checked"), "false");
  assert.equal(await radios.nth(1).getAttribute("aria-checked"), "true");
  assert.equal((await events("select")).at(-1)?.detail.value, "pro");
});

await check("native input/select/textarea bridges", async () => {
  await mount(`<div>
    <ui-input><input value=""></ui-input>
    <ui-select><select><option value="a">A</option><option value="b">B</option></select></ui-select>
    <ui-textarea rows="3"><textarea></textarea></ui-textarea>
  </div>`);
  await page.locator('[data-component-root~="ui-input"] input').fill("hello");
  await page.locator('[data-component-root~="ui-select"] select').selectOption("b");
  await page.locator('[data-component-root~="ui-textarea"] textarea').fill("notes");
  const inputEvents = await events("input");
  assert.equal(inputEvents.some(({ detail }) => detail?.value === "hello"), true);
  assert.equal(inputEvents.some(({ detail }) => detail?.value === "b"), true);
  assert.equal(inputEvents.some(({ detail }) => detail?.value === "notes"), true);
  assert.equal(await page.locator('[data-component-root~="ui-textarea"] textarea').getAttribute("rows"), "3");
});

await check("disclosure open and close", async () => {
  await mount(`<ui-disclosure><button data-ui-disclosure-trigger>Details</button><section>Body</section></ui-disclosure>`);
  const root = page.locator('[data-component-root~="ui-disclosure"]');
  const button = root.locator("button");
  const content = root.locator("section");
  assert.equal(await content.isHidden(), true);
  await button.click();
  assert.equal(await content.isVisible(), true);
  assert.equal((await events("open")).at(-1)?.detail.open, true);
});

await check("editable activation and escape", async () => {
  await mount(`<ui-editable><button slot="preview" data-ui-editable-trigger>Preview</button><input slot="edit"></ui-editable>`);
  const root = page.locator('[data-component-root~="ui-editable"]');
  await root.locator('[data-ui-editable-trigger]').click();
  await debugFixture("editable after click");
  assert.equal(await root.locator('input[slot="edit"]').isVisible(), true);
  await root.locator('input[slot="edit"]').press("Escape");
  await page.waitForTimeout(20);
  await debugFixture("editable after escape");
  assert.equal(await root.locator('input[slot="edit"]').isHidden(), true);
  assert.deepEqual((await events("edit-change")).map(({ detail }) => detail.edit), [true, false]);
});

await check("tabs keyboard selection", async () => {
  await mount(`<ui-tabs default-value="first">
    <button id="first" role="tab" aria-controls="panel-first">First</button>
    <button id="second" role="tab" aria-controls="panel-second">Second</button>
    <section id="panel-first">One</section><section id="panel-second">Two</section>
  </ui-tabs>`);
  const root = page.locator('[data-component-root~="ui-tabs"]');
  await root.locator("#first").focus();
  await root.locator("#first").press("ArrowRight");
  assert.equal(await root.locator("#second").getAttribute("aria-selected"), "true");
  assert.equal(await root.locator("#panel-second").isVisible(), true);
  assert.equal((await events("select")).at(-1)?.detail.trigger, "keyboard");
});

await check("menu selection closes anchored surface", async () => {
  await mount(`<div><button id="menu-trigger">Menu</button><ui-menu for="menu-trigger" default-open>
    <ui-menu-item value="edit" tabindex="0">Edit</ui-menu-item>
  </ui-menu></div>`);
  const menu = page.locator('[data-component-root~="ui-menu"]');
  assert.equal(await menu.getAttribute("data-state-open"), "");
  await menu.locator('[data-component-root~="ui-menu-item"]').click();
  await page.waitForTimeout(20);
  await debugFixture("menu after selection");
  assert.equal((await events("select")).at(-1)?.detail.value, "edit");
  assert.equal(await menu.getAttribute("data-state-open"), null);
});

await check("popover and tooltip anchored triggers", async () => {
  await mount(`<div><button id="popover-trigger">Open</button><ui-popover for="popover-trigger">Panel</ui-popover>
    <button id="tooltip-trigger">Help</button><ui-tooltip for="tooltip-trigger" show-delay="0">Hint</ui-tooltip></div>`);
  await page.locator('[data-component-root~="ui-popover"]').evaluate((element) => { element.open = true; });
  await page.waitForTimeout(20);
  await debugFixture("overlays after popover click");
  assert.equal(await page.locator('[data-component-root~="ui-popover"]').evaluate((element) => element.hasAttribute("data-state-open")), true);
  await page.locator("#tooltip-trigger").focus();
  assert.equal(await page.locator('[data-component-root~="ui-tooltip"]').evaluate((element) => element.hasAttribute("data-state-open")), true);
});

await check("dialog escape request", async () => {
  await mount(`<ui-dialog default-open><h2>Confirm</h2><button>Okay</button></ui-dialog>`);
  const root = page.locator('[data-component-root~="ui-dialog"]');
  assert.equal(await root.locator("dialog").getAttribute("open"), "");
  await root.press("Escape");
  await debugFixture("dialog after escape");
  assert.equal((await events("close")).at(-1)?.detail.reason, "escape");
});

await check("combobox selection and public methods", async () => {
  await mount(`<ui-combobox label="Destination" disclosure></ui-combobox>`, {
    config: { options: [{ id: "nyc", value: "nyc", label: "New York" }] },
  });
  const root = page.locator('[data-component-root~="ui-combobox"]');
  await root.locator("input").fill("New");
  await root.locator("input").press("ArrowDown");
  await root.locator("input").press("Enter");
  assert.equal((await events("value-change")).at(-1)?.detail.value, "nyc");
  assert.equal(await root.evaluate((element) => typeof element.validate === "function" && typeof element.focusInput === "function"), true);
  assert.equal((await root.evaluate((element) => element.validate())).status, "valid");
});

await check("tree expansion and roving keyboard focus", async () => {
  await mount(`<ui-tree label="Files"><ui-tree-item item-id="folder" label="Folder" container>
    Folder<ui-tree-item slot="children" item-id="child" label="Child">Child</ui-tree-item>
  </ui-tree-item><ui-tree-item item-id="other" label="Other">Other</ui-tree-item></ui-tree>`);
  const items = page.locator('[data-component-root~="ui-tree-item"]');
  await items.nth(0).focus();
  await items.nth(0).press("ArrowRight");
  assert.equal(await items.nth(0).getAttribute("aria-expanded"), "true");
  await items.nth(0).press("ArrowDown");
  assert.equal(await items.nth(1).evaluate((element) => element === document.activeElement), true);
  assert.equal((await events("expand")).at(-1)?.detail.id, "folder");
});

await page.evaluate(() => window.__stopLooma?.());
await browser.close();
server.close();

for (const result of results) {
  console.log(`${result.ok ? "✓" : "✗"} ${result.name}${result.ok ? "" : ` — ${result.error}`}`);
}
const failed = results.filter(({ ok }) => !ok);
if (failed.length) throw new Error(`${failed.length}/${results.length} interaction checks failed.`);
console.log(`Validated ${results.length} HTML Next interaction contracts.`);
