import assert from "node:assert/strict";
import { testContext, testLane } from "./test-context";
import { chromium, type Browser, type BrowserContext, type BrowserContextOptions, type Page } from "playwright";

/** Closing a test file's connection leaves the suite-owned browser running. */
export type SuiteBrowser = Pick<Browser, "newPage" | "newContext" | "close">;
export async function connectSuiteBrowser(): Promise<SuiteBrowser> {
  const endpoints = JSON.parse(process.env.LOOMA_BROWSER_ENDPOINTS ?? "[]") as string[];
  if (!endpoints.length && process.env.LOOMA_BROWSER_ENDPOINT) endpoints.push(process.env.LOOMA_BROWSER_ENDPOINT);
  if (!endpoints.length) throw new Error("The browser suite must initialize its browsers before fixtures run.");
  const browsers = await Promise.all(endpoints.map(endpoint => chromium.connect(endpoint)));
  return {
    newPage: options => browsers[testLane()]!.newPage(options),
    newContext: options => browsers[testLane()]!.newContext(options),
    close: async options => { await Promise.all(browsers.map(browser => browser.close(options))); },
  };
}

export function recordPageErrors(page: Page): void {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.stack ?? error.message));
  // Cleanup belongs to this test, including when other tests have active pages.
  testContext().onTestFinished(async () => {
    try { assert.deepEqual(errors, [], "browser scenarios must finish without uncaught errors"); }
    finally { if (!page.isClosed()) await page.close(); }
  });
}

const contexts = new WeakMap<SuiteBrowser, Map<string, Promise<BrowserContext>>>();
/** Blank-page fixtures retain HTTP caches while every page has a fresh JavaScript realm. */
export async function newFixturePage(browser: SuiteBrowser, options: BrowserContextOptions = {}) {
  let profiles = contexts.get(browser);
  if (!profiles) { profiles = new Map(); contexts.set(browser, profiles); }
  // A lane owns its input device. Reuse its HTTP/code cache, with a fresh page realm per case.
  const key = JSON.stringify([testLane(), options]);
  let context = profiles.get(key);
  if (!context) { context = browser.newContext(options); profiles.set(key, context); }
  return (await context).newPage();
}
