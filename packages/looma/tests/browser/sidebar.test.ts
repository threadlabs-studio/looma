import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Sidebar", () => {
  it("animates docked occupancy with a fixed content canvas and follows pointer resizing immediately", async () => {
    const path = await bundle("html-sidebar-layout-motion", `import "@looma-test/runtime";`);
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
      import "@looma-test/runtime";
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

  it("opens and closes as a drawer, announcing each change once, in converted output", async () => {
    const path = await bundle("converted-sidebar-drawer", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiSidebar as Sidebar } from "@looma-test/components";
      window.probe = { toggles: [], resizes: [] };
      createScene({ render: () => [
        sceneNode("button", { id: "menu", commandfor: "nav", command: "--toggle" }, "Menu"),
        sceneNode(Sidebar, { id: "nav", "aria-label": "Workspace", width: 256, onToggle: (event) => window.probe.toggles.push(event.detail) },
          () => sceneNode("a", { href: "#inbox" }, "Inbox")),
      ] }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await checkDrawer(page);
    await page.close();
  });

  it("takes its docked width from the width prop, in converted output", async () => {
    const path = await bundle("converted-sidebar-width", `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiSidebar as Sidebar } from "@looma-test/components";
      window.probe = { toggles: [], resizes: [] };
      const width = createState(256);
      window.width = width;
      createScene({ render: () => sceneNode(Sidebar, {
        id: "nav", "aria-label": "Workspace", width: width.value, resizable: true,
        onResize: (event) => window.probe.resizes.push(event.detail),
      }, () => sceneNode("a", { href: "#inbox" }, "Inbox")) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    const errors = watchErrors(page);
    const width = () => page.locator("#nav").evaluate((element) => element.getBoundingClientRect().width);
    await expect.poll(width).toBe(256);
    await page.evaluate(() => { (window as unknown as { width: { value: number } }).width.value = 300; });
    await page.waitForFunction(() => document.querySelector("#nav")!.getBoundingClientRect().width === 300);
    assert.equal(await width(), 300);
    await expect.poll(() => page.locator("#nav .resizer").getAttribute("aria-valuenow")).toBe("300");
    assert.deepEqual(errors, []);
    assert.deepEqual((await probe(page)).resizes, [{ width: 256, trigger: "programmatic" }, { width: 300, trigger: "programmatic" }]);
    await page.close();
  });
});
