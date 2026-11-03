import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Link card", () => {
  for (const target of ["html", "converted"] as const) {
    it(`shows the destination, offers Open link only with an address to open, and requests edit and removal (${target})`, async () => {
      const path = target === "html"
        ? await bundle("html-link-card", `
            import "@looma-test/runtime";
            window.fixtureEvents = [];
            for (const card of document.querySelectorAll("#resolved, #unsafe")) {
              for (const name of ["edit", "remove"]) card.addEventListener(name, (event) => window.fixtureEvents.push([card.id, name, event.detail]));
            }
          `)
        : await bundle("converted-link-card", `
            import { createScene, sceneNode } from "@looma-test/scene";
            import { UiEditorLinkCard as EditorLinkCard } from "@looma-test/components";
            window.fixtureEvents = [];
            const record = (id, name) => (event) => window.fixtureEvents.push([id, name, event.detail]);
            createScene({ render: () => [
              sceneNode(EditorLinkCard, { id: "resolved", href: "https://example.com/guide", openHref: "https://example.com/guide", label: "Guide", detail: "Personal / Guides", targetLabel: "Page", onEdit: record("resolved", "edit"), onRemove: record("resolved", "remove") }),
              sceneNode(EditorLinkCard, { id: "unsafe", href: "ftp://files.example.com/archive", onEdit: record("unsafe", "edit"), onRemove: record("unsafe", "remove") }),
            ] }).mount("#app");
          `);
      const page = await open(path, target === "html"
        ? `<ui-editor-link-card id="resolved" href="https://example.com/guide" open-href="https://example.com/guide" label="Guide" detail="Personal / Guides" target-label="Page"></ui-editor-link-card>
           <ui-editor-link-card id="unsafe" href="ftp://files.example.com/archive"></ui-editor-link-card>`
        : `<div id="app"></div>`, [join(root, "tokens.css")]);
      const events = () => page.evaluate(() => (window as unknown as { fixtureEvents: unknown[] }).fixtureEvents);
      const resolved = page.locator("#resolved").getByRole("group", { name: "Link actions", exact: true });
      const unsafe = page.locator("#unsafe").getByRole("group", { name: "Link actions", exact: true });
      await resolved.waitFor();
      assert.equal((await resolved.getByLabel("Page: Guide").innerText()).replace(/\s+/g, " ").trim(), "Guide Personal / Guides");
      await expect.poll(() => resolved.getByRole("link", { name: "Open link", exact: true }).getAttribute("href")).toBe("https://example.com/guide");
      await expect.poll(() => unsafe.getByLabel("URL: ftp://files.example.com/archive").count()).toBe(1);
      await expect.poll(() => unsafe.getByRole("link", { name: "Open link" }).count(), { message: "no open-href, no Open link" }).toBe(0);
      await resolved.getByRole("button", { name: "Edit link", exact: true }).click();
      await unsafe.getByRole("button", { name: "Remove link", exact: true }).click();
      assert.deepEqual(await events(), [["resolved", "edit", {}], ["unsafe", "remove", {}]]);
      await page.close();
    });
  }
});
