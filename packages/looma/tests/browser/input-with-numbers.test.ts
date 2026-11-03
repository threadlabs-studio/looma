import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Input with numbers", () => {
  // A number field's model is a number. v-model reads the field as a number, so text the user is
  // still typing that means the model's number (12., 1.0, 1e3, empty) is never written over. Chromium
  // reports "12." as "12", so the check is that nothing writes the field's value while it has focus.
  const spyOnWrites = `
    window.writes = [];
    const value = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    Object.defineProperty(HTMLInputElement.prototype, "value", {
      ...value,
      set(text) {
        if (document.activeElement === this) window.writes.push(text);
        value.set.call(this, text);
      },
    });
  `;
  const numberField = (name: string, binding: string) => bundle(name, `
    import { createScene, sceneNode, createState } from "@looma-test/scene";
    import { UiInput as Input } from "@looma-test/components";
    ${spyOnWrites}
    const amount = createState(12);
    const updates = [];
    window.updates = updates;
    const record = (value) => { updates.push(value); amount.value = value; };
    createScene({
      render: () => sceneNode(Input, { id: "amount", type: "number", "aria-label": "Amount", ${binding} }),
    }).mount("#app");
  `);
  const read = (page: Page) => page.evaluate(() => {
    const { updates, writes } = window as unknown as { updates: unknown[]; writes: string[] };
    return { updates: [...updates], writes: [...writes] };
  });

  const typing = async (page: Page) => {
    const input = page.locator("#amount");
    await expect.poll(() => input.inputValue()).toBe("12");
    await input.click();
    await input.press("ControlOrMeta+a");
    await input.press("Backspace");
    // 12.5, then Backspace leaves "12.", and 8 makes 12.8, not 128 or 812.
    await input.pressSequentially("12.5");
    await input.press("Backspace");
    await input.pressSequentially("8");
    await expect.poll(() => input.inputValue()).toBe("12.8");
    for (const text of ["1.0", "1e3", "0.50"]) {
      await input.press("ControlOrMeta+a");
      await input.press("Backspace");
      await input.pressSequentially(text);
      await expect.poll(() => input.inputValue()).toBe(text);
    }
    // 1e3 less its 3 is not yet a number, so the field reads as empty; its 1 is 1 again.
    await input.press("ControlOrMeta+a");
    await input.pressSequentially("1e3");
    await input.press("Backspace");
    await input.press("Backspace");
    await expect.poll(() => input.inputValue()).toBe("1");
    await input.press("Backspace");
    await expect.poll(() => input.inputValue()).toBe("");
    return read(page);
  };

  it("reports numbers through v-model and never rewrites the text being typed", async () => {
    const path = await numberField("converted-input-number-model", `value: amount.value, "bind:value": record`);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    const { updates, writes } = await typing(page);
    assert.deepEqual(writes, []);
    // The declared numeric value is null while the field holds no number.
    assert.ok(updates.every((value) => typeof value === "number" || value === null), JSON.stringify(updates));
    for (const value of [12.5, 12.8, 1, 1000, 0.5]) assert.ok(updates.includes(value), `reports ${value}`);
    assert.equal(updates.at(-1), null);
    await page.close();
  });

  it("takes a number value and follows input events without rewriting the text being typed", async () => {
    const path = await numberField("converted-input-number-value", `value: amount.value, onInput: (event) => record(event.target.value === "" ? null : Number(event.target.value))`);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    const { writes } = await typing(page);
    assert.deepEqual(writes, []);
    await page.close();
  });
});
