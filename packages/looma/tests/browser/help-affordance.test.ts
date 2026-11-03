import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Help affordance", () => {
  it("sits beside the field and opens its tooltip on click", async () => {
    const path = await bundle("converted-help", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiCombobox as Combobox } from "@looma-test/components";
      createScene({
        render: () => sceneNode(Combobox, { id: "where", label: "Destination", help: "Where the export lands." }, () => [
          sceneNode("option", { value: "alpha" }, "Alpha"),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    const help = page.locator("#where .help");
    const field = page.locator("#where .field");
    const geometry = await page.locator("#where").evaluate((root) => {
      const box = root.querySelector(".field")!.getBoundingClientRect();
      const button = root.querySelector(".help")!.getBoundingClientRect();
      return { outside: button.left >= box.right - 1, insideInput: root.querySelector("input")!.contains(root.querySelector(".help")) };
    });
    assert.equal(geometry.outside, true, "the help button follows the field");
    assert.equal(geometry.insideInput, false);
    await expect.poll(() => field.locator(".help").count(), { message: "it is not inside the box" }).toBe(0);

    const tip = page.locator(':is([component~="ui-tooltip"], [data-component~="ui-tooltip"], .ui-tooltip, [ui-tooltip])');
    await expect.poll(() => tip.isVisible()).toBe(false);
    // Hovering a question mark says nothing, so it opens on press and closes the same way.
    await help.hover();
    await page.waitForTimeout(700);
    await expect.poll(() => tip.isVisible(), { message: "hover does not open it" }).toBe(false);
    await help.click();
    await tip.waitFor({ state: "visible" });
    await expect.poll(() => help.getAttribute("aria-expanded")).toBe("true");
    await help.click();
    await tip.waitFor({ state: "hidden" });
    await page.close();
  });
});
