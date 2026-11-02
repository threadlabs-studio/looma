import assert from "node:assert/strict";

import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Disabled action appearance", () => {
  it("uses a flat neutral palette instead of retaining active button tones", async () => {
    const path = await bundle("html-disabled-actions", `import "@looma-test/runtime";`);
    const page = await open(path, `
      <ui-button id="active">Publish</ui-button>
      <ui-button id="outline" disabled>Publish</ui-button>
      <ui-button id="danger" variant="danger" disabled>Delete</ui-button>
      <ui-icon-button id="icon" label="More" variant="outline" disabled><ui-icon name="ellipsis"></ui-icon></ui-icon-button>
    `, [join(root, "tokens.css"), join(root, "theme-light.css")]);
    const style = (id: string) => page.locator(`#${id}`).evaluate((element) => {
      const css = getComputedStyle(element);
      return { color: css.color, background: css.backgroundColor, border: css.borderTopColor, shadow: css.boxShadow };
    });
    const active = await style("active");
    const outline = await style("outline");
    const danger = await style("danger");
    const icon = await style("icon");
    assert.notEqual(outline.color, active.color);
    assert.notEqual(outline.border, active.border);
    assert.equal(outline.color, danger.color);
    assert.equal(outline.background, danger.background);
    assert.equal(icon.color, outline.color);
    assert.equal(outline.shadow, "none");
    await page.close();
  });
});
