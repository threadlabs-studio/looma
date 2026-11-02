import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Controlled strict Combobox search", () => {
  it("keeps a typed search draft, restores an unmatched draft on blur, and commits a chosen option", async () => {
    const path = await bundle("converted-controlled-combobox-search", `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiCombobox as Combobox } from "@looma-test/components";
      const selected = createState("apple");
      window.changes = [];
      createScene({ render: () => sceneNode(Combobox, {
        id: "fruit", label: "Fruit", name: "fruit", value: selected.value,
        onValueChange: (event) => {
          window.changes.push(event.detail);
          if (event.detail.kind === "selection") selected.value = event.detail.value;
        },
      }, () => [sceneNode("option", { value: "apple" }, "Apple"), sceneNode("option", { value: "pear" }, "Pear")]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div><button id="after">After</button>`, [join(root, "tokens.css")]);
    const input = page.locator('#fruit input[role="combobox"]');
    await expect.poll(() => input.inputValue()).toBe("Apple");
    await input.fill("pea");
    await expect.poll(() => input.inputValue(), { message: "a search draft stays visible while the selection is controlled" }).toBe("pea");
    await expect.poll(() => page.locator('#fruit input[type="hidden"][name="fruit"]').inputValue(), { message: "searching keeps the committed form value" }).toBe("apple");
    await expect.poll(() => page.locator('#fruit [role="option"]').allInnerTexts()).toStrictEqual(["Pear"]);
    assert.deepEqual(await page.evaluate(() => (window as unknown as { changes: { kind: string }[] }).changes.map(({ kind }) => kind)), [], "typing does not clear the committed value");
    await input.fill("zz");
    await expect.poll(() => input.inputValue()).toBe("zz");
    await page.locator("#after").focus();
    await expect.poll(() => input.inputValue(), { message: "an unmatched draft restores the previous selection on blur" }).toBe("Apple");
    assert.deepEqual(await page.evaluate(() => (window as unknown as { changes: unknown[] }).changes), [], "restoring a draft is not a new selection");
    await input.fill("");
    await page.locator("#after").focus();
    await expect.poll(() => input.inputValue(), { message: "an empty draft also restores the selection; Clear is a separate action" }).toBe("Apple");
    await input.fill("zz");
    await input.press("Tab");
    await expect.poll(() => input.inputValue(), { message: "keyboard focus departure restores an unmatched draft too" }).toBe("Apple");
    await input.fill("pea");
    await page.locator('#fruit [role="option"]').getByText("Pear").click();
    await expect.poll(() => input.inputValue()).toBe("Pear");
    assert.deepEqual(await page.evaluate(() => (window as unknown as { changes: { kind: string; value: string }[] }).changes.map(({ kind, value }) => ({ kind, value }))), [{ kind: "selection", value: "pear" }]);
    await page.close();
  });
});
