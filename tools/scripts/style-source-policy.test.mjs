import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { additions, cssRules, inlineStyles, styleSourceProblems } from './style-source-policy.mjs';

test('only approved primitives have styling; composition exceptions cannot grow or change', async () => {
  assert.deepEqual(await styleSourceProblems(), []);
});

test('active optical text trimming uses one explicit edge policy', async () => {
  const root = new URL('../../packages/looma/src/components/', import.meta.url);
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('ui-')) continue;
    const source = await readFile(new URL(`${entry.name}/${entry.name}.html`, root), 'utf8');
    for (const style of source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) for (const rule of cssRules(style[1])) {
      const declarations = rule.slice(rule.lastIndexOf('{') + 1);
      if (!/text-box-trim:\s*trim-(?:both|start|end)/.test(declarations)) continue;
      assert.match(declarations, /text-box-trim:\s*trim-both;/, entry.name);
      assert.match(declarations, /text-box-edge:\s*cap alphabetic;/, entry.name);
    }
  }
});

test('rule identity includes appearance and placement conditions', () => {
  const original = cssRules('/* note */ @media (min-width: 800px) { .menu { color: red; } }');
  assert.notDeepEqual(cssRules('@media (min-width: 500px) { .menu { color: red; } }'), original);
  assert.notDeepEqual(cssRules('@media (min-width: 800px) { .menu { color: blue; } }'), original);
  assert.deepEqual(cssRules('.menu { content: "{"; }'), ['.menu { content: "{";']);
});

test('inline styling is inspected in full rather than only its first property', () => {
  const original = inlineStyles('h(Card, { style: { color: "red", padding: "8px" } });');
  assert.notDeepEqual(inlineStyles('h(Card, { style: { color: "red", padding: "16px" } });'), original);
  assert.equal(inlineStyles('el.style.color = "red"; el.style.setProperty("--x", "1"); el.setAttribute("style", "color:red");').length, 3);
  assert.equal(inlineStyles('Object.assign(el.style, { color: "red" });').length, 1);
  assert.deepEqual(additions([...original, ...original], original), original);
  assert.ok(inlineStyles('<div :style="appearance" />').length > 0, 'Vue template style bindings are checked');
  assert.ok(inlineStyles('const view = <div style={{ padding: 24 }} />;').length > 0, 'JSX style attributes are checked');
});
