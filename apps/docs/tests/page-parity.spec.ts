import { test, expect, ready } from "./docs-fixture";
import coverage from "./coverage.json";

const expectedRoutes = new Set(coverage.pages.map((entry) => entry.path === "./" ? "" : entry.path));

for (const doc of coverage.pages) {
  test(`${doc.path}: content, links, and authored scenarios`, async ({ page, baseURL }) => {
    await page.goto(doc.path, { waitUntil: "domcontentloaded" });
    await ready(page);
    await expect(page.getByRole("heading", { level: 1 }).first()).toHaveText(doc.title);
    const links = await page.locator("main a[href]").evaluateAll((anchors) => anchors
      .filter((anchor) => !anchor.closest(".looma-preview-scenario__stage, .looma-live-example-preview, .looma-component-card__preview"))
      .map((anchor) => (anchor as HTMLAnchorElement).href));
    const base = new URL(baseURL!);
    for (const link of links) {
      const url = new URL(link);
      if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) continue;
      const route = decodeURIComponent(url.pathname.slice(base.pathname.length)).replace(/\/$/, "");
      expect(expectedRoutes.has(route), `Broken internal route ${link}`).toBe(true);
      if (url.hash && url.pathname === new URL(page.url()).pathname) {
        expect(await page.locator(`[id=${JSON.stringify(decodeURIComponent(url.hash.slice(1)))}]`).count(), `Broken heading link ${link}`).toBeGreaterThan(0);
      }
    }
    if (doc.component) {
      const scenarios = page.locator("[data-preview-example]");
      expect(await scenarios.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-preview-example")))).toEqual(doc.examples.map((example) => example.id));
      for (const example of doc.examples) {
        const scenario = page.locator(`[data-preview-example=${JSON.stringify(example.id)}]`);
        await expect(scenario.locator(":scope > header > h2")).toHaveText(example.title);
        await expect(scenario.locator(".looma-preview-scenario__stage")).toBeVisible();
        await expect(scenario.locator(".looma-mode-code")).toContainText(/\S/);
      }
      if (doc.component === "ui-radio-group") {
        const disabled = page.locator('[data-preview-example="03-disabled"]');
        await expect(disabled.getByRole("radio", { name: "Free", exact: true })).toBeChecked();
        await expect(disabled.getByRole("radio", { name: "Pro", exact: true })).not.toBeChecked();
        for (const radio of await disabled.getByRole("radio").all()) await expect(radio).toBeDisabled();
      }
      await page.getByRole("tab", { name: "API", exact: true }).click();
      await expect(page.getByRole("tab", { name: "API", exact: true })).toHaveAttribute("aria-selected", "true");
      await expect(page.getByRole("tabpanel")).toContainText(/Props|Properties|Tokens|Events|Slots/);
      await page.getByRole("tab", { name: "Examples", exact: true }).click();
      await expect(scenarios).toHaveCount(doc.examples.length);
      await page.getByRole("button", { name: "Vue", exact: true }).first().click();
      await expect(page.locator('.looma-mode-code[data-framework-mode="vue"]')).toHaveCount(doc.examples.length);
      for (const scenario of await scenarios.all()) {
        await expect(scenario.locator(".looma-mode-code")).toContainText(/<template>/);
      }
    }
  });
}
