import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Combobox validation message", () => {
  it("shows its validation message in HTML, not only in converted output", async () => {
    const path = await bundle("html-combobox-validation", `import "@looma-test/runtime";`);
    const page = await open(path, `<ui-combobox id="fruit" label="Fruit" required></ui-combobox>`, [join(root, "tokens.css")]);
    await page.waitForSelector('#fruit:is([component~="ui-combobox"], [data-component~="ui-combobox"], .ui-combobox, [ui-combobox])');
    assert.equal(await page.locator('#fruit input[role="combobox"]').evaluate((input) => {
      (input as HTMLInputElement).focus();
      return input.ownerDocument.activeElement === input;
    }), true);
    const validation = await page.locator("#fruit").evaluate((element) => new Promise<{ status: string }>((resolve) => {
      const onValidation = (event: Event) => {
        const detail = (event as CustomEvent<{ status: string }>).detail;
        if (detail.status === "pending") return;
        element.removeEventListener("validation-change", onValidation);
        resolve(detail);
      };
      element.addEventListener("validation-change", onValidation);
      element.dispatchEvent(new CommandEvent("command", { command: "--validate" }));
    }));
    assert.equal(validation.status, "error");
    const message = page.locator("#fruit [id$=\"-validation\"]");
    await message.waitFor({ state: "visible" });
    assert.match((await message.textContent()) ?? "", /A value is required/);
    await page.close();
  });
});
