import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { build } from 'vite';
import htmlNext from '@nextwebwg/html-next-unplugin/vite';
import vue from '@vitejs/plugin-vue';
import react from '@vitejs/plugin-react';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { frameworkExamples } from '../../packages/looma/tooling/docs/framework-examples.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const components = ['site-header', 'button', 'combobox'].map(name => ({
  tag: `ui-${name}`, package: '@threadlabs/looma', attributes: [
    { name: 'multiple', property: 'multiple', type: 'boolean' },
    { name: 'selected-values', property: 'selectedValues', type: 'readonly string[]' },
  ],
}));
const example = {
  markup: '<ui-site-header><a slot="brand" href="/">Folio</a><ui-button slot="actions" variant="solid">Save</ui-button></ui-site-header><ui-combobox multiple selected-values=\'["north"]\'><option value="north">North</option></ui-combobox>',
};

for (const [target, extension, compiler] of [['vue', 'vue', vue], ['react', 'tsx', react], ['svelte', 'svelte', svelte]]) {
  test(`${target} documentation compiles through source-package discovery`, async () => {
    const directory = await mkdtemp(path.join(root, '.examples-'));
    try {
      const snippet = frameworkExamples(example, components)[target].code;
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
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
}
