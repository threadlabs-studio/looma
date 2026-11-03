import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Code language", () => {
  for (const target of ["html", "converted"] as const) {
    it(`lists the languages and reports a chosen one (${target})`, async () => {
      const languages = [{ value: "auto", label: "Auto" }, { value: "css", label: "CSS" }, { value: "javascript", label: "JAVASCRIPT" }];
      const path = target === "html"
        ? await bundle("html-code-language", `
            import "@looma-test/runtime";
            window.fixtureEvents = [];
            document.querySelector("#picker").addEventListener("language", (event) => window.fixtureEvents.push(event.detail));
          `)
        : await bundle("converted-code-language", `
            import { createScene, sceneNode } from "@looma-test/scene";
            import { UiEditorCodeLanguage as EditorCodeLanguage } from "@looma-test/components";
            window.fixtureEvents = [];
            createScene({ render: () => sceneNode(EditorCodeLanguage, {
              value: "javascript", languages: ${JSON.stringify(languages)}, onLanguage: (event) => window.fixtureEvents.push(event.detail),
            }) }).mount("#app");
          `);
      const page = await open(path, target === "html"
        ? `<ui-editor-code-language id="picker" value="javascript" languages='${JSON.stringify(languages)}'></ui-editor-code-language>`
        : `<div id="app"></div>`, [join(root, "tokens.css")]);
      const input = page.getByRole("combobox", { name: "Code language" });
      await input.waitFor();
      await expect.poll(() => input.inputValue()).toBe("JAVASCRIPT");
      await input.fill("cs");
      assert.deepEqual(await page.evaluate(() => (window as unknown as { fixtureEvents: unknown[] }).fixtureEvents), [], "typing a filter chooses nothing");
      await page.getByRole("option", { name: "CSS", exact: true }).click();
      assert.deepEqual(await page.evaluate(() => (window as unknown as { fixtureEvents: unknown[] }).fixtureEvents), [{ value: "css" }]);
      await page.close();
    });
  }
});
