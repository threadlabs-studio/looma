import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { prepareDocumentation } from './site.mjs';

test('generates full portable reference and the same isolated cards, including behavior and resizing', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'looma-docs-'));
  try {
    const { readCatalog } = await import('./catalog.mjs');
    const catalog = await readCatalog(new URL('../../docs/catalog.json', import.meta.url));
    const site = await prepareDocumentation({ root, catalog, config: { title: 'A design system', base: '/system/' } });
    const button = await readFile(path.join(site.content, 'components/03.(Forms)/ui-button.md'), 'utf8');
    assert.match(button, /looma-example-card/);
    assert.match(button, /\/system\/_looma\/preview\//);
    assert.match(button, /Framework props/);
    assert.match(button, /Emphasis: how loudly/);
    assert.ok(site.examples.length > 290);
    assert.ok(site.examples.some(example => example.behavior));
    assert.ok(site.examples.some(example => example.resizable));
    const preview = await readFile(site.examples.find(example => example.behavior).file, 'utf8');
    assert.match(await readFile(site.examples.find(example => example.behavior).file.replace(/\.html$/, ".js"), "utf8"), /setupExample/);
    assert.match(preview, /hk:navigation/);
    assert.ok(site.catalog.components.length > 75);
    const editor = catalog.components.find(component => component.group === 'editor' && !component.navigationParent);
    const editorPage = await readFile(path.join(site.content, 'editor', editor.tag + '.md'), 'utf8');
    assert.match(editorPage, /looma-example-card/);
    const { componentPath } = await import('./render.mjs');
    assert.equal(componentPath(editor), `/editor/${editor.tag}/`);
    const directory = await readFile(path.join(site.content, 'components/index.md'), 'utf8');
    assert.match(directory, /looma-example-card/);
    assert.match(directory, /category="forms"/);
    const swatches = site.examples.find(example => example.component.endsWith('/ui-color-picker'));
    assert.match(await readFile(swatches.file, 'utf8'), /ui-input\/ui-input.html/);
    const customizer = await readFile(path.join(site.generated, 'customizer.html'), 'utf8');
    assert.match(customizer, /loading="eager"/);
    assert.match(customizer, /removable/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('authored guidance is additive and cannot silently overwrite generated APIs', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'looma-docs-'));
  try {
    await mkdir(path.join(root, 'guides/components'), { recursive: true });
    await writeFile(path.join(root, 'guides/components/ui-input.md'), '# Override');
    const { readCatalog } = await import('./catalog.mjs');
    await assert.rejects(prepareDocumentation({ root, catalog: await readCatalog(new URL('../../docs/catalog.json', import.meta.url)), config: { content: 'guides' } }), /authored.*generated|collision/i);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('authored guidance keeps relative component dependencies and code examples at their original locations', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'looma-guidance-'));
  try {
    await mkdir(path.join(root, 'docs/guide'), { recursive: true });
    await mkdir(path.join(root, 'app/components'), { recursive: true });
    const resource = '<template component="acme-note"><p>A note</p></template>';
    await writeFile(path.join(root, 'app/components/note.html'), resource);
    const markdown = '# Local guidance\n\n<link rel="component" href="../../app/components/note.html">\n\n<acme-note></acme-note>\n\n```html\n<link rel="component" href="../../app/components/note.html">\n```\n';
    await writeFile(path.join(root, 'docs/guide/local.md'), markdown);
    const { readCatalog } = await import('./catalog.mjs');
    const site = await prepareDocumentation({ root, catalog: await readCatalog(new URL('../../docs/catalog.json', import.meta.url)), config: { content: 'docs' } });
    const generated = path.join(site.content, 'guide/local.md');
    assert.equal(await readFile(generated, 'utf8'), markdown);
    assert.equal(await readFile(path.resolve(path.dirname(generated), '../../app/components/note.html'), 'utf8'), resource);
  } finally { await rm(root, { recursive: true, force: true }); }
});


test('catalog descriptions and snippet language names cannot mount a controller outside the isolated stage', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'looma-inert-metadata-'));
  try {
    const { readCatalog } = await import('./catalog.mjs');
    const catalog = await readCatalog(new URL('../../docs/catalog.json', import.meta.url));
    const component = catalog.components.find(component => component.tag === 'ui-button');
    const minimal = catalog.components.find(component => component.tag === 'ui-input');
    minimal.description = '';
    component.description = '<link rel="component" href="evil.html"><evil-writer></evil-writer>';
    component.examples[0].frameworks['html-next'] = { language: 'html"><evil-writer></evil-writer><code class="', code: '<ui-button>Safe source</ui-button>' };
    const site = await prepareDocumentation({ root, catalog });
    assert.match(await readFile(path.join(site.content, 'components/03.(Forms)/ui-input.md'), 'utf8'), /description: "Input component reference\."/);
    const reference = await readFile(path.join(site.content, 'components/03.(Forms)/ui-button.md'), 'utf8');
    const body = reference.replace(/^---\n[\s\S]*?\n---\n/, '');
    assert.ok(!body.includes('<evil-writer>'));
    assert.ok(!body.includes('href="evil.html"'));
    assert.match(reference, /&lt;evil-writer&gt;/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
