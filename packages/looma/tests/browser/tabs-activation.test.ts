import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Tabs activation", () => {
  it("lets vertical wheel scrolling reach the page over fitting and overflowing tabs", async () => {
    const path = await bundle("html-tabs-wheel", 'import "@looma-test/runtime";');
    const page = await open(path, '<div style="height: 3000px"><ui-tabs style="max-inline-size: 12rem"><section aria-label="HTML Next">HTML</section><section aria-label="Converted">converted</section><section aria-label="Long additional example">More</section></ui-tabs></div>', [join(root, "tokens.css")]);
    for (const width of ["12rem", "60rem"]) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.locator('[role="tablist"]').evaluate((list, width) => { (list.parentElement as HTMLElement).style.maxInlineSize = width; }, width);
      await page.getByRole("tab", { name: "HTML Next", exact: true }).hover();
      await page.mouse.wheel(0, 150);
      await page.waitForFunction(() => window.scrollY > 0);
    }
    await page.close();
  });

  it("moves focus without selecting in manual mode and selects on Enter or Space", async () => {
    const path = await bundle("html-manual-tabs", `
      import "@looma-test/runtime";
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
    await expect.poll(() => page.getByRole("tab", { name: "Details" }).getAttribute("aria-selected")).toBe("false");
    assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), "Details");
    await expect.poll(() => page.locator("#overview").isVisible()).toBe(true);
    await page.keyboard.press("Enter");
    await expect.poll(() => page.getByRole("tab", { name: "Details" }).getAttribute("aria-selected")).toBe("true");
    await expect.poll(() => page.locator("#details").isVisible()).toBe(true);
    await page.keyboard.press("End");
    assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), "History");
    await expect.poll(() => page.getByRole("tab", { name: "History" }).getAttribute("aria-selected")).toBe("false");
    await page.keyboard.press("Space");
    await expect.poll(() => page.getByRole("tab", { name: "History" }).getAttribute("aria-selected")).toBe("true");
    assert.deepEqual(await page.evaluate(() => (window as any).selections.map((event: any) => [event.value, event.trigger])), [["details", "keyboard"], ["history", "keyboard"]]);
    await page.close();
  });

  it("keeps automatic activation when the converted prop is omitted", async () => {
    const path = await bundle("converted-auto-tabs", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiTabs as Tabs } from "@looma-test/components";
      createScene({ render: () => sceneNode(Tabs, { id: "tabs", label: "Views" }, () => [
        sceneNode("section", { id: "overview", "aria-label": "Overview" }, "Overview content"),
        sceneNode("section", { id: "details", "aria-label": "Details" }, "Details content"),
      ]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await page.getByRole("tab", { name: "Overview" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => page.getByRole("tab", { name: "Details" }).getAttribute("aria-selected")).toBe("true");
    await page.close();
  });

  it("uses authored tab buttons with rich labels in HTML", async () => {
    const path = await bundle("html-rich-tabs", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-tabs label="Views">
        <button slot="tab" value="overview"><ui-icon name="check"></ui-icon> Overview</button>
        <button slot="tab" value="details">Details <span>(2)</span></button>
        <section id="overview" aria-label="Overview">Overview content</section>
        <section id="details" aria-label="Details">Details content</section>
      </ui-tabs>
    `, [join(root, "tokens.css")]);
    await expect.poll(() => page.getByRole("tab", { name: "Overview" }).count()).toBe(1);
    await expect.poll(() => page.getByRole("tab", { name: "Details (2)" }).count()).toBe(1);
    await page.getByRole("tab", { name: "Details (2)" }).click();
    await expect.poll(() => page.locator("#details").isVisible()).toBe(true);
    await expect.poll(() => page.locator("#details").getAttribute("aria-labelledby")).toBe(await page.getByRole("tab", { name: "Details (2)" }).getAttribute("id"));
    await page.close();
  });

  it("projects rich tab buttons through the converter", async () => {
    const path = await bundle("converted-rich-tabs", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiTabs as Tabs, UiIcon as Icon } from "@looma-test/components";
      createScene({ render: () => sceneNode(Tabs, { label: "Views" }, {
        tab: () => [
          sceneNode("button", { value: "overview" }, [sceneNode(Icon, { name: "check" }), " Overview"]),
          sceneNode("button", { value: "details" }, ["Details ", sceneNode("span", "(2)")]),
        ],
        default: () => [
          sceneNode("section", { id: "overview", "aria-label": "Overview" }, "Overview content"),
          sceneNode("section", { id: "details", "aria-label": "Details" }, "Details content"),
        ],
      }) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await expect.poll(() => page.getByRole("tab", { name: "Details (2)" }).count()).toBe(1);
    await page.getByRole("tab", { name: "Details (2)" }).click();
    await expect.poll(() => page.locator("#details").isVisible()).toBe(true);
    await page.close();
  });
});
