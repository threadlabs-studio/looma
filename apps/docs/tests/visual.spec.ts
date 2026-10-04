import { test, expect, ready, screenshot } from "./docs-fixture";
import coverage from "./coverage.json";
import { interactionCases } from "./interaction-cases";
import { accessibilityFindings } from "./accessibility";

test.beforeAll(() => {
  expect(process.platform, "Visual baselines require the pinned Linux image").toBe("linux");
  expect(process.arch).toBe("arm64");
  expect(process.env.LOOMA_DOCS_CANONICAL, "Run pnpm test:visual in the pinned Linux image").toBe("1");
});

for (const theme of ["light", "dark"] as const) {
  for (const viewport of [{ name: "desktop", width: 1280, height: 900 }, { name: "mobile", width: 375, height: 812 }]) {
    test.describe(`${viewport.name}-${theme}`, () => {
      test.use({ viewport, colorScheme: theme });
      test.beforeEach(async ({ page }) => {
        await page.addInitScript((theme) => localStorage.setItem("theme", theme), theme);
      });
      for (const doc of coverage.pages) {
        test(`${doc.path}: reviewed page and examples`, async ({ page }) => {
          await page.goto(doc.path, { waitUntil: "domcontentloaded" });
          await ready(page);
          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
          if (doc.component === "ui-search-shell") await page.frameLocator("iframe").last().getByRole("searchbox").focus();
          const name = `${viewport.name}-${theme}/${doc.path === "./" ? "home" : doc.path.replaceAll("/", "--")}`;
          // This single slash glyph varies by three rasterized pixels across repeated Chromium captures.
          // Keep every other page at zero changed pixels; a larger catalog change still fails.
          const maxDiffPixels = name === "mobile-dark/components" ? 3 : 0;
          // Desktop Table HTML/Vue captures have stable, reviewed GitHub-hosted rasterization variants.
          // Keep both rendering environments at zero changed pixels instead of increasing tolerance.
          const githubTable = process.env.GITHUB_ACTIONS === "true" && viewport.name === "desktop" && doc.path === "components/ui-table";
          const pageImage = githubTable ? `${name}--github-actions` : name;
          await screenshot(page, `${pageImage}.png`, true, maxDiffPixels);
          expect(JSON.stringify(await accessibilityFindings(page), null, 2)).toMatchSnapshot(`${name}--accessibility.txt`);
          if (doc.component) {
            await page.getByRole("tab", { name: "API", exact: true }).click();
            await ready(page);
            await screenshot(page, `${name}--api.png`, true);
            await page.getByRole("tab", { name: "Examples", exact: true }).click();
            await page.getByRole("button", { name: "Vue", exact: true }).first().click();
            // Capture the persisted lens from a fresh page, matching the initial HTML view's paint.
            // Reused previews after API/Examples had stable geometry but variable text rasterization.
            await page.reload({ waitUntil: "domcontentloaded" });
            await ready(page);
            await expect(page.locator('.looma-mode-code[data-framework-mode="vue"]')).toHaveCount(doc.examples.length);
            if (doc.component === "ui-search-shell") await page.frameLocator("iframe").last().getByRole("searchbox").focus();
            const vueImage = githubTable ? `${name}--vue--github-actions` : `${name}--vue`;
            await screenshot(page, `${vueImage}.png`, true);
          }
        });
      }
      for (const state of interactionCases) {
        test(`${state.component}: ${state.name}`, async ({ page }) => {
          await page.goto(`components/${state.component}/`);
          await ready(page);
          const scenario = page.locator(`[data-preview-example="${state.example}"] .looma-preview-scenario__stage`);
          await scenario.scrollIntoViewIfNeeded();
          await state.run(page, scenario);
          await screenshot(page, `${viewport.name}-${theme}/states/${state.component}--${state.name.replaceAll(" ", "-")}.png`);
        });
      }
      test("catalog search results and empty state", async ({ page }) => {
        await page.goto("components/");
        await ready(page);
        await page.getByRole("searchbox", { name: /^Search components/ }).fill("button");
        await ready(page);
        await expect(page.locator('[data-component-card="ui-button"]')).toBeVisible();
        await screenshot(page, `${viewport.name}-${theme}/states/catalog-search.png`, true);
        await page.getByRole("searchbox", { name: /^Search components/ }).fill("no-component-with-this-name");
        await expect(page.getByRole("heading", { name: "No components found", exact: true })).toBeVisible();
        await screenshot(page, `${viewport.name}-${theme}/states/catalog-empty.png`, true);
      });
      test("catalog dialog in the top layer", async ({ page }) => {
        await page.goto("components/", { waitUntil: "domcontentloaded" });
        await ready(page);
        await page.getByRole("button", { name: /^Overlay/ }).click();
        const card = page.locator('[data-component-card="ui-dialog"]');
        await card.scrollIntoViewIfNeeded();
        const trigger = card.getByRole("button", { name: "Open dialog", exact: true });
        await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
        await trigger.click();
        const dialog = card.locator("dialog");
        await expect(dialog).toBeVisible();
        await expect.poll(() => dialog.evaluate(element => element.getAnimations().length)).toBe(0);
        await page.mouse.move(0, 0);
        // Keep the containing page and dialog together; fractional locator crops can vary at rounded corners.
        await screenshot(page, `${viewport.name}-${theme}/states/catalog-dialog.png`);
      });
      if (viewport.name === "mobile") test("dialog content growth, body scrolling, and shrinkage", async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await page.goto("components/ui-dialog", { waitUntil: "domcontentloaded" });
        await ready(page);
        const example = page.locator('[data-preview-scenario="Default"]');
        const trigger = example.getByRole("button", { name: /^Open/ });
        await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
        await trigger.click();
        const dialog = example.locator("dialog");
        await expect(dialog).toBeVisible();
        const paragraph = dialog.locator(".body p").first();
        const original = await paragraph.textContent();
        await paragraph.evaluate((element) => {
          element.textContent = Array.from({ length: 24 }, (_, index) => `Review note ${index + 1}: Additional content belongs in the scrolling body while the title and actions stay visible.`).join(" ");
        });
        const body = dialog.locator('.body [data-component~="ui-scroll-area"]');
        await expect.poll(() => body.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
        await expect.poll(() => dialog.evaluate(element => element.getAnimations().length)).toBe(0);
        await expect(dialog.locator("header")).toBeInViewport();
        await expect(dialog.getByRole("button", { name: "Publish", exact: true })).toBeInViewport();
        const grown = await dialog.boundingBox();
        expect(grown!.height).toBeGreaterThan(viewport.height * 0.85);
        expect(grown!.y).toBeGreaterThanOrEqual(0);
        expect(grown!.y + grown!.height).toBeLessThanOrEqual(viewport.height);
        await screenshot(page, `${viewport.name}-${theme}/states/dialog-content-grown.png`);
        await body.evaluate(element => { element.scrollTop = element.scrollHeight / 2; });
        await screenshot(page, `${viewport.name}-${theme}/states/dialog-body-scrolled.png`);
        await paragraph.evaluate((element, text) => { element.textContent = text; }, original);
        await expect.poll(() => dialog.evaluate(element => element.getBoundingClientRect().height)).toBeLessThan(300);
        await expect.poll(() => dialog.evaluate(element => element.getAnimations().length)).toBe(0);
        expect(await body.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(false);
        await screenshot(page, `${viewport.name}-${theme}/states/dialog-content-shrunk.png`);
      });
      test("editor guide selection toolbar and mention suggestions", async ({ page }) => {
        await page.goto("editor/");
        await ready(page);
        const demo = page.locator(".looma-editor-guide-demo");
        const editor = page.getByRole("textbox", { name: "Editor guide playground", exact: true });
        const previousEditor = await editor.elementHandle();
        await demo.getByRole("button", { name: "Beside selection", exact: true }).click();
        await previousEditor!.waitForElementState("hidden");
        await expect(editor).toBeVisible();
        await editor.locator("p").first().dblclick();
        await expect.poll(() => page.evaluate(() => window.getSelection()?.toString().length ?? 0)).toBeGreaterThan(0);
        if (viewport.name === "mobile") {
          const toolbar = page.getByRole("toolbar", { name: "Text formatting", exact: true });
          await expect(toolbar).toBeVisible();
          await expect(toolbar.getByRole("button", { name: "Bold", exact: true })).toBeVisible();
          expect((await toolbar.boundingBox())!.y).toBeGreaterThan(viewport.height / 2);
        } else {
          await expect(page.locator("[data-tippy-root]:visible").filter({ has: page.getByRole("button", { name: "Bold", exact: true }) })).toBeVisible();
        }
        await screenshot(page, `${viewport.name}-${theme}/states/editor-selection-toolbar.png`);
        await editor.click();
        await editor.press("End");
        await editor.pressSequentially(" @Ada");
        await expect(page.getByRole("listbox", { name: "Mentions", exact: true }).getByRole("option", { name: /Ada Lovelace/ })).toBeVisible();
        await screenshot(page, `${viewport.name}-${theme}/states/editor-mentions.png`);
      });
      if (viewport.name === "mobile") {
        test("open mobile documentation navigation", async ({ page }) => {
          await page.goto("components/ui-button/");
          await ready(page);
          const toggle = page.getByRole("button", { name: "Toggle navigation bar", exact: true });
          await toggle.click();
          await expect(toggle).toHaveAttribute("aria-expanded", "true");
          await expect(page.locator(".navbar-sidebar")).toHaveCSS("background-color", theme === "light" ? "rgb(251, 249, 244)" : "rgb(33, 29, 43)");
          await expect.poll(async () => (await page.locator(".navbar-sidebar").boundingBox())?.height ?? 0).toBeGreaterThan(viewport.height - 2);
          const currentLink = page.locator(".navbar-sidebar").getByRole("link", { name: "Button", exact: true });
          await currentLink.scrollIntoViewIfNeeded();
          await expect(currentLink).toBeInViewport();
          await screenshot(page, `${viewport.name}-${theme}/states/docs-navigation.png`);
        });
      }
    });
  }
}
