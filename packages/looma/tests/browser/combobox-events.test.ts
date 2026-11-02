import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Combobox events", () => {
  // The list marks the chosen row with a view-only flag; events report options in their declared
  // shape, so converted's detail checks accept them and the choice reaches the consumer.
  it("reports options and a single choice in their declared shape in converted output", async () => {
    const path = await bundle("converted-combobox-event-shape", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiCombobox as Combobox } from "@looma-test/components";
      window.events = [];
      createScene({
        render: () => sceneNode(Combobox, {
          label: "Fruit",
          onOptionsChange: (event) => window.events.push(["options", event.detail]),
          onValueChange: (event) => window.events.push(["value", event.detail]),
        }, () => [sceneNode("option", { value: "apple" }, "Apple"), sceneNode("option", { value: "pear" }, "Pear")]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.locator('input[role="combobox"]').pressSequentially("pe");
    await page.getByRole("option", { name: "Pear" }).click();
    assert.deepEqual(errors, []);
    const events = await page.evaluate(() => (window as unknown as { events: [string, any][] }).events);
    const pear = { id: "pear", value: "pear", label: "Pear", disabled: false };
    assert.deepEqual(events.filter(([name]) => name === "options").at(-1)?.[1], [pear]);
    const choice = events.find(([name]) => name === "value")?.[1];
    assert.equal(choice.kind, "selection");
    assert.deepEqual(choice.option, pear);
    await page.close();
  });
});
