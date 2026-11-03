// Shared browser driver. Scenarios describe content and behavior; the selected adapter mounts it.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createFixture, loadFixture } from "./fixture";
export { loadFixture, waitForFixture } from "./fixture";
import { connectSuiteBrowser, newFixturePage, recordPageErrors, type SuiteBrowser } from "./browser-client";

import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type BrowserContextOptions, type Page } from "playwright";
import { afterAll, beforeAll } from "vitest";

export const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
export let directory = "";
export let browser: SuiteBrowser;
let bundleSequence = 0;
const bundles = new Map<string, string>();

export async function bundle(name: string, source: string, mode = "production"): Promise<string> {
  const editorTarget = process.env.LOOMA_EDITOR_TARGET ?? "converted";
  const key = JSON.stringify([source, mode, editorTarget]);
  const cached = bundles.get(key);
  if (cached) return cached;
  // Immutable fixture inputs share compiled bytes; each case opens a fresh page below.
  const outputName = `${name}-${bundleSequence++}`;
  const path = await createFixture(directory, outputName, source, mode);
  bundles.set(key, path);
  return path;
}

export async function open(bundlePath: string, body: string, css: readonly string[], options: BrowserContextOptions = {}, beforeLoad?: (page: Page) => Promise<void>, beforeUpgrade?: (page: Page) => Promise<void>): Promise<Page> {
  const page = await newFixturePage(browser, options);
  recordPageErrors(page);
  await beforeLoad?.(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.stack || `${error.name}: ${error.message}`));
  await page.setContent(`<!doctype html><html><body>${body}</body></html>`);
  for (const path of css) await page.addStyleTag({ path });
  const convertedCss = join(dirname(bundlePath), "components.css");
  if (existsSync(convertedCss)) await page.addStyleTag({ path: convertedCss });
  await beforeUpgrade?.(page);
  await loadFixture(page, bundlePath);
  assert.deepEqual(errors, []);
  return page;
}

beforeAll(async () => {
  // Inside the package, so fixture bundles resolve the package’s own dependencies.
  await mkdir(join(root, ".test-build"), { recursive: true });
  directory = await mkdtemp(join(root, ".test-build", "browser-"));
  browser = await connectSuiteBrowser();
});

afterAll(async () => {
  await browser?.close();
  if (directory) await rm(directory, { recursive: true, force: true });
});

// The look a link must share with its button: every variant at rest and hovered, and disabled.
export const LOOK = ["display", "backgroundColor", "color", "borderColor", "boxShadow", "minHeight", "paddingTop", "paddingLeft",
  "textDecorationLine", "cursor"] as const;

export const look = (page: Page, selector: string) => page.locator(selector).evaluate((element, keys) => {
  const style = getComputedStyle(element);
  return Object.fromEntries(keys.map((key) => [key, style[key as keyof CSSStyleDeclaration]]));
}, LOOK as unknown as string[]);

// Whether each edge of a scroller shows the shared scroll fade: "1" while that edge hides content.
export function scrollFades(page: Page, selector: string) {
  return page.locator(selector).evaluate((element) => {
    const style = getComputedStyle(element);
    const on = (name: string) => (parseFloat(style.getPropertyValue(name)) > 0 ? "1" : "0");
    return { start: on("--_ui-scroll-fade-start"), end: on("--_ui-scroll-fade-end") };
  });
}
