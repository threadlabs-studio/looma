import assert from "node:assert/strict";
import { join } from "node:path";
import { it } from "vitest";
import { createHydratedScene, sceneNode, renderSceneToString } from "@looma-test/scene";
import { UiEditorTableContextMenu as Menu } from "@looma-test/components";
import { root, bundle, open } from "./renderers/browser-driver";

it("keeps an opening table menu hidden until its actions are rendered", async () => {
  const actions = ["background-none", "background-yellow", "add-row-after", "delete-table"];
  const html = await renderSceneToString(createHydratedScene({ render: () => sceneNode(Menu, { id: "menu", open: true, actions }) }));
  const path = await bundle("table-menu-hydration", `
    import { createHydratedScene, sceneNode } from "@looma-test/scene";
    import { UiEditorTableContextMenu as Menu } from "@looma-test/components";
    createHydratedScene({ render: () => sceneNode(Menu, { id: "menu", open: true, actions: ${JSON.stringify(actions)} }) }).mount("#app");
  `);
  const page = await open(path, `<div id="app">${html}</div>`, [join(root, "tokens.css")], {}, undefined, async page => {
    assert.equal(await page.locator("#menu").count(), 1, "the server preserves the menu identity");
    assert.equal(await page.locator("#menu").isVisible(), false, "the server shell stays hidden before controller connection");
  });
  try {
    await page.locator("#menu").waitFor({ state: "visible" });
    assert.ok((await page.locator("#menu").textContent())?.includes("Cell background"));
    assert.ok((await page.locator("#menu").textContent())?.includes("Structure"));
    assert.equal(await page.locator("#menu").evaluate(element => element.matches(":popover-open")), true);
  } finally { await page.close(); }
});
