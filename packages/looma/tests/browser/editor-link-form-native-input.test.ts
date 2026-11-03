import assert from "node:assert/strict";
import { join } from "node:path";
import { it } from "vitest";
import { expect } from "../renderers/test-context";
import { root, bundle, open } from "../renderers/browser-driver";

it("retains native link-form edits made before its controller connects", async () => {
  const path = await bundle("link-form-native-input", `
    import { createScene, sceneNode } from "@looma-test/scene";
    import { UiEditorLinkForm } from "@looma-test/components";
    window.destinations = []; window.texts = [];
    const observer = new MutationObserver(() => {
      const destination = document.querySelector("[data-link-destination]");
      const text = document.querySelector("[data-link-text]");
      if (!destination || !text) return;
      observer.disconnect();
      destination.value = "/after"; text.value = "After";
      destination.dispatchEvent(new Event("input", { bubbles: true }));
      text.dispatchEvent(new Event("input", { bubbles: true }));
      window.edited = true;
    });
    observer.observe(document.querySelector("#app"), { childList: true, subtree: true });
    createScene({ render: () => sceneNode(UiEditorLinkForm, {
      value: "/before", text: "Before", textEditable: true,
      onDestination: event => window.destinations.push(event.detail.value),
      onText: event => window.texts.push(event.detail.text),
    }) }).mount("#app");
  `);
  const page = await open(path, '<div id="app"></div>', [join(root, "tokens.css")]);
  await page.waitForFunction(() => (window as any).edited);
  await expect.poll(() => page.evaluate(() => (window as any).destinations)).toEqual(["/after"]);
  await expect.poll(() => page.evaluate(() => (window as any).texts)).toEqual(["After"]);
  assert.equal(await page.locator("[data-link-destination]").inputValue(), "/after");
  assert.equal(await page.locator("[data-link-text]").inputValue(), "After");
  await page.close();
});
