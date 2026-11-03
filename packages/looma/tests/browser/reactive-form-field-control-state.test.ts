import { expect } from "../renderers/test-context";

import { describe, it } from "vitest";

import { bundle, open } from "../renderers/browser-driver";

describe("Reactive form-field control state", () => {
  for (const adapter of ["HTML", "Converted"] as const) {
    it(`updates disabled, required and invalid on a nested textarea in ${adapter}`, async () => {
      const path = await bundle(`form-field-state-${adapter}`, adapter === "HTML" ? `
        import "@looma-test/runtime";
        import { componentRegistry } from "@nextwebwg/html-next/runtime";
        window.updateField = value => componentRegistry.update(document.querySelector("#field"), value);
        window.addControl = () => document.querySelector("#control-slot").innerHTML = '<textarea id="message"></textarea>';
      ` : `
        import { createScene, sceneNode, createState } from "@looma-test/scene";
        import { UiFormField as FormField, UiInputGroup as InputGroup, UiTextarea as Textarea } from "@looma-test/components";
        const state = createState({ disabled: true, required: true, invalid: true }), visible = createState(false);
        window.updateField = value => { state.value = value; };
        window.addControl = () => { visible.value = true; };
        createScene({ render: () => sceneNode(FormField, { id: "field", ...state.value }, {
          label: () => sceneNode("label", { for: "message" }, "Message"),
          default: () => sceneNode(InputGroup, { multiline: true }, () => visible.value ? sceneNode(Textarea, { id: "message", rows: 3 }) : null),
        }) }).mount("#app");
      `);
      const page = await open(path, adapter === "HTML" ? `
        <ui-form-field id="field" disabled required invalid>
          <label slot="label" for="message">Message</label>
          <ui-input-group multiline><div id="control-slot"></div></ui-input-group>
        </ui-form-field>` : '<div id="app"></div>', []);
      try {
        await page.evaluate(() => (window as unknown as { addControl: () => void }).addControl());
        for (const state of [
          { disabled: true, required: true, invalid: true },
          { disabled: false, required: true, invalid: true },
          { disabled: false, required: false, invalid: true },
          { disabled: false, required: false, invalid: false },
          { disabled: true, required: true, invalid: true },
          { disabled: false, required: false, invalid: false },
        ]) {
          await page.evaluate(state => (window as unknown as { updateField: (value: object) => void }).updateField(state), state);
          await page.waitForFunction(state => {
            const control = document.querySelector<HTMLTextAreaElement>("#message");
            return control?.disabled === state.disabled && control.required === state.required && control.getAttribute("aria-invalid") === String(state.invalid);
          }, state, { timeout: 2_000 });
        }
        await page.getByRole("textbox", { name: "Message" }).fill("The field is editable again.");
        await expect.poll(() => page.locator("#message").inputValue()).toBe("The field is editable again.");
      } finally { await page.close(); }
    });
  }
});
