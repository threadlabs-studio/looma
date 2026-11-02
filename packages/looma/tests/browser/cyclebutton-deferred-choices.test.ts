import { expect } from "../renderers/test-context";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("CycleButton deferred choices", () => {
  for (const adapter of ["HTML", "Converted"] as const) it(`waits for choices and accepts localized hints in ${adapter}`, async () => {
    const items = [{value:"light",label:"Clair",icon:"sun"},{value:"dark",label:"Sombre",icon:"moon"}];
    const path = await bundle(`cycle-deferred-${adapter}`, adapter === "HTML" ? `
      import "@looma-test/runtime"; import {componentRegistry} from "@nextwebwg/html-next/runtime";
      window.fillChoices=(empty=false)=>componentRegistry.update(document.getElementById("cycle"),{items:empty?[]:${JSON.stringify(items)}});
    ` : `
      import {createScene,sceneNode,createState} from "@looma-test/scene"; import {UiCycleButton as CycleButton} from "@looma-test/components";
      const items=createState(null); window.fillChoices=(empty=false)=>items.value=empty?[]:${JSON.stringify(items)};
      createScene({render:()=>sceneNode(CycleButton,{id:"cycle",label:"Apparence",description:"Choisir l’état suivant",emptyLabel:"Aucun choix",items:items.value})}).mount("#app");
    `);
    const page = await open(path, adapter === "HTML" ? '<ui-cycle-button id="cycle" label="Apparence" description="Choisir l’état suivant" empty-label="Aucun choix"></ui-cycle-button>' : '<div id="app"></div>', [join(root,"tokens.css")]);
    try {
      await page.evaluate(() => (window as unknown as {fillChoices(empty:boolean):void}).fillChoices(true));
      const button = page.locator("#cycle button");
      await expect.poll(() => button.isDisabled()).toBe(true);
      await expect.poll(() => button.getAttribute("aria-label")).toBe("Apparence: Aucun choix");
      await expect.poll(() => button.getAttribute("aria-description")).toBe("Choisir l’état suivant");
      await page.evaluate(() => (window as unknown as {fillChoices():void}).fillChoices());
      await page.waitForFunction(() => document.querySelector("#cycle button")?.getAttribute("aria-label") === "Apparence: Clair");
      await button.press("Enter");
      await expect.poll(() => button.getAttribute("aria-label")).toBe("Apparence: Sombre");
    } finally { await page.close(); }
  });
});
