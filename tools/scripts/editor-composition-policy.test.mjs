import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const editor = path.join(repo, 'packages/looma/src/vue/editor');

// Composed editor surfaces consume components. Native markup belongs in component definitions.
// Existing gaps: mobile table back action, upload retry, chip text/color picker, and a hidden
// platform file input. Keep their exact counts until those surfaces are migrated; never add debt.
const debt = new Map([['LoomaEditor.ts', 5]]);
export function nativeControls(source) {
  return [...source.matchAll(/\bh\s*\(\s*["'](button|input|select|textarea)["']/g)]
    .map(match => ({ tag: match[1], line: source.slice(0, match.index).split('\n').length }));
}

async function sources(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sources(file));
    else if (entry.name.endsWith('.ts')) files.push(file);
  }
  return files;
}

test('editor compositions use standard controls and existing native debt only shrinks', async () => {
  const problems = [];
  for (const file of await sources(editor)) {
    const relative = path.relative(editor, file);
    const controls = nativeControls(await readFile(file, 'utf8'));
    const allowed = debt.get(relative) ?? 0;
    if (controls.length !== allowed) problems.push(`${relative}: ${controls.length} native controls (debt ${allowed}) at ${controls.map(control => control.line).join(', ')}. Use existing components; lower debt when migrating.`);
  }
  assert.deepEqual(problems, []);
});

test('the composition guard detects native controls while allowing component use', () => {
  assert.deepEqual(nativeControls('h(Button, { type: "button" }); h(Input, {})'), []);
  assert.deepEqual(nativeControls('h("button", {});\nh(\'input\', {})'), [
    { tag: 'button', line: 1 }, { tag: 'input', line: 2 },
  ]);
});
