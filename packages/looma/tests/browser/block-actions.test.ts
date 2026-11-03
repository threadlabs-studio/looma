import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Block actions", () => {
  for (const target of ["html", "converted"] as const) {
    it(`requests the chosen block action (${target})`, async () => {
      const path = target === "html"
        ? await bundle("html-block-actions", `
            import "@looma-test/runtime";
            window.fixtureEvents = [];
            const menu = document.querySelector("#actions");
            menu.addEventListener("action", (event) => window.fixtureEvents.push(["action", event.detail]));
          `)
        : await bundle("converted-block-actions", `
            import { createScene, sceneNode } from "@looma-test/scene";
            import { UiIconButton as IconButton } from "@looma-test/components";
            import { UiEditorBlockActions as EditorBlockActions } from "@looma-test/components";
            window.fixtureEvents = [];
            const record = (name) => (event) => window.fixtureEvents.push([name, event.detail]);
            createScene({ render: () => [
              sceneNode(IconButton, { id: "trigger", label: "Block actions" }, () => "…"),
              sceneNode(EditorBlockActions, { for: "trigger", onAction: record("action") }),
            ] }).mount("#app");
          `);
      const page = await open(path, target === "html"
        ? `<ui-icon-button id="trigger" label="Block actions">…</ui-icon-button><ui-editor-block-actions id="actions" for="trigger"></ui-editor-block-actions>`
        : `<div id="app"></div>`, [join(root, "tokens.css")]);
      const events = () => page.evaluate(() => (window as unknown as { fixtureEvents: [string, unknown][] }).fixtureEvents);
      await page.getByRole("button", { name: "Block actions", exact: true }).click();
      await page.getByRole("menuitem", { name: "Duplicate block", exact: true }).click();
      assert.deepEqual(await events(), [["action", { action: "duplicate" }]]);
      await page.close();
    });
  }
});
