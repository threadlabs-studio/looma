import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { generateLayoutArtifacts } from "./generate-layout.mjs";

test("generates the complete deterministic layout graph and converted stylesheet", async () => {
  const output = await mkdtemp(join(tmpdir(), "looma-html-next-layout-"));
  try {
    const manifest = await generateLayoutArtifacts({ output });
    assert.equal(manifest.components.length, 9);
    const sidebar = await readFile(join(output, "components", "ui-sidebar.html"), "utf8");
    assert.match(sidebar, /controller="\.\/controllers\/ui-sidebar\.js"/);
    assert.match(sidebar, /<event name="resize"/);
    const css = await readFile(join(output, "styles.css"), "utf8");
    assert.match(css, /\[data-component-root~="ui-stack"\]/);
    assert.match(css, /\[data-component-root~="ui-sidebar"\]\[data-resizable='true'\]/);
    assert.doesNotMatch(css, /ui-sidebar\[side=/);
    assert.doesNotMatch(css, /\[resizable\]/);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
