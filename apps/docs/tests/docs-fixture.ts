import { expect, test as base } from "@playwright/test";
import path from "node:path";
import type { Page, Request } from "@playwright/test";
import fontSources from "./fixtures/fonts/sources.json";

const pendingAssets = new WeakMap<Page, Set<Request>>();

/** Catch unexpected browser and same-origin asset failures in every documentation test. */
export const test = base.extend<{ diagnostics: void }>({
  diagnostics: [async ({ page, baseURL }, use) => {
    const failures: string[] = [];
    const origin = new URL(baseURL!).origin;
    const pending = new Set<Request>();
    pendingAssets.set(page, pending);
    page.on("request", (request) => {
      if (new URL(request.url()).origin === origin && ["script", "stylesheet", "font", "image"].includes(request.resourceType())) pending.add(request);
    });
    page.on("requestfinished", (request) => pending.delete(request));
    // Replay the site's real font files so offline CI and local runs render identically.
    const fonts = path.join(__dirname, "fixtures/fonts");
    await page.route("https://fonts.googleapis.com/**", (route) => {
      if (route.request().url() !== fontSources.stylesheet) {
        failures.push(`Unreviewed font stylesheet: ${route.request().url()}`);
        return route.abort();
      }
      return route.fulfill({ path: path.join(fonts, "google.css"), contentType: "text/css" });
    });
    await page.route("https://fonts.gstatic.com/**", (route) => {
      if (!fontSources.files.includes(route.request().url())) {
        failures.push(`Unreviewed font file: ${route.request().url()}`);
        return route.abort();
      }
      return route.fulfill({ path: path.join(fonts, path.basename(new URL(route.request().url()).pathname)), contentType: "font/ttf" });
    });
    page.on("pageerror", (error) => failures.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") failures.push(message.text());
    });
    page.on("response", (response) => {
      if (response.status() >= 400 && new URL(response.url()).origin === origin) {
        failures.push(`${response.status()} ${response.url()}`);
      }
    });
    page.on("requestfailed", (request) => {
      pending.delete(request);
      if (new URL(request.url()).origin === origin && !/abort|cancelled|canceled/i.test(request.failure()?.errorText ?? "")) {
        failures.push(`${request.failure()?.errorText} ${request.url()}`);
      }
    });
    await use();
    expect(failures, "Unexpected documentation browser/asset errors").toEqual([]);
  }, { auto: true }]
});

/** Wait for the authored preview roots, real fonts, and images before measuring the page. */
export async function ready(page: Page): Promise<void> {
  await expect(page.locator("main").first()).toBeVisible();
  // Docusaurus keeps this native button disabled during SSR and enables it after hydration.
  // Static guides have no lazy previews to otherwise distinguish their SSR and live trees.
  await expect(page.locator('button[aria-label^="Switch between dark and light mode"]').first()).toBeEnabled();
  // The catalog deliberately mounts off-screen previews through IntersectionObserver.
  for (const preview of await page.locator(".looma-component-card__preview").all()) {
    await preview.scrollIntoViewIfNeeded();
    await expect(preview.locator(".looma-live-example-loading")).toHaveCount(0);
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(page.locator(".looma-live-example-loading")).toHaveCount(0);
  // Controller chunks are imported after the preview mounts; wait for these real asset reads too.
  await expect.poll(() => pendingAssets.get(page)?.size ?? 0).toBe(0);
  // Each static floating preview owns its document, fonts, and lazy controller imports.
  for (const frame of page.frames().filter((frame) => frame !== page.mainFrame())) {
    await frame.waitForFunction(() => !document.querySelector('script[src]') || document.querySelector('[data-component]'));
    await frame.evaluate(async () => { await document.fonts.ready; });
  }
  const brokenImages = await page.evaluate(async () => {
    await document.fonts.ready;
    return (await Promise.all(Array.from(document.images).filter((image) => image.getAttribute("src")).map(async (image) => {
      try { await image.decode(); return null; }
      catch { return image.currentSrc || image.src; }
    }))).filter(Boolean);
  });
  expect(brokenImages, "Documentation images must decode successfully").toEqual([]);
  await paint(page);
}

/** Let native ResizeObserver callbacks and frame-scheduled overlay geometry reach a paint. */
async function paint(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

/** Capture a deliberate pointer/scroll state while preserving focus, selections, and open overlays. */
export async function screenshot(page: Page, name: string, fullPage = false, maxDiffPixels = 0): Promise<void> {
  await page.mouse.move(0, 0);
  if (fullPage) {
    // Lazy previews and fonts can move headings after Docusaurus highlights the TOC.
    // Await both native scroll events so its listener recomputes at the final layout.
    // Frame waits alone do not prove that both scroll listeners ran.
    await page.evaluate(async () => {
      const scroll = (top: number) => new Promise<void>((resolve) => {
        if (window.scrollY === top) { resolve(); return; }
        window.addEventListener("scroll", () => resolve(), { once: true });
        window.scrollTo({ top, behavior: "instant" });
      });
      const bottom = document.documentElement.scrollHeight - window.innerHeight;
      if (bottom > 0) {
        await scroll(Math.min(1, bottom));
        await scroll(0);
      }
    });
  }
  await paint(page);
  if (name.endsWith("/docs-api-sync.png")) {
    // Compare the settled static guide's first capture: repeated live-page capture can remount its TOC.
    await expect(await page.screenshot({ fullPage, animations: "disabled", caret: "hide" })).toMatchSnapshot(name, { maxDiffPixels });
  } else {
    await expect(page).toHaveScreenshot(name, { fullPage, maxDiffPixels, timeout: 15_000 });
  }
}

export { expect };
