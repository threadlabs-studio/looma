import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const editor = path.join(repo, 'packages/looma/src/editor');
const components = path.join(repo, 'packages/looma/src/components');

// Compositions consume standard controls. The two named, hidden platform file inputs
// are the existing exceptions; moving them into HTML does not permit visible native controls.
export function nativeControls(source) {
  return [...source.matchAll(/\b(?:h|createElement)\s*\(\s*["'](button|input|select|textarea)["']|<(button|input|select|textarea)\b/g)]
    .map(match => ({ tag: match[1] ?? match[2], line: source.slice(0, match.index).split('\n').length }));
}

async function sources(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sources(file));
    else if (/\.(ts|js|html)$/.test(entry.name)) files.push(file);
  }
  return files;
}

test('editor compositions use standard controls and preserve only the named hidden file inputs', async () => {
  const parts = ['ui-editor', 'ui-editor-formatting-tools', 'ui-compact-editor', 'ui-compact-content'];
  const files = (await Promise.all([sources(editor), ...parts.map(part => sources(path.join(components, part)))])).flat();
  const problems = [];
  for (const file of files) {
    let source = await readFile(file, 'utf8');
    if (file === path.join(components, 'ui-editor/ui-editor.html')) {
      const inputs = [...source.matchAll(/<input\b[^>]*>/g)];
      assert.deepEqual(inputs.map(([input]) => /\$ref="([^"]+)"/.exec(input)?.[1]).sort(), ['attachmentInput', 'fileInput']);
      for (const [input] of inputs) {
        for (const attribute of ['type="file"', 'aria-hidden="true"', 'tabindex="-1"', 'class="looma-editor__file-input"']) assert.ok(input.includes(attribute));
        source = source.replace(input, '');
      }
    }
    const controls = nativeControls(source);
    if (controls.length) problems.push(`${path.relative(repo, file)}: native controls at ${controls.map(control => control.line).join(', ')}. Use existing components.`);
  }
  assert.deepEqual(problems, []);
});

test('the composition guard detects authored and imperative native controls', () => {
  assert.deepEqual(nativeControls('h(Button, {}); <ui-input></ui-input>'), []);
  assert.deepEqual(nativeControls('h("button", {});\ndocument.createElement("input");\n<textarea></textarea>'), [
    { tag: 'button', line: 1 }, { tag: 'input', line: 2 }, { tag: 'textarea', line: 3 },
  ]);
});
