import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const componentsRoot = path.join(repoRoot, "packages/looma/src/components");

// A `name` here is not a form field name, or the native control is not a form field.
const EXEMPT = {
  "ui-avatar": "name is the person the avatar shows",
  "ui-icon": "name picks the icon",
  "ui-editor-insert-table-grid": "its header-row checkbox configures the editor's table insert",
};

/**
 * A control that can carry a form name, or that renders a native form control, is used in a real
 * form by the "Form participation" browser test, in HTML and in Vue, so the entries it submits (or
 * that it submits none, by design) are asserted rather than assumed.
 */
test("every form control is covered by the form participation browser test", async () => {
  const tests = await readFile(path.join(repoRoot, "packages/looma/tests/browser.test.ts"), "utf8");
  const start = tests.indexOf('describe("Form participation"');
  assert.notEqual(start, -1, "browser.test.ts has a Form participation block");
  const block = tests.slice(start, tests.indexOf("\n});", start));

  const missing = [];
  for (const tag of (await readdir(componentsRoot)).filter((name) => name.startsWith("ui-")).sort()) {
    const source = await readFile(path.join(componentsRoot, tag, `${tag}.html`), "utf8");
    const markup = source.replace(/<defs>[\s\S]*?<\/defs>/, "").replace(/<style>[\s\S]*?<\/style>/, "");
    const control = /<prop name="name"/.test(source) || /<(input|select|textarea)\b/.test(markup);
    if (!control || EXEMPT[tag]) continue;
    const vue = tag.slice(3).replace(/(?:^|-)([a-z])/g, (_, letter) => letter.toUpperCase());
    if (!block.includes(`<${tag} `)) missing.push(`${tag} (HTML)`);
    if (!new RegExp(`h\\(${vue}\\b`).test(block)) missing.push(`${tag} (Vue ${vue})`);
  }
  assert.deepEqual(missing, []);
});
