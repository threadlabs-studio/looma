import assert from 'node:assert/strict';
import test from 'node:test';
import { additions, cssRules, inlineStyles, styleSourceProblems } from './style-source-policy.mjs';

test('only approved primitives have styling; composition exceptions cannot grow or change', async () => {
  assert.deepEqual(await styleSourceProblems(), []);
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
});
