import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Keyboard item reveal", () => {
  const kinds = ["slash", "mention", "combobox", "listbox", "menu", "context", "search", "links"] as const;
  type Kind = typeof kinds[number];
  const paths = new Map<string, Promise<string>>();
  const labels = Array.from({ length: 20 }, (_, index) => `Item ${index + 1}`);
  const properties = (kind: Kind) => ({
    ...(["slash", "mention", "menu", "context", "search"].includes(kind) ? { open: true } : {}),
    ...(["slash", "mention"].includes(kind) ? { anchorRect: { left: 40, right: 60, top: 20, bottom: 40, width: 20, height: 20 }, selectedIndex: 0,
      items: labels.map((label, index) => kind === "slash" ? { value: String(index), title: label, description: "Command details", icon: "file-text" } : { id: String(index), label, detail: "Person details" }) } : {}),
    ...(kind === "combobox" ? { label: "Choices", filter: "none", openOnFocus: true } : {}),
    ...(kind === "listbox" ? { rows: 3 } : {}),
    ...(kind === "menu" ? { inline: true } : {}),
    ...(kind === "context" ? { for: "trigger" } : {}),
    ...(kind === "search" ? { label: "Results" } : {}),
    ...(kind === "links" ? { searchable: true, mode: "target", results: labels.map((label, index) => ({ id: String(index), label })) } : {}),
  });
  const fixtureBundle = (adapter: "HTML" | "Converted") => {
    if (!paths.has(adapter)) paths.set(adapter, bundle(`keyboard-reveal-${adapter}`, adapter === "HTML" ? `
      import "@looma-test/runtime";
      import { componentRegistry } from "@nextwebwg/html-next/runtime";
      window.configure = props => componentRegistry.update(document.querySelector('#fixture'), props);
    ` : `
      import { createScene, sceneNode, createState } from "@looma-test/scene";
      import { UiCombobox as Combobox, UiListbox as Listbox, UiMenu as Menu, UiMenuItem as MenuItem, UiContextMenu as ContextMenu, UiSearchShell as SearchShell, UiScrollArea as ScrollArea, UiSearchResultRow as SearchResultRow, UiEditorSlashMenu as EditorSlashMenu, UiEditorMentionMenu as EditorMentionMenu, UiEditorLinkForm as EditorLinkForm } from "@looma-test/components";
      const kind = document.querySelector('#app').dataset.kind;
      const props = createState({ id: 'fixture' });
      const labels = Array.from({length:20},(_,index)=>'Item '+(index+1));
      window.configure = update => { props.value = {...props.value,...update}; };
      const component = {slash:EditorSlashMenu,mention:EditorMentionMenu,combobox:Combobox,listbox:Listbox,menu:Menu,context:ContextMenu,search:SearchShell,links:EditorLinkForm}[kind];
      const choices = () => labels.map((label,index)=>sceneNode('option',{value:String(index)},label));
      const actions = () => labels.map((label,index)=>sceneNode(MenuItem,{value:String(index)},()=>label));
      const slots = kind === 'combobox' || kind === 'listbox' ? {default:choices}
        : kind === 'menu' || kind === 'context' ? {default:actions}
        : kind === 'search' ? {search:()=>sceneNode('input',{'aria-label':'Find'}),body:()=>sceneNode(ScrollArea,{style:{height:'160px'}},()=>labels.map((label,index)=>sceneNode(SearchResultRow,{selected:index===0},{title:()=>label})))} : {};
      createScene({render:()=>sceneNode(component,props.value,slots)}).mount('#app');
    `));
    return paths.get(adapter)!;
  };
  const markup = (kind: Kind) => {
    const tag = { slash: "ui-editor-slash-menu", mention: "ui-editor-mention-menu", combobox: "ui-combobox", listbox: "ui-listbox", menu: "ui-menu", context: "ui-context-menu", search: "ui-search-shell", links: "ui-editor-link-form" }[kind];
    const content = kind === "combobox" || kind === "listbox" ? labels.map((label, index) => `<option value="${index}">${label}</option>`).join("")
      : kind === "menu" || kind === "context" ? labels.map((label, index) => `<ui-menu-item value="${index}">${label}</ui-menu-item>`).join("")
        : kind === "search" ? `<input slot="search" aria-label="Find"><ui-scroll-area slot="body" style="height:160px">${labels.map((label, index) => `<ui-search-result-row ${index === 0 ? "selected" : ""}><span slot="title">${label}</span></ui-search-result-row>`).join("")}</ui-scroll-area>` : "";
    return `<${tag} id="fixture">${content}</${tag}>`;
  };
  const viewport = (kind: Kind) => ({ slash: "#fixture .list", mention: "#fixture .list", combobox: "#fixture .popup",
    listbox: '#fixture :is([component~="ui-scroll-area"], [data-component~="ui-scroll-area"], .ui-scroll-area, [ui-scroll-area])', menu: "#fixture .surface", context: '#fixture [role="menu"]',
    search: '#fixture .body :is([component~="ui-scroll-area"], [data-component~="ui-scroll-area"], .ui-scroll-area, [ui-scroll-area])', links: '#fixture [aria-label="Destination search results"]' })[kind];

  for (const adapter of ["HTML", "Converted"] as const) {
    it(`honors reduced motion and retargets or cancels pending reveals in ${adapter}`, async () => {
      const page = await open(await fixtureBundle(adapter), adapter === "HTML" ? markup("slash") : '<div id="app" data-kind="slash"></div>',
        [join(root, "tokens.css")], { viewport: { width: 960, height: 360 }, reducedMotion: "reduce" });
      try {
        await page.evaluate(props => (window as any).configure(props), properties("slash"));
        const port = page.locator(viewport("slash"));
        await port.waitFor({state: "visible"});
        await page.evaluate(async () => {
          (window as any).configure({selectedIndex: 19});
          await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        });
        assert.ok(await port.evaluate(element => element.scrollTop > 0), "reduced motion reveals without animation");
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await page.evaluate(() => (window as any).configure({selectedIndex: 0}));
        await page.waitForTimeout(40);
        await page.evaluate(() => (window as any).configure({selectedIndex: 10}));
        await page.waitForTimeout(180);
        assert.equal(await port.locator('[aria-selected="true"]').evaluate(element => {
          const row = element.getBoundingClientRect(), port = element.parentElement!.getBoundingClientRect();
          return row.top >= port.top && row.bottom <= port.bottom;
        }), true, "the latest keyboard target wins during an animation");
        await page.evaluate(() => (window as any).configure({selectedIndex: 19}));
        await page.waitForTimeout(35);
        await page.evaluate(() => (window as any).configure({items: []}));
        await page.locator("#fixture").waitFor({state: "hidden"});
        await page.waitForTimeout(25);
        const stopped = await port.evaluate(element => element.scrollTop);
        await page.waitForTimeout(150);
        assert.equal(await port.evaluate(element => element.scrollTop), stopped, "closing cancels pending scroll work");
      } finally { await page.close(); }
    });
    for (const kind of kinds) {
      it(`quickly reveals keyboard-selected ${kind} items without scrolling the page in ${adapter}`, async () => {
        const path = await fixtureBundle(adapter);
        const page = await open(path, `<button id="trigger">Actions</button>${adapter === "HTML" ? markup(kind) : `<div id="app" data-kind="${kind}"></div>`}<div style="height:1500px"></div>`,
          [join(root, "tokens.css")], { viewport: { width: 960, height: 360 }, reducedMotion: "no-preference" });
        try {
          await page.evaluate(props => (window as unknown as { configure: (value: unknown) => void }).configure(props), properties(kind));
          if (["menu", "context"].includes(kind)) await page.addStyleTag({ content: "#fixture .surface, #fixture [role=menu] { max-height: 160px; }" });
          const input = page.locator(kind === "combobox" ? '#fixture input[role="combobox"]' : kind === "search" ? '#fixture input' : kind === "links" ? '#fixture [data-link-search]' : kind === "listbox" ? '#fixture' : '#fixture [role="menuitem"]');
          if (!["slash", "mention"].includes(kind)) {
            await input.first().focus();
            if (kind === "combobox") await page.keyboard.press("ArrowDown");
            if (kind === "links") {
              await page.keyboard.press("ArrowDown");
              await page.locator('#fixture [data-link-result]').nth(18).focus();
            }
          }
          const port = page.locator(viewport(kind));
          await port.waitFor({ state: "visible" });
          await port.evaluate(element => { element.scrollTop = 0; });
          if (["slash", "mention"].includes(kind)) await port.locator('[role="option"]').first().hover();
          const before = await page.evaluate(() => window.scrollY);
          await port.evaluate(element => {
            const sample = { positions: [element.scrollTop], running: true };
            (window as unknown as { revealSamples: typeof sample }).revealSamples = sample;
            const frame = () => { sample.positions.push(element.scrollTop); if (sample.running) requestAnimationFrame(frame); };
            requestAnimationFrame(frame);
          });
          if (["slash", "mention"].includes(kind)) await page.evaluate(() => (window as unknown as { configure: (value: unknown) => void }).configure({ selectedIndex: 19 }));
          else await page.keyboard.press(kind === "links" ? "ArrowDown" : "End");
          const target = page.getByRole(kind === "menu" || kind === "context" ? "menuitem" : kind === "search" || kind === "links" ? "button" : "option").filter({ hasText: "Item 20" }).last();
          await page.waitForFunction(({ selector, text }) => {
            const port = document.querySelector(selector)!;
            const item = [...port.querySelectorAll('[role="option"], [role^="menuitem"], button')].find(element => element.textContent?.includes(text));
            if (!item) return false;
            const p = port.getBoundingClientRect(), r = item.getBoundingClientRect();
            return r.top >= p.top - 1 && r.bottom <= p.bottom + 1;
          }, { selector: viewport(kind), text: "Item 20" }, { timeout: 3000 });
          await page.waitForTimeout(180);
          const sample = await port.evaluate(element => {
            const sample = (window as unknown as { revealSamples: { running: boolean; positions: number[] } }).revealSamples;
            sample.running = false;
            return { final: element.scrollTop, positions: sample.positions };
          });
          assert.ok(sample.final > 0, "the menu, rather than the outer page, scrolls");
          assert.ok(sample.positions.some(position => position > 0 && position < sample.final - 1), "normal-motion reveal has intermediate frames rather than an instant jump");
          assert.equal(await page.evaluate(() => window.scrollY), before, "the document keeps its reading position");
          await expect.poll(() => target.count()).toBe(1);
          if (["slash", "mention"].includes(kind)) await expect.poll(() => target.getAttribute("aria-selected"), { message: "scrolling beneath a stationary pointer keeps the keyboard selection" }).toBe("true");
        } finally { await page.close(); }
      });
    }
  }
});
