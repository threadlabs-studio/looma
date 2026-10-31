import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { build } from 'vite';
import htmlNext from '@nextwebwg/html-next-unplugin/vite';
import vue from '@vitejs/plugin-vue';
import react from '@vitejs/plugin-react';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { compile as compileSvelte } from 'svelte/compiler';
import { parse as parseVue, compileTemplate } from 'vue/compiler-sfc';
import ts from 'typescript';
import { frameworkExamples } from '../../packages/looma/tooling/docs/framework-examples.mjs';
import { discoverComponents } from '../../packages/looma/tooling/docs/catalog.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { parseFragment } = createRequire(new URL('../../packages/looma/package.json', import.meta.url))('parse5');
const { components, resources } = JSON.parse(await readFile(new URL('../../packages/looma/docs/catalog.json', import.meta.url), 'utf8'));
const example = {
  markup: '<ui-site-header><a slot="brand" href="/">Folio</a><ui-button slot="actions" variant="solid">Save</ui-button></ui-site-header><ui-combobox multiple selected-values=\'["north"]\'><option value="north">North</option></ui-combobox>',
};

test('every published example has valid framework syntax', () => {
  const catalog = [...resources, ...components];
  for (const component of components) for (const example of component.examples) {
    const codes = frameworkExamples(example, catalog);
    const source = ts.createSourceFile('Example.tsx', codes.react.code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    assert.deepEqual(source.parseDiagnostics.map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')), [], `${example.id}: React`);
    const { descriptor, errors } = parseVue(codes.vue.code);
    assert.deepEqual(errors, [], `${example.id}: Vue SFC`);
    assert.deepEqual(compileTemplate({ source: descriptor.template.content, filename: 'Example.vue', id: example.id }).errors, [], `${example.id}: Vue template`);
    assert.doesNotThrow(() => compileSvelte(codes.svelte.code, { generate: 'server' }), `${example.id}: Svelte`);
  }
});

for (const [target, extension, compiler] of [['vue', 'vue', vue], ['react', 'tsx', react], ['svelte', 'svelte', svelte]]) {
  test(`${target} documentation compiles through source-package discovery`, async () => {
    const directory = await mkdtemp(path.join(root, '.examples-'));
    try {
      await writeFile(path.join(directory, 'LocalStatus.html'), '<template component="local-status"><defs><prop name="label" type="string" default="Ready">Status.</prop></defs><p>{$label}</p></template>');
      await writeFile(path.join(directory, 'LocalPanel.html'), `<template component="local-panel">
  <defs>
    <prop name="label" type="string" default="Panel">Panel name.</prop>
    <prop name="count" type="number" default="0">Item count.</prop>
    <prop name="enabled" type="boolean" default="false">Enabled state.</prop>
    <prop name="values" type="list(number)" default="[]">Values.</prop>
  </defs>
  <section>
    <h2><slot name="label"></slot></h2>
    <aside><slot name="suffix"></slot></aside>
    <header><slot name="class"></slot></header>
    <footer><slot name="emptyState"></slot></footer>
    <p>{$label}</p><output>{$count}</output><b>{$enabled}</b>
    <i $each="value of $values">{$value}</i>
    <div><slot></slot></div>
  </section>
</template>`);
      const local = await discoverComponents({ root: directory, directory: '.', packageName: 'project-catalog' });
      const catalog = [...resources, ...components, ...local.components];
      const snippet = frameworkExamples({ ...example, markup: example.markup + '<local-status label="Local source"></local-status>' },
        catalog)[target].code;
      assert.ok(snippet.includes('from "./LocalStatus.html"'));
      assert.ok(snippet.includes('from "@threadlabs/looma"'));
      assert.ok(!snippet.includes('/vue'));
      const entry = path.join(directory, `Example.${extension}`);
      await writeFile(entry, snippet);
      await build({
        configFile: false, root, logLevel: 'warn',
        plugins: [htmlNext({ target, declarationsFile: `node_modules/.html-next/${target}-test.d.ts` }), compiler()],
        build: { write: false, lib: { entry, formats: ['es'] } },
      });
      if (target === 'vue') execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', path.join(root, 'tsconfig.editor.json')], { stdio: 'inherit' });

      const groupExamples = components.find(component => component.tag === 'ui-input-group').examples;
      const fixtures = [
        ...groupExamples,
        { markup: `<local-panel label="[a literal string]" count="3" enabled="false" values="[2,4]">
  <label slot="label">Outer label</label>
  <span slot="suffix">Outer suffix</span>
  <span slot="class">Reserved slot</span>
  <span slot="emptyState">Empty state</span>
  <local-panel>
    <label slot="label">Inner label</label>
    <template slot="suffix"><span>Inner</span> <strong>suffix</strong></template>
  </local-panel>
</local-panel>` },
        { markup: '<p>Hello <strong>world</strong>! <span>A</span><span>B</span> <span>C</span> {value} {{literal}}</p><pre>  first\n    second</pre>' },
        { markup: '<p><span>left</span>\n  <span>right</span></p><p><span>left</span><span>right</span></p>' },
        { markup: '<ui-input value="4" type="number"></ui-input><ui-input value="04"></ui-input>' },
        { markup: '<local-panel><template slot="label">Plain text {label}</template><template slot="suffix">Plain suffix</template></local-panel>' },
      ];
      for (const [index, fixture] of fixtures.entries()) {
        await writeFile(path.join(directory, `Fixture${index}.${extension}`), frameworkExamples(fixture, catalog)[target].code);
      }
      const render = target === 'vue' ? 'renderToString(createSSRApp(Component))' : target === 'react'
        ? 'renderToStaticMarkup(createElement(Component))' : 'render(Component).body';
      const runtime = target === 'vue' ? 'import { createSSRApp } from "vue"; import { renderToString } from "vue/server-renderer";'
        : target === 'react' ? 'import { createElement } from "react"; import { renderToStaticMarkup } from "react-dom/server";'
          : 'import { render } from "svelte/server";';
      const serverEntry = path.join(directory, 'server.mjs');
      await writeFile(serverEntry, `${runtime}\n${fixtures.map((_, index) => `import Fixture${index} from "./Fixture${index}.${extension}";`).join('\n')}
export async function examples() {
  return Promise.all([${fixtures.map((_, index) => `Fixture${index}`).join(', ')}].map(async Component => ${render}));
}`);
      await build({
        configFile: false, root, logLevel: 'error',
        plugins: [htmlNext({ target, declarationsFile: `node_modules/.html-next/${target}-test.d.ts` }), compiler()],
        build: { ssr: serverEntry, outDir: path.join(directory, 'dist'), rollupOptions: { output: { entryFileNames: 'server.mjs' } } },
      });
      const { examples } = await import(pathToFileURL(path.join(directory, 'dist/server.mjs')).href);
      const rendered = await examples();
      const text = node => node.nodeName === '#text' ? node.value : (node.childNodes ?? []).map(text).join('');
      const find = (node, tag) => [...node.tagName === tag ? [node] : [], ...(node.childNodes ?? []).flatMap(child => find(child, tag))];
      const [nestedHtml, literalHtml, spacingHtml, inputHtml, textSlotHtml] = rendered.slice(groupExamples.length);
      const nested = parseFragment(nestedHtml);
      assert.deepEqual(find(nested, 'h2').map(node => text(node).trim()), ['Outer label', 'Inner label']);
      assert.deepEqual(find(nested, 'aside').map(node => text(node).trim()), ['Outer suffix', 'Inner suffix']);
      assert.equal(text(find(nested, 'header')[0]).trim(), 'Reserved slot');
      assert.equal(text(find(nested, 'footer')[0]).trim(), 'Empty state');
      assert.equal(text(find(nested, 'p')[0]), '[a literal string]');
      assert.equal(text(find(nested, 'output')[0]), '3');
      assert.equal(text(find(nested, 'b')[0]), 'false');
      assert.deepEqual(find(nested, 'i').map(text), ['2', '4']);
      const literal = parseFragment(literalHtml);
      assert.equal(text(find(literal, 'p')[0]), 'Hello world! AB C {value} {{literal}}');
      assert.equal(text(find(literal, 'pre')[0]), '  first\n    second');
      assert.deepEqual(find(parseFragment(spacingHtml), 'p').map(text), ['left right', 'leftright']);
      assert.deepEqual(find(parseFragment(inputHtml), 'input').map(node => node.attrs.find(attr => attr.name === 'value')?.value), ['4', '04']);
      assert.equal(text(find(parseFragment(textSlotHtml), 'h2')[0]).trim(), 'Plain text {label}');
      assert.equal(text(find(parseFragment(textSlotHtml), 'aside')[0]).trim(), 'Plain suffix');
      assert.ok(rendered[0].includes('.example.com'));
      assert.ok(!rendered.some(html => /<ui-(?:input|input-group|form-field|button|icon)\b/.test(html)));
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
}
