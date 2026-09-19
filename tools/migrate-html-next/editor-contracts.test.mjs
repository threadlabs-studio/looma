import assert from "node:assert/strict";
import test from "node:test";

import { editorContracts } from "./editor-contracts.mjs";

test("editor contracts cover the seven published UI surfaces", () => {
  assert.equal(Object.keys(editorContracts).length, 7);
  assert.deepEqual(editorContracts["ui-editor-toolbar"].slots, ["default"]);
  assert.equal(editorContracts["ui-editor-slash-menu"].props.anchorRect.type, "unknown");
  assert.equal(editorContracts["ui-editor-table-overlay"].props.geometry.type, "unknown");
});

test("editor contracts expose domain-neutral intent events", () => {
  const serialized = JSON.stringify(editorContracts);
  assert.doesNotMatch(serialized, /Tiptap|ProseMirror|customElements|HTMLElement/);
  assert.deepEqual(
    editorContracts["ui-editor-slash-menu"].events.map(({ name }) => name),
    ["looma-editor-slash-menu-highlight", "looma-editor-slash-menu-select"],
  );
});
