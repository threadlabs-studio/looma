import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Combobox option detail", () => {
  // A row's description and tag describe it: the label stays its name, what filtering matches, and what
  // a choice commits; a row with neither keeps its name from its content, as before.
  const check = async (page: Page) => {
    const input = page.locator('#people input[role="combobox"]');
    await input.waitFor();
    await input.press("ArrowDown");
    const riley = page.getByRole("option", { name: "Riley Kim", exact: true });
    const description = (option: typeof riley) => option.evaluate((element) =>
      (element.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean)
        .map((id) => (element.getRootNode() as Document).getElementById(id)?.textContent?.trim()).join(", "));
    assert.equal(await description(riley), "Contact, Harbor Supply Co.");
    const tone = (option: typeof riley) => option.locator(':is([component~="ui-badge"], [data-component~="ui-badge"], .ui-badge, [ui-badge])').getAttribute("data-ui-badge-state");
    assert.match(await tone(riley) ?? "", /\btone=neutral\b/, "an untoned tag is neutral");
    const sam = page.getByRole("option", { name: "Sam Ortiz", exact: true });
    assert.equal(await description(sam), "Harbor Supply Co.");
    await expect.poll(() => sam.locator(':is([component~="ui-badge"], [data-component~="ui-badge"], .ui-badge, [ui-badge])').count()).toBe(0);
    const harbor = page.getByRole("option", { name: "Harbor Supply Co.", exact: true });
    assert.equal(await description(harbor), "Inactive");
    assert.match(await tone(harbor) ?? "", /\btone=warning\b/);
    // A tag colour reaches the tag's badge as its colour hook.
    const northwind = page.getByRole("option", { name: "Northwind Traders", exact: true });
    const hook = (option: typeof riley) => option.locator(':is([component~="ui-badge"], [data-component~="ui-badge"], .ui-badge, [ui-badge])').evaluate((badge) => getComputedStyle(badge).getPropertyValue("--ui-badge-color").trim());
    assert.equal(await hook(northwind), "teal");
    assert.equal(await hook(harbor), "", "an uncoloured tag sets no colour");
    // A plain row renders as it always has.
    const plain = page.getByRole("option", { name: "Pat Lee", exact: true });
    assert.deepEqual(await plain.evaluate((element) => [element.getAttribute("aria-labelledby"), element.getAttribute("aria-describedby"),
      Array.from(element.children, (child) => child.className)]), [null, null, ["primary"]]);
    // Filtering matches labels only: Riley and Sam work at Harbor, but only the business is suggested.
    await input.fill("harbor");
    assert.deepEqual(await page.locator('#people [role="option"]').evaluateAll((all) => all.map((option) => option.querySelector(".primary")?.textContent)),
      ["Harbor Supply Co."]);
    await input.fill("northwind");
    await northwind.click();
    assert.deepEqual((await page.evaluate(() => (window as unknown as { changes: any[] }).changes.at(-1))).option.tag, { label: "Business", color: "teal" });
    await input.fill("riley");
    await riley.click();
    await expect.poll(() => input.inputValue()).toBe("Riley Kim");
    const choice = await page.evaluate(() => (window as unknown as { changes: any[] }).changes.at(-1));
    assert.deepEqual(choice.option, { id: "riley", value: "riley", label: "Riley Kim", group: "People", disabled: false, description: "Harbor Supply Co.", tag: { label: "Contact" } });
  };

  it("names each option by its label and describes it by its tag and description in HTML", async () => {
    const path = await bundle("html-combobox-option-detail", `
      import "@looma-test/runtime";
      window.changes = [];
      document.addEventListener("value-change", (event) => window.changes.push(event.detail));
    `);
    const page = await open(path, `
      <ui-combobox id="people" label="Directory">
        <optgroup label="People">
          <option value="riley" data-description="Harbor Supply Co." data-tag="Contact">Riley Kim</option>
          <option value="sam" data-description="Harbor Supply Co.">Sam Ortiz</option>
          <option value="pat">Pat Lee</option>
        </optgroup>
        <optgroup label="Businesses">
          <option value="harbor" data-tag="Inactive" data-tag-tone="warning">Harbor Supply Co.</option>
          <option value="northwind" data-tag="Business" data-tag-color="teal">Northwind Traders</option>
        </optgroup>
      </ui-combobox>
    `, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });

  it("names each option by its label and describes it by its tag and description in converted output", async () => {
    const path = await bundle("converted-combobox-option-detail", `
      import { createScene, sceneNode } from "@looma-test/scene";
      import { UiCombobox as Combobox } from "@looma-test/components";
      window.changes = [];
      createScene({
        render: () => sceneNode(Combobox, { id: "people", label: "Directory", onValueChange: (event) => window.changes.push(event.detail) }, () => [
          sceneNode("optgroup", { label: "People" }, [
            sceneNode("option", { value: "riley", "data-description": "Harbor Supply Co.", "data-tag": "Contact" }, "Riley Kim"),
            sceneNode("option", { value: "sam", "data-description": "Harbor Supply Co." }, "Sam Ortiz"),
            sceneNode("option", { value: "pat" }, "Pat Lee"),
          ]),
          sceneNode("optgroup", { label: "Businesses" }, [
            sceneNode("option", { value: "harbor", "data-tag": "Inactive", "data-tag-tone": "warning" }, "Harbor Supply Co."),
            sceneNode("option", { value: "northwind", "data-tag": "Business", "data-tag-color": "teal" }, "Northwind Traders"),
          ]),
        ]),
      }).mount("#app");
    `);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    await check(page);
    await page.close();
  });
});
