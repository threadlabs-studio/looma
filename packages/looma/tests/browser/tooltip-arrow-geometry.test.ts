import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Tooltip arrow geometry", () => {
  it("keeps the arrow symmetric around its tip on every side in HTML and converted", async () => {
    for (const adapter of ["html", "converted"]) {
      const path = await bundle(`${adapter}-tooltip-arrow`, adapter === "html" ? 'import "@looma-test/runtime";' : `
        import { createScene, sceneNode } from "@looma-test/scene";
        import { UiTooltip as Tooltip } from "@looma-test/components";
        createScene({ render: () => sceneNode(Tooltip, { id: "hint", for: "anchor", open: true }, () => "Office hours") }).mount("#app");
      `);
      const page = await open(path, '<button id="anchor" style="position: fixed; left: 300px; top: 250px">Office</button>' + (adapter === "html" ? '<ui-tooltip id="hint" for="anchor" open>Office hours</ui-tooltip>' : '<div id="app"></div>'), [join(root, "tokens.css")], { reducedMotion: "reduce" });
      for (const side of ["top", "bottom", "left", "right"]) {
        // Inspect the painted arrow on each resolved side, independently of overlay collision policy.
        const symmetry = await page.locator("#hint").evaluate((element, side) => {
          element.setAttribute("data-ui-actual-placement", side);
          const arrow = getComputedStyle(element.querySelector(".surface")!, "::after");
          const matrix = new DOMMatrix(arrow.transform);
          return { acrossTip: Math.abs(matrix.a + matrix.c), acrossBase: Math.abs(matrix.b - matrix.d) };
        }, side);
        assert.ok(symmetry.acrossTip < 0.001 && symmetry.acrossBase < 0.001, `${adapter} ${side}: arrow sides meet at the same height`);
      }
      await page.close();
    }
  });
});
