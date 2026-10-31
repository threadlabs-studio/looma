import assert from 'node:assert/strict';
import test from 'node:test';
import { frameworkExamples } from './framework-examples.mjs';

const components = [
  { tag: 'ui-form-field', package: '@threadlabs/looma', attributes: [{ name: 'invalid', type: 'boolean' }] },
  { tag: 'ui-input-group', package: '@threadlabs/looma' },
  { tag: 'ui-input', package: '@threadlabs/looma' },
];
const markup = `<ui-form-field invalid>
  <label slot="label" for="site">Site address</label>
  <ui-input-group>
    <ui-input id="site" placeholder="your-site"></ui-input>
    <span slot="suffix">.example.com</span>
  </ui-input-group>
</ui-form-field>`;

test('React examples present slots, boolean props and a single root without redundant fragments', () => {
  const { code } = frameworkExamples({ markup }, components).react;
  assert.doesNotMatch(code, /<>|invalid=\{true\}/);
  assert.match(code, /return \(\n    <UiFormField\n      invalid/);
  assert.match(code, /slots=\{\{\n        label: <label htmlFor="site">Site address<\/label>,\n      \}\}/);
  assert.match(code, /<UiInput id="site" placeholder="your-site" \/>/);
  assert.doesNotMatch(code, /\n[ \t]+\n/);
});

test('React examples return simple JSX directly and only group actual sibling roots', () => {
  const simple = frameworkExamples({ markup: '<ui-input disabled></ui-input>' }, components).react.code;
  assert.match(simple, /return <UiInput disabled \/>;/);
  assert.doesNotMatch(simple, /return \(|<>/);
  const siblings = frameworkExamples({ markup: '<ui-input></ui-input><ui-input></ui-input>' }, components).react.code;
  assert.match(siblings, /return <><UiInput \/><UiInput \/><\/>;/);
  assert.match(frameworkExamples({ markup: 'Plain text' }, []).react.code, /return "Plain text";/);
  assert.match(frameworkExamples({ markup: '' }, []).react.code, /return null;/);
});

test('React text-only named slots are string values rather than JSX text outside an element', () => {
  const code = frameworkExamples({ markup: '<ui-input-group><template slot="suffix">Text {value}</template></ui-input-group>' }, components).react.code;
  assert.match(code, /suffix: "Text \{value\}",/);
});

test('Vue examples place named templates in source order and indent each SFC block', () => {
  const { code } = frameworkExamples({ markup }, components).vue;
  assert.match(code, /<script setup>\n  import/);
  assert.match(code, /<template>\n  <UiFormField/);
  assert.match(code, /    <template #label>\n      <label for="site">Site address<\/label>\n    <\/template>\n    <UiInputGroup>/);
  assert.doesNotMatch(code, /\n[ \t]+\n/);
});

test('Svelte examples use semantic snippet names and readable slot shorthand', () => {
  const { code } = frameworkExamples({ markup }, components).svelte;
  assert.match(code, /\{#snippet label\(\)\}\n  <label for="site">Site address<\/label>\n\{\/snippet\}/);
  assert.match(code, /\{#snippet suffix\(\)\}\n  <span>\.example.com<\/span>\n\{\/snippet\}/);
  assert.match(code, /slots=\{\{ label \}\}/);
  assert.match(code, /slots=\{\{ suffix \}\}/);
  assert.doesNotMatch(code, /slot\d/);
});

test('Svelte snippet identifiers disambiguate repeated roles, reserved names and imports', () => {
  const { code } = frameworkExamples({ markup: '<ui-input-group><span slot="suffix">A</span><ui-input-group><span slot="suffix">B</span><span slot="default">C</span><span slot="UiInputGroup">D</span><span slot="empty-state">E</span></ui-input-group></ui-input-group>' }, components).svelte;
  const names = [...code.matchAll(/\{#snippet (\w+)\(/g)].map(match => match[1]);
  assert.equal(new Set(names).size, 5);
  assert.ok(names.includes('suffix'));
  assert.ok(names.includes('inputGroupSuffix'));
  assert.ok(!names.includes('default'));
  assert.ok(!names.includes('UiInputGroup'));
  assert.ok(names.includes('emptyState'));
  assert.match(code, /"empty-state": emptyState/);
});

test('conversion preserves inline adjacency, intentional spaces, preformatted text and literal braces', () => {
  const example = { markup: '<p>Hello <strong>world</strong>! <span>A</span><span>B</span> <span>C</span> {value} {{literal}}</p><pre>  first\n    second</pre>' };
  const codes = frameworkExamples(example, []).react.code;
  assert.match(codes, /Hello <strong>world<\/strong>! <span>A<\/span><span>B<\/span> <span>C<\/span>/);
  assert.match(codes, /<pre>\{"  first\\n    second"\}<\/pre>/);
  assert.ok(frameworkExamples(example, []).vue.code.includes('&#123;'));
});
