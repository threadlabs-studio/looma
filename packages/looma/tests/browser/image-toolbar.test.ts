import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Image toolbar", () => {
  for (const target of ["html", "converted"] as const) {
    it(`requests placement, description, and deletion, and cancels a description draft (${target})`, async () => {
      const path = target === "html"
        ? await bundle("html-image-toolbar", `
            import "@looma-test/runtime";
            window.fixtureEvents = [];
            const bar = document.querySelector("#bar");
            for (const name of ["placement", "describe", "delete"]) bar.addEventListener(name, (event) => window.fixtureEvents.push([name, event.detail]));
          `)
        : await bundle("converted-image-toolbar", `
            import { createScene, sceneNode, createState } from "@looma-test/scene";
            import { UiEditorImageToolbar as EditorImageToolbar } from "@looma-test/components";
            window.fixtureEvents = [];
            const target = createState("one");
            window.fixtureSetTarget = (value) => { target.value = value; };
            const record = (name) => (event) => window.fixtureEvents.push([name, event.detail]);
            createScene({ render: () => sceneNode(EditorImageToolbar, {
              placement: "center", alt: "Lake", target: target.value,
              onPlacement: record("placement"), onDescribe: record("describe"), onDelete: record("delete"),
            }) }).mount("#app");
          `);
      const page = await open(path, target === "html"
        ? `<ui-editor-image-toolbar id="bar" placement="center" alt="Lake" target="one"></ui-editor-image-toolbar>`
        : `<div id="app"></div>`, [join(root, "tokens.css")]);
      const events = () => page.evaluate(() => (window as unknown as { fixtureEvents: unknown[] }).fixtureEvents);
      const actions = page.getByRole("toolbar", { name: "Image actions" });
      await actions.waitFor();
      await expect.poll(() => actions.getByRole("button", { name: "Center image", exact: true }).getAttribute("aria-pressed")).toBe("true");
      await actions.getByRole("button", { name: "Wrap text to the right", exact: true }).click();
      await actions.getByRole("button", { name: "Delete image", exact: true }).click();
      assert.deepEqual(await events(), [["placement", { placement: "wrap-left" }], ["delete", {}]]);

      const form = page.getByRole("form", { name: "Image description" });
      await actions.getByRole("button", { name: "Image description", exact: true }).click();
      await expect.poll(() => form.getByLabel("Alt text").inputValue()).toBe("Lake");
      await form.getByLabel("Alt text").fill("Calm lake");
      await form.getByRole("button", { name: "Save", exact: true }).click();
      await form.waitFor({ state: "hidden" });
      assert.deepEqual((await events()).at(-1), ["describe", { alt: "Calm lake" }]);

      // The consumer kept "Lake", so the next draft starts there.
      await actions.getByRole("button", { name: "Image description", exact: true }).click();
      await expect.poll(() => form.getByLabel("Alt text").inputValue()).toBe("Lake");
      await form.getByLabel("Alt text").fill("Draft");
      if (target === "converted") {
        // Another image cancels the draft. converted changes the target through its framework prop; on the DOM page a literal attribute
        // sets only the prop's initial value, as the proposal says, so that page cancels instead.
        await page.evaluate(() => (window as unknown as { fixtureSetTarget(value: string): void }).fixtureSetTarget("two"));
        await form.waitFor({ state: "hidden" });
      } else {
        await form.getByRole("button", { name: "Cancel", exact: true }).click();
        await form.waitFor({ state: "hidden" });
      }
      assert.equal((await events()).length, 3, "a cancelled draft requests nothing");
      await page.close();
    });
  }
});
