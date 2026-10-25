import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { stateSheetComparison } from "../../apps/storybook/scripts/state-sheet-comparison.mjs";

// Exercise the exact comparator shipped by the pinned Playwright version.
const storybookRequire = createRequire(new URL("../../apps/storybook/package.json", import.meta.url));
const testRequire = createRequire(storybookRequire.resolve("@playwright/test"));
const playwrightRequire = createRequire(testRequire.resolve("playwright"));
const { PNG } = playwrightRequire("playwright-core/lib/utilsBundle");
const comparator = playwrightRequire("playwright-core/lib/coreBundle").utils.getComparator("image/png");
const compare = (actual, expected) => comparator(actual, expected, {
  ...stateSheetComparison, comparator: stateSheetComparison._comparator,
});
const image = () => new PNG({ width: 32, height: 32, fill: true });
const paint = (png, x, y, color) => png.data.set([...color, 255], (y * png.width + x) * 4);
const buffer = png => PNG.sync.write(png);

test("state sheet comparison detects even one missing dark pixel without an area allowance", () => {
  const expected = image(), actual = image();
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    paint(expected, x, y, [244, 244, 244]);
    paint(actual, x, y, [244, 244, 244]);
  }
  paint(expected, 16, 16, [30, 30, 30]);
  assert.ok(compare(buffer(actual), buffer(expected)));
});

test("state sheet comparison detects a small muted state indicator", () => {
  const expected = image(), actual = image();
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    paint(expected, x, y, [244, 244, 244]);
    paint(actual, x, y, [244, 244, 244]);
  }
  for (let y = 15; y < 18; y++) for (let x = 15; x < 18; x++) paint(expected, x, y, [165, 165, 165]);
  assert.ok(compare(buffer(actual), buffer(expected)));
});

for (const difference of [3, 17]) {
  test(`state sheet comparison detects a flat ${difference} RGB state wash`, () => {
    const expected = image(), actual = image();
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      paint(expected, x, y, [100, 100, 100]);
      paint(actual, x, y, [100 + difference, 100 + difference, 100 + difference]);
    }
    assert.ok(compare(buffer(actual), buffer(expected)));
  });
}

test("state sheet comparison detects a three-pixel-square indicator only 17 RGB from its background", () => {
  const expected = image(), actual = image();
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    paint(expected, x, y, [244, 244, 244]);
    paint(actual, x, y, [244, 244, 244]);
  }
  for (let y = 15; y < 18; y++) for (let x = 15; x < 18; x++) paint(expected, x, y, [227, 227, 227]);
  assert.ok(compare(buffer(actual), buffer(expected)));
});
