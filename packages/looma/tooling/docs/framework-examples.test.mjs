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
  assert.match(code, /return <UiFormField\n    invalid/);
  assert.doesNotMatch(code, /return \(/);
  assert.match(code, /slots=\{\{\n      label: <label\n        htmlFor="site"\n      >Site address<\/label>,\n    \}\}/);
  assert.match(code, /<UiInput\n        id="site"\n        placeholder="your-site"\n      \/>/);
  assert.doesNotMatch(code, /\n[ \t]+\n/);
});

test('React examples keep the component, omit return parentheses and only group sibling roots', () => {
  const simple = frameworkExamples({ markup: '<ui-input disabled></ui-input>' }, components).react.code;
  assert.match(simple, /export default function Example\(\) \{\n  return <UiInput\n    disabled\n  \/>;\n\}/);
  assert.doesNotMatch(simple, /return \(|<>/);
  const siblings = frameworkExamples({ markup: '<ui-input></ui-input><ui-input></ui-input>' }, components).react.code;
  assert.match(siblings, /return <>\n    <UiInput \/>\n    <UiInput \/>\n  <\/>;/);
  assert.match(frameworkExamples({ markup: 'Plain text' }, []).react.code, /return "Plain text";/);
  assert.match(frameworkExamples({ markup: '' }, []).react.code, /return null;/);
});

test('React text-only named slots are string values rather than JSX text outside an element', () => {
  const code = frameworkExamples({ markup: '<ui-input-group><template slot="suffix">Text {value}</template></ui-input-group>' }, components).react.code;
  assert.match(code, /suffix: "Text \{value\}",/);
});

test('React slot indentation does not wrap a single inline element in a fragment', () => {
  const code = frameworkExamples({ markup: '<ui-input-group><template slot="suffix">\n  <span>.example.com</span>\n</template></ui-input-group>' }, components).react.code;
  assert.match(code, /suffix: <span>\.example.com<\/span>,/);
  assert.doesNotMatch(code, /<>|<\/>/);
});

test('Vue examples place named templates in source order and indent each SFC block', () => {
  const { code } = frameworkExamples({ markup }, components).vue;
  assert.match(code, /<script setup>\n  import/);
  assert.match(code, /<template>\n  <UiFormField/);
  assert.match(code, /    <template #label>\n      <label\n        for="site"\n      >Site address<\/label>\n    <\/template>\n    <UiInputGroup>/);
  assert.doesNotMatch(code, /\n[ \t]+\n/);
});

test('Svelte examples use semantic snippet names and readable slot shorthand', () => {
  const { code } = frameworkExamples({ markup }, components).svelte;
  assert.match(code, /\{#snippet label\(\)\}\n  <label\n    for="site"\n  >Site address<\/label>\n\{\/snippet\}/);
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
  const html = frameworkExamples(example, [])['html-next'].code;
  assert.ok(html.includes('<p>Hello <strong>world</strong>! <span>A</span><span>B</span> <span>C</span> {value} {{literal}}</p>'));
  assert.ok(html.includes('<pre>  first\n    second</pre>'));
});

test('every output prints nested invocations with separate attribute lines and consistent indentation', () => {
  const compact = '<ui-form-field invalid><ui-input-group><ui-input id="site" placeholder="your-site"></ui-input></ui-input-group></ui-form-field>';
  const codes = frameworkExamples({ markup: compact }, components);
  assert.match(codes['html-next'].code, /<ui-form-field\n  invalid\n>\n  <ui-input-group>\n    <ui-input\n      id="site"\n      placeholder="your-site"\n    ><\/ui-input>\n  <\/ui-input-group>\n<\/ui-form-field>$/);
  assert.match(codes.vue.code, /  <UiFormField\n    :invalid="true"\n  >\n    <UiInputGroup>\n      <UiInput\n        id="site"\n        placeholder="your-site"\n      \/>\n    <\/UiInputGroup>\n  <\/UiFormField>/);
  assert.match(codes.svelte.code, /<UiFormField\n  invalid\n>\n  <UiInputGroup>\n    <UiInput\n      id="site"\n      placeholder="your-site"\n    \/>\n  <\/UiInputGroup>\n<\/UiFormField>$/);
  assert.match(codes.react.code, /<UiInput\n +id="site"\n +placeholder="your-site"\n +\/>/);
});

test('Vue bindings use single-quoted strings in object and array expressions', () => {
  const catalog = [{ tag: 'ui-date-field', package: '@threadlabs/looma', attributes: [
    { name: 'display-options', property: 'displayOptions', valueType: { kind: 'object', fields: [{ name: 'dateStyle', type: { kind: 'terminal', name: 'string' }, optional: true }] } },
    { name: 'disabled-dates', property: 'disabledDates', valueType: { kind: 'list', item: { kind: 'terminal', name: 'string' } } },
  ] }];
  const example = { markup: `<ui-date-field display-options='{"dateStyle":"long"}' disabled-dates='["2026-11-11"]'></ui-date-field>` };
  const codes = frameworkExamples(example, catalog);
  assert.ok(codes.vue.code.includes(`:display-options="{ dateStyle: 'long' }"`));
  assert.ok(codes.vue.code.includes(`:disabled-dates="['2026-11-11']"`));
  assert.doesNotMatch(codes.vue.code, /&quot;/);
  assert.ok(codes.react.code.includes('displayOptions={{"dateStyle":"long"}}'));
  assert.ok(codes.svelte.code.includes('disabledDates={["2026-11-11"]}'));
});

test('Vue expression quoting preserves apostrophes, quotes, backslashes and HTML-like text', async () => {
  const { parseFragment } = await import('parse5');
  const { runInNewContext } = await import('node:vm');
  const values = ["O'Reilly", 'a "quote"', '\\"', "\\'", '<tag>&copy;', 'line\nnext', 'tab\there'];
  const json = JSON.stringify(values).replaceAll('\\n', '\n').replaceAll('\\t', '\t')
    .replaceAll('&', '&amp;').replaceAll("'", '&#39;').replaceAll('<', '&lt;');
  const catalog = [{ tag: 'ui-example', package: '@threadlabs/looma', attributes: [
    { name: 'values', valueType: { kind: 'list', item: { kind: 'terminal', name: 'string' } } },
  ] }];
  const code = frameworkExamples({ markup: `<ui-example values='${json}'></ui-example>` }, catalog).vue.code;
  const template = parseFragment(code.slice(code.indexOf('<template>'))).childNodes[0];
  const component = template.content.childNodes.find(node => node.tagName === 'uiexample');
  const expression = component.attrs.find(attribute => attribute.name === ':values').value;
  assert.deepEqual(JSON.parse(JSON.stringify(runInNewContext(expression))), values);
});
