import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("converted editor entry point", () => {
  it("renders authored mention rows from the editor entry alone", async () => {
    const path = await bundle("converted-editor-mention-rows", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiEditorMentionMenuItem as EditorMentionMenuItem } from "@looma-test/components";
      createScene({ render: () => sceneNode("ul", { role: "listbox" }, [sceneNode(EditorMentionMenuItem, { id: "ada", value: "ada", initials: "AL", detail: "ada@example.com" }, () => "Ada Lovelace")]) }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await page.waitForSelector("#ada");
    await expect.poll(() => page.locator("#ada").getAttribute("role")).toBe("option");
    assert.match(await page.locator("#ada").innerText(), /Ada Lovelace\s+ada@example.com/);
    await page.close();
  });
});
