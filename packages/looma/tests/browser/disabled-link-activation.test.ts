import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Disabled link activation", () => {
  it("blocks converted click consumers until disabled is cleared", async () => {
    const path = await bundle("converted-disabled-link-consumer", `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiButton as Button } from "@looma-test/components";
      const disabled = createState(true);
      window.activations = 0;
      window.enableLink = () => { disabled.value = false; };
      createScene({ render: () => sceneNode(Button, {
        id: "link", href: "#target", disabled: disabled.value,
        onClick: event => { event.preventDefault(); window.activations++; },
      }, () => "Open") }).mount("#app");
    `);
    const page = await open(path, '<div id="app"></div>', [join(root, "tokens.css")]);
    const link = page.locator("#link");
    assert.equal(await link.evaluate(element => element.localName), "a");
    await expect.poll(() => link.getAttribute("href")).toBe(null);
    const box = await link.boundingBox();
    assert.ok(box);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await link.evaluate(element => (element as HTMLElement).click());
    assert.equal(await page.evaluate(() => (window as unknown as { activations: number }).activations), 0, "disabled links cannot notify routing or action consumers");
    await page.evaluate(() => (window as unknown as { enableLink: () => void }).enableLink());
    await link.click();
    assert.equal(await page.evaluate(() => (window as unknown as { activations: number }).activations), 1);
    await expect.poll(() => link.getAttribute("href")).toBe("#target");
    await page.close();
  });
});
