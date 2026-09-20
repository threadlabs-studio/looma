import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { generateEditorArtifacts } from "./generate-editor.mjs";

test("generates the complete editor graph and converted stylesheet", async () => {
  const output = await mkdtemp(join(tmpdir(), "looma-html-next-editor-"));
  try {
    const manifest = await generateEditorArtifacts({ output });
    assert.equal(manifest.components.length, 7);
    const slash = await readFile(join(output, "components", "ui-editor-slash-menu.html"), "utf8");
    assert.match(slash, /<prop name="anchorRect" type="object\(/);
    assert.match(slash, /<div \.items="items" \.anchorRect="anchorRect"><\/div>/);
    assert.match(slash, /<event name="looma-editor-slash-menu-select"/);
    const css = await readFile(join(output, "styles.css"), "utf8");
    assert.match(css, /\[data-component-root~="ui-editor-toolbar"\]/);
    assert.doesNotMatch(css, /ui-editor-toolbar\s*\{/);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
