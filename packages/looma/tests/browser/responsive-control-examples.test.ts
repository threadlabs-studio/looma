import assert from "node:assert/strict";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, it } from "vitest";

import { root, bundle, open } from "../renderers/browser-driver";

describe("Responsive control examples", () => {
  it("contains the growing field and scroll-title examples at phone widths", async () => {
    const path = await bundle('responsive-control-examples', 'import "@looma-test/runtime";');
    for (const example of ['ui-cluster/examples/06-bounded-rows.html', 'ui-combobox/examples/08-multiple-rows.html', 'ui-top-bar/examples/02-scroll-title.html']) {
      const markup = (await readFile(join(root, 'src/components', example), 'utf8')).replace('<ui-container', '<ui-container id="example-container"');
      const page = await open(path, markup, [join(root, 'tokens.css')], {viewport: {width: 375, height: 700}});
      try {
        await page.addStyleTag({content: 'body {margin:12px}'});
        for (const width of [320, 375]) {
          await page.setViewportSize({width, height:700});
          const overflow = await page.locator('#example-container').evaluateAll(elements => elements.map(element => {
            const parent = element.parentElement!.getBoundingClientRect();
            return element.getBoundingClientRect().right - parent.right;
          }));
          assert.equal(overflow.length, 1);
          assert.ok(overflow.every(value => value <= 1), `${example}/${width}: containers stay inside the reading area: ${overflow}`);
        }
      } finally {await page.close();}
    }
  });
});
