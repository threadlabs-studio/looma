import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Link form", () => {
  for (const target of ["html", "converted"] as const) {
    it(`reports field changes, choices, save, and dismiss, and moves through results by keyboard (${target})`, async () => {
      const results = [{ id: "one", label: "Guide", detail: "Personal / Guides" }, { id: "two", label: "Guide to tables" }];
      const path = target === "html"
        ? await bundle("html-link-form", `
            import "@looma-test/runtime";
            window.fixtureEvents = [];
            for (const form of document.querySelectorAll("#address, #search")) {
              for (const name of ["destination", "text", "new-tab", "choose", "clear", "save", "dismiss"]) form.addEventListener(name, (event) => window.fixtureEvents.push([form.id, name, event.detail]));
            }
          `)
        : await bundle("converted-link-form", `
            import { createScene, sceneNode } from "@looma-test/scene";
            import { UiEditorLinkForm as EditorLinkForm } from "@looma-test/components";
            window.fixtureEvents = [];
            const on = (id) => Object.fromEntries(["destination", "text", "new-tab", "choose", "clear", "save", "dismiss"].map((name) => [
              "on" + name.replace(/(^|-)(\\w)/g, (_, __, letter) => letter.toUpperCase()), (event) => window.fixtureEvents.push([id, name, event.detail]),
            ]));
            createScene({ render: () => [
              sceneNode(EditorLinkForm, { id: "address", existing: true, value: "https://example.com", newTab: true, ...on("address") }),
              sceneNode(EditorLinkForm, { id: "search", searchable: true, mode: "target", value: "Guide", textEditable: true, results: ${JSON.stringify(results)}, selected: "two", ...on("search") }),
            ] }).mount("#app");
          `);
      const page = await open(path, target === "html"
        ? `<ui-editor-link-form id="address" existing value="https://example.com" new-tab></ui-editor-link-form>
           <ui-editor-link-form id="search" searchable mode="target" value="Guide" text-editable selected="two" results='${JSON.stringify(results)}'></ui-editor-link-form>`
        : `<div id="app"></div>`, [join(root, "tokens.css")]);
      const events = () => page.evaluate(() => (window as unknown as { fixtureEvents: unknown[] }).fixtureEvents);
      const address = page.locator("#address");
      const search = page.locator("#search");
      await address.getByRole("heading", { name: "Edit link" }).waitFor();
      await expect.poll(() => search.getByRole("heading").textContent()).toBe("Add link");
      await address.getByRole("textbox", { name: "URL", exact: true }).fill("https://example.com/guide");
      await address.getByRole("checkbox", { name: "Open in new tab" }).click();
      await address.getByRole("textbox", { name: "URL", exact: true }).press("Enter");
      await address.getByRole("textbox", { name: "URL", exact: true }).press("Escape");
      assert.deepEqual(await events(), [
        ["address", "destination", { value: "https://example.com/guide" }],
        ["address", "new-tab", { newTab: false }],
        ["address", "save", {}],
        ["address", "dismiss", {}],
      ]);

      const field = search.getByRole("searchbox", { name: "Link destination" });
      const rows = search.getByLabel("Destination search results").getByRole("button");
      await expect.poll(() => rows.count()).toBe(2);
      await expect.poll(() => rows.nth(1).getAttribute("aria-current"), { message: "the chosen result is marked" }).toBe("true");
      await field.press("ArrowDown");
      assert.equal(await rows.first().evaluate((row) => row === document.activeElement), true);
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowUp");
      await page.keyboard.press("ArrowUp");
      assert.equal(await field.evaluate((input) => input === document.activeElement), true, "ArrowUp from the first result returns to the field");
      await field.press("ArrowDown");
      await page.keyboard.press("Enter");
      await search.getByRole("textbox", { name: "Text", exact: true }).fill("Read the guide");
      await search.getByRole("button", { name: "Clear search" }).click();
      assert.equal(await field.evaluate((input) => input === document.activeElement), true, "Clear search returns to the field");
      assert.deepEqual((await events()).slice(4), [
        ["search", "choose", { id: "one" }],
        ["search", "text", { text: "Read the guide" }],
        ["search", "clear", {}],
      ]);
      await page.close();
    });
  }
});
