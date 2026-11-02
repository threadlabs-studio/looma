import { expect } from "../renderers/test-context";
import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Meter categorical distribution", () => {
  it("keeps proportional geometry and descriptions in HTML and converted at phone width", async () => {
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-distribution`, adapter === "html" ? `import "@looma-test/runtime";` : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiMeter as Meter } from "@looma-test/components";
        createScene({ render: () => sceneNode(Meter, { variant: "distribution", label: "Outcomes", valueText: "2 waiting, 5 accepted, 2 declined",
          parts: [{value:2,color:"#789168"},{value:5,color:"#b97731"},{value:2,color:"#533b29"},{value:0,color:"red"}] }) }).mount("#app");`);
      const page = await open(path, adapter === "html" ? `<ui-meter variant="distribution" label="Outcomes" value-text="2 waiting, 5 accepted, 2 declined" parts='[{"value":2,"color":"#789168"},{"value":5,"color":"#b97731"},{"value":2,"color":"#533b29"},{"value":0,"color":"red"}]'></ui-meter>` : '<div id="app"></div>',
        [join(root, "tokens.css"), join(root, "theme-light.css")], { viewport: {width:375,height:700} });
      const distribution = page.getByRole("img", {name:"Outcomes: 2 waiting, 5 accepted, 2 declined"});
      const widths = await distribution.locator(".part").evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().width));
      assert.equal(widths.length, 3);
      assert.ok(Math.abs(widths[1] / widths[0] - 2.5) < 0.02, JSON.stringify({adapter, widths, root: await distribution.evaluate(node => ({html:node.outerHTML,display:getComputedStyle(node).display}))}));
      assert.ok(Math.abs(widths[2] - widths[0]) < 0.1);
      await expect.poll(() => distribution.getAttribute("aria-valuenow")).toBe(null);
      await page.emulateMedia({forcedColors:"active"});
      assert.equal(await distribution.locator(".part").first().evaluate(node => getComputedStyle(node).outlineStyle), "solid");
      await page.close();
    }
  });
});
