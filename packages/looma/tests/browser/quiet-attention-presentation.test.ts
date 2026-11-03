import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Quiet attention presentation", () => {
  it("uses the same highlighted rows and accessible dot geometry in HTML and converted", async () => {
    for (const framework of ["html", "converted"]) {
      const path = await bundle(`${framework}-quiet-attention`, framework === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiBadge as Badge, UiList as List, UiListItem as ListItem } from "@looma-test/components";
        createScene({ render: () => sceneNode("div", [
          sceneNode(List, () => [
            sceneNode(ListItem, { id: "plain" }, () => sceneNode("a", { href: "#plain" }, "Earlier message")),
            sceneNode(ListItem, { id: "new-one", highlighted: true }, () => sceneNode("a", { href: "#one" }, "New message")),
            sceneNode(ListItem, { id: "new-two", highlighted: true }, () => sceneNode("a", { href: "#two" }, "Another new message")),
          ]),
          sceneNode(Badge, { id: "new-dot", shape: "dot", tone: "accent", variant: "solid" }, () => "New messages"),
          sceneNode(Badge, { id: "pending-dot", shape: "dot", tone: "warning" }, () => "Waiting for your reply"),
        ]) }).mount("#app");
      `);
      const body = framework === "converted" ? `<div id="app"></div>` : `
        <ui-list>
          <ui-list-item id="plain"><a href="#plain">Earlier message</a></ui-list-item>
          <ui-list-item id="new-one" highlighted><a href="#one">New message</a></ui-list-item>
          <ui-list-item id="new-two" highlighted><a href="#two">Another new message</a></ui-list-item>
        </ui-list>
        <ui-badge id="new-dot" shape="dot" tone="accent" variant="solid">New messages</ui-badge>
        <ui-badge id="pending-dot" shape="dot" tone="warning">Waiting for your reply</ui-badge>`;
      const page = await open(path, body, [join(root, "tokens.css")], { viewport: { width: 375, height: 812 } });
      await page.waitForSelector('#new-one:is([component~="ui-list-item"], [data-component~="ui-list-item"], .ui-list-item, [ui-list-item])');
      const style = (selector: string, property: string) => page.locator(selector).evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), property);
      assert.notEqual(await style("#new-one", "background-color"), await style("#plain", "background-color"));
      assert.equal(await style("#new-one", "color"), await style("#plain", "color"));
      assert.equal(await style("#new-one .title", "font-weight"), await style("#plain .title", "font-weight"));
      for (const selector of ["#new-one", "#new-two"]) {
        await expect.poll(() => page.locator(selector).getAttribute("aria-current")).not.toBe("true");
        await expect.poll(() => page.locator(selector).getAttribute("aria-selected")).toBe(null);
      }
      for (const selector of ["#new-dot", "#pending-dot"]) {
        const box = await page.locator(selector).boundingBox();
        assert.ok(box && box.width === box.height && box.width <= 10, "a signal stays a small circle regardless of its label");
        assert.ok((await page.locator(selector).ariaSnapshot()).includes(selector === "#new-dot" ? "New messages" : "Waiting for your reply"));
      }
      assert.notEqual(await style("#new-dot", "background-color"), await style("#pending-dot", "background-color"));
      await page.locator("#new-one a").focus();
      await page.keyboard.press("Enter");
      assert.equal(await page.evaluate(() => location.hash), "#one");
      // Both options follow their existing theme owner, without changing text or action geometry.
      await page.locator("body").evaluate(element => {
        element.style.setProperty("--ui-selection-surface", "rgb(245, 240, 255)");
      });
      await page.waitForFunction(() => getComputedStyle(document.querySelector("#new-one")!).backgroundColor === "rgb(245, 240, 255)");
      assert.equal(await style("#new-one", "background-color"), "rgb(245, 240, 255)");
      await page.emulateMedia({ forcedColors: "active" });
      assert.equal(await style("#pending-dot", "forced-color-adjust"), "none");
      await page.close();
    }
  });
});
