import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { type Page } from "playwright";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Combobox completion", () => {
  it("optionally clears unfinished multiple queries on blur in HTML and controlled converted", async () => {
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-combobox-query-blur`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode, createState } from "@looma-test/scene";
        import { UiCombobox as Combobox } from "@looma-test/components";
        const query = createState("");
        createScene({ render: () => sceneNode(Combobox, { id: "choices", label: "Teams", multiple: true,
          clearQueryOnBlur: true, openOnFocus: true, disclosure: true, autoHighlight: "single", selectOnTab: true,
          query: query.value, "bind:query": value => query.value = value,
          selectedValues: ["docs"] }, () => [sceneNode("option", { value: "docs" }, "Docs"), sceneNode("option", { value: "design" }, "Design")]) }).mount("#app");`);
      const page = await open(path, `<button id="before">Before</button>` + (adapter === "html" ? `<ui-combobox id="choices" label="Teams" multiple clear-query-on-blur open-on-focus disclosure auto-highlight="single" select-on-tab selected-values='["docs"]'><option value="docs">Docs</option><option value="design">Design</option></ui-combobox>` : `<div id="app"></div>`) + `<button id="after" style="display:block;margin-top:300px">After</button>`, [join(root, "tokens.css")]);
      try {
        const input = page.locator('#choices input[role="combobox"]');
        await input.focus();
        await page.waitForSelector('#choices [role="option"]');
        for (const exit of ["Tab", "Shift+Tab", "pointer", "Escape"]) {
          await input.fill("D");
          if (exit === "pointer") await page.locator("#after").click();
          else if (exit === "Escape") { await input.press("Escape"); await page.locator("#after").click(); }
          else await input.press(exit);
          await page.waitForFunction(() => document.querySelector<HTMLInputElement>('#choices input')?.value === "");
          await expect.poll(() => page.locator('#choices .item').count(), { message: "blur keeps the chosen item" }).toBe(1);
        }
        await input.fill("D");
        await page.locator('#choices [data-combobox-action="disclosure"]').focus();
        await expect.poll(() => input.inputValue(), { message: "focus inside the control keeps unfinished text" }).toBe("D");
        await page.locator("#after").click();
        await input.fill("Unknown");
        await input.press("Enter");
        await expect.poll(() => page.locator('#choices .item').count(), { message: "strict mode cannot create an option" }).toBe(1);
        await page.locator("#after").click();
        await page.waitForFunction(() => document.querySelector<HTMLInputElement>('#choices input')?.value === "");
        await input.fill("Docs");
        await page.waitForFunction(() => Boolean(document.querySelector('#choices input')?.getAttribute('aria-activedescendant')));
        await input.press("Tab");
        await expect.poll(() => page.locator('#choices .item').count(), { message: "Tab keeps an already selected match" }).toBe(1);
        await expect.poll(() => input.inputValue()).toBe("");
      } finally { await page.close(); }
    }
  });

  it("preserves unfinished multiple queries by default and keeps creation opt-in", async () => {
    const path = await bundle("html-combobox-preserve-query", `import "@looma-test/runtime";`);
    const page = await open(path, `<ui-combobox id="choices" label="Teams" multiple><option value="docs">Docs</option></ui-combobox><ui-combobox id="create" label="Create teams" multiple allow-create clear-query-on-blur></ui-combobox><button id="after" style="display:block;margin-top:300px">After</button>`, [join(root, "tokens.css")]);
    try {
      const input = page.locator('#choices input[role="combobox"]');
      await input.fill("Unfinished"); await page.locator("#after").click();
      await expect.poll(() => input.inputValue()).toBe("Unfinished");
      const create = page.locator('#create input[role="combobox"]');
      await page.evaluate(() => {
        document.getElementById("create")!.addEventListener("create-item", event => {
          document.getElementById("after")!.textContent = (event as CustomEvent).detail.query;
        });
      });
      await create.fill("New team");
      await page.waitForSelector('#create [role="option"]');
      await create.press("Enter");
      await expect.poll(() => page.locator('#after').textContent()).toBe("New team");
      await create.fill("Unfinished"); await page.locator("#after").click();
      await page.waitForFunction(() => document.querySelector<HTMLInputElement>('#create input')?.value === "");
      await expect.poll(() => page.locator('#after').textContent(), { message: "blur never creates unfinished text" }).toBe("New team");
    } finally { await page.close(); }
  });

  const check = async (page: Page) => {
    const input = page.locator('#choices input[role="combobox"]');
    await input.fill("Des");
    await page.waitForFunction(() => Boolean(document.querySelector('#choices input')?.getAttribute('aria-activedescendant')));
    await expect.poll(() => page.locator('#choices [role="option"].active').innerText()).toBe("Design");
    await input.press("Tab");
    await expect.poll(() => page.locator('#choices .item').count()).toBe(1);
    await expect.poll(() => input.inputValue()).toBe("");
    assert.equal(await page.locator('#after').evaluate(element => element === document.activeElement), true);
    await input.fill("Des");
    await input.press("Tab");
    await expect.poll(() => page.locator('#choices .item').count(), { message: "completion never toggles off a selected item" }).toBe(1);
    await input.fill("Pla");
    await input.press("Shift+Tab");
    await expect.poll(() => page.locator('#choices .item').count(), { message: "reverse focus does not commit" }).toBe(1);
    await input.fill("D");
    await expect.poll(() => input.getAttribute("aria-activedescendant"), { message: "ambiguous results stay unhighlighted" }).toBe(null);
    await input.press("Tab");
    await expect.poll(() => page.locator('#choices .item').count()).toBe(1);
  };
  it("keeps default multiple completion manual and excludes disabled suggestions", async () => {
    const path = await bundle("html-combobox-completion-default", `import "@looma-test/runtime";`);
    const page = await open(path, `<ui-combobox id="manual" label="Manual" multiple><option value="design">Design</option></ui-combobox><ui-combobox id="disabled" label="Disabled" multiple auto-highlight="single" select-on-tab><option value="design" disabled>Design</option></ui-combobox><button>After</button>`, [join(root, "tokens.css")]);
    try {
      for (const id of ["manual", "disabled"]) {
        const input = page.locator(`#${id} input[role="combobox"]`);
        await input.fill("Des");
        await expect.poll(() => input.getAttribute("aria-activedescendant")).toBe(null);
        await input.press("Tab");
        await expect.poll(() => page.locator(`#${id} .item`).count()).toBe(0);
      }
    } finally { await page.close(); }
  });
  it("highlights a sole authored result and commits Tab in HTML", async () => {
    const path = await bundle("html-combobox-completion", `import "@looma-test/runtime";`);
    const page = await open(path, `<button id="before">Before</button><ui-combobox id="choices" label="Teams" multiple auto-highlight="single" select-on-tab><option value="design">Design</option><option value="docs">Docs</option><option value="platform">Platform</option></ui-combobox><button id="after">After</button>`, [join(root, "tokens.css")]);
    try { await check(page); } finally { await page.close(); }
  });
  it("highlights a sole authored result and commits Tab in controlled converted", async () => {
    const path = await bundle("converted-combobox-completion", `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiCombobox as Combobox } from "@looma-test/components";
      const selected = createState([]);
      createScene({ render: () => sceneNode("div", [sceneNode("button", { id: "before" }, "Before"), sceneNode(Combobox, { id: "choices", label: "Teams", multiple: true, autoHighlight: "single", selectOnTab: true, selectedValues: selected.value, "bind:selectedValues": values => selected.value = values }, () => [["design", "Design"], ["docs", "Docs"], ["platform", "Platform"]].map(([value,label]) => sceneNode("option", {value}, label))), sceneNode("button", {id:"after"}, "After")]) }).mount("#app");`);
    const page = await open(path, `<div id="app"></div>`, [join(root, "tokens.css")]);
    try { await check(page); } finally { await page.close(); }
  });
});
