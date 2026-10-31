import assert from 'node:assert/strict';
import test from 'node:test';
import { parse } from 'expressmark';
import { compileMarkdown } from 'markupress';
import { parseComponentResource } from '@nextwebwg/html-next';
import { createRenderer } from '@nextwebwg/html-next/server';
import { parseFragment } from 'parse5';
import { apiBody, cardDescription, referencePage } from './render.mjs';

test('rendered description text stays literal through the generated Markdown page', async () => {
  const description = 'A \\*literal\\* star, \\[label\\]\\(target\\), \\@maintainer and **strong**.';
  const component = { title: 'Status', tag: 'ui-status', id: 'example/ui-status', description, examples: [] };
  const source = referencePage(component, { components: [component] }, '/card.html', '/');
  const { resource } = await compileMarkdown(source, { file: '/tmp/status.md', pageName: 'status-description' });
  assert.match(resource, /<div class="component-description"><p>A \*literal\* star, \[label\]\(target\), @maintainer and <strong>strong<\/strong>\.<\/p><\/div>/);
  assert.doesNotMatch(resource, /<em>|data-type="mention"|href="target"/);
});

test('catalog descriptions use standard inline elements for plain card text and reference HTML', async () => {
  const description = 'A :badge[Ready]{tone=success} **status**. More details.';
  assert.equal(cardDescription(description), 'A Ready status.');
  assert.equal(cardDescription(), '');
  const component = { title: 'Status', tag: 'ui-status', id: 'example/ui-status', description, examples: [] };
  const page = referencePage(component, { components: [component] }, '/card.html', '/');
  const { resource } = await compileMarkdown(page, { file: '/tmp/status.md', pageName: 'status-inline' });
  assert.match(resource, /<div class="component-description"><p>A <span data-tone="success" data-type="badge">Ready<\/span> <strong>status<\/strong>\. More details\.<\/p><\/div>/);
});

test('reference descriptions keep unknown component markup inert and template braces literal', async () => {
  const component = { title: 'Status', tag: 'ui-status', id: 'example/ui-status', description: '<evil-writer>Unsafe</evil-writer> and `{$value}`.', examples: [] };
  const page = referencePage(component, { components: [component] }, '/card.html', '/');
  const { resource } = await compileMarkdown(page, { file: '/tmp/status.md', pageName: 'status-inert' });
  assert.match(resource, /&lt;evil-writer&gt;Unsafe&lt;\/evil-writer&gt;/);
  assert.doesNotMatch(resource, /<evil-writer>/);
  assert.match(resource, /<code>\\\{\$value\}<\/code>/);
});

test('native code in catalog metadata preserves mention and formatting characters literally', async () => {
  const description = 'Use <code>@maintainer **literal**</code>.';
  const component = { title: 'Status', tag: 'ui-status', id: 'example/ui-status', description, examples: [] };
  assert.equal(cardDescription(description), 'Use @maintainer **literal**.');
  const page = referencePage(component, { components: [component] }, '/card.html', '/');
  const { resource } = await compileMarkdown(page, { file: '/tmp/status.md', pageName: 'status-code' });
  assert.match(resource, /<code>@maintainer \*\*literal\*\*<\/code>/);
  assert.doesNotMatch(resource, /data-type="mention"/);
});

test('card text decodes native code entities and removes nested presentation markup', () => {
  assert.equal(cardDescription('Use <code>&lt;config&gt; <span class="token">**literal**</span> &amp; &#123;x&#125;</code>.'), 'Use <config> **literal** & {x}.');
  assert.equal(cardDescription('An ![accessible label](icon.svg).'), 'An accessible label.');
});

test('API code preserves object braces and backslashes through Markdown and HTML Next rendering', async () => {
  const type = String.raw`{ path: string; marker: "\\" }`;
  const value = String.raw`{"path":"C:\\docs","template":"{$value}"}`;
  const body = apiBody({ package: 'example', root: 'div', attributes: [{ name: 'config', type, default: value }] });
  const { resource } = await compileMarkdown('# API\n\n' + body, { file: '/tmp/api.md', pageName: 'status-api' });
  const renderer = createRenderer({ workers: 1 });
  try {
    const { html } = await renderer.render('<status-api></status-api>', { definitions: parseComponentResource(resource, '/tmp/status-api.html').definitions });
    const codes = [];
    const text = node => node.nodeName === '#text' ? node.value : (node.childNodes ?? []).map(text).join('');
    const collect = node => {
      if (node.tagName === 'code') codes.push(text(node));
      for (const child of node.childNodes ?? []) collect(child);
    };
    collect(parseFragment(html));
    assert.ok(codes.includes(type), JSON.stringify(codes));
    assert.ok(codes.includes(value), JSON.stringify(codes));
  } finally { await renderer.close(); }
});

test('native reference tabs expose literal Markdown fences to the standard parser', () => {
  const example = { id: 'example/ui-status/default', title: 'Ready', description: 'Ready status.', markup: '<ui-status label="Ready">**literal**</ui-status>', frameworks: {} };
  const component = { title: 'Status', tag: 'ui-status', id: 'example/ui-status', package: 'example', description: 'A status.', examples: [example] };
  const page = referencePage(component, { components: [component] }, '/card.html', '/');
  const document = parse(page, { syntax: 'standard', trustedHtml: true });
  const codes = [];
  const collect = node => {
    if (node.type === 'code') codes.push(node);
    for (const child of node.body ?? node.children ?? []) collect(child);
  };
  collect(document);
  assert.match(page, /<ui-tabs slot="code"[^>]*><section aria-label="HTML Next">/);
  assert.equal(codes.length, 4);
  assert.equal(codes[0].language, 'html');
  assert.equal(codes[0].value, '<link\n  rel="component"\n  href="example/components/ui-status/ui-status.html"\n>\n\n<ui-status\n  label="Ready"\n>**literal**</ui-status>');
  for (const label of ['Vue', 'React', 'Svelte']) assert.ok(page.includes(`aria-label="${label}"`));
});


test('local component snippets import the authored HTML file in every framework', async () => {
  const { frameworkExamples } = await import('./framework-examples.mjs');
  const codes = frameworkExamples({ markup: '<acme-status label="Ready"></acme-status>' }, [{
    tag: 'acme-status', package: 'project-catalog', importSource: './app/components/acme-status.html',
  }]);
  for (const target of ['vue', 'react', 'svelte']) {
    assert.ok(codes[target].code.includes('import { AcmeStatus } from "./app/components/acme-status.html";'));
    assert.ok(!codes[target].code.includes('from "project-catalog"'));
  }
});

test('framework examples import resource dependencies that have no reference page', () => {
  const example = { id: 'example/ui-status/icon', title: 'Icon', description: '', markup: '<ui-status><ui-icon name="search"></ui-icon></ui-status>' };
  const component = { title: 'Status', tag: 'ui-status', id: 'example/ui-status', package: 'example', examples: [example] };
  const page = referencePage(component, { components: [component], resources: [{ tag: 'ui-icon', package: 'example' }] }, '/card.html', '/');
  assert.match(page, /import \{ UiIcon, UiStatus \} from "example"/);
  assert.match(page, /<UiIcon\n +name="search"\n +\/>/);
});
