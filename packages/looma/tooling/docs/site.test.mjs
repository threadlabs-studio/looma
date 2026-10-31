import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { prepareDocumentation } from './site.mjs';
import { scopedExampleMarkup } from './render.mjs';

test('inline specimens scope label, command, fragment and radio relationships together', () => {
  const example = { markup: '<label id="label" for="field">Name</label><input id="field" aria-labelledby="label hint"><small id="hint">Help</small><ui-button commandfor="dialog">Open</ui-button><ui-dialog id="dialog"></ui-dialog><a href="#details">Details</a><ui-radio name="choice">One</ui-radio>' };
  const markup = scopedExampleMarkup(example, '/system/', 'first');
  assert.match(markup, /id="first-field"/);
  assert.match(markup, /for="first-field"/);
  assert.match(markup, /aria-labelledby="first-label first-hint"/);
  assert.match(markup, /commandfor="first-dialog"/);
  assert.match(markup, /id="first-dialog"/);
  assert.match(markup, /href="#first-details"/);
  assert.match(markup, /id="first-details" hidden/);
  assert.match(markup, /name="first-choice"/);
  assert.match(markup, /data-example-id="field"/);
  assert.notEqual(markup, scopedExampleMarkup(example, '/system/', 'second'));
  assert.match(scopedExampleMarkup({ markup: '<img src="/_looma/portrait.svg" alt="Portrait">' }, '/system/', 'image'), /\/system\/_looma\/portrait\.svg/);
});

test('prerenders examples in shared cards without frame documents, including behavior and resizing', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'looma-docs-'));
  try {
    const { readCatalog } = await import('./catalog.mjs');
    const catalog = await readCatalog(new URL('../../docs/catalog.json', import.meta.url));
    const site = await prepareDocumentation({ root, catalog, config: { title: 'A design system', base: '/system/' } });
    const button = await readFile(path.join(site.content, 'components/03.(Forms)/ui-button.md'), 'utf8');
    assert.equal(catalog.groups.at(-1).id, 'extras');
    const extrasDirectory = `${String(catalog.groups.findIndex(group => group.id === 'extras') + 1).padStart(2, '0')}.(Extras)`;
    const lightEditor = await readFile(path.join(site.content, 'components', extrasDirectory, 'ui-light-editor.md'), 'utf8');
    assert.match(lightEditor, /LightEditor/);
    assert.match(button, /looma-example-card/);
    assert.match(button, /<ui-stack gap="xl"><looma-example-card/, 'example cards own their frame and sit directly in the reference stack');
    assert.match(button, /<div slot="preview"><div data-preview=/);
    assert.doesNotMatch(button, /iframe|\/_looma\/preview\//);
    assert.match(button, /Framework props/);
    assert.match(button, /Emphasis: how loudly/);
    assert.ok(site.examples.some(example => example.behavior));
    assert.ok(site.examples.some(example => example.resizable));
    const preview = await readFile(site.examples.find(example => example.behavior).file, 'utf8');
    assert.match(await readFile(site.examples.find(example => example.behavior).file.replace(/\.html$/, ".js"), "utf8"), /setupExample/);
    assert.doesNotMatch(preview, /mk:navigation|<title>/);
    assert.equal(site.catalog.components.length, catalog.components.length);
    assert.ok(!catalog.components.some(component => component.tag.startsWith('ui-editor-')));
    assert.ok(catalog.resources.some(resource => resource.tag === 'ui-editor-toolbar'), 'the complete Editor retains its internal resources');
    const directory = await readFile(path.join(site.content, 'components/index.md'), 'utf8');
    assert.match(directory, /looma-example-card/);
    assert.match(directory, /category="forms"/);
    const forms = await readFile(path.join(site.content, 'components/03.(Forms)/00.forms.md'), 'utf8');
    assert.match(forms, /navigation: overview/);
    assert.match(forms, /<looma-catalog category="forms"/);
    assert.deepEqual([...forms.matchAll(/<looma-example-card[^>]* tag="([^"]+)"/g)].map(match => match[1]),
      catalog.components.filter(component => component.group === 'forms' && !component.navigationParent).map(component => component.tag));
    assert.match(directory, /data-preview=/);
    const swatches = site.examples.find(example => example.component.endsWith('/ui-color-picker') && example.markup.includes('<ui-input'));

    assert.match(await readFile(swatches.file, 'utf8'), /ui-input\/ui-input.html/);
    const customizer = await readFile(path.join(site.generated, 'customizer.html'), 'utf8');
    assert.match(customizer, /<looma-preview-choice slot="preview"/);
    assert.match(customizer, /removable/);
    assert.match(customizer, /data-customizer-summary/);
    assert.doesNotMatch(customizer, /summary="Advanced material"/);
    assert.match(customizer, /Frosting/);
    assert.match(customizer, /Transparency/);
    assert.equal((customizer.match(/id="theme-light-color"/g) ?? []).length, 1, 'environment light appears only under Material');
    assert.match(customizer, /data-editor-preview="material"/);
    assert.match(customizer, /repeating-linear-gradient/);
    assert.match(customizer, /treatment="expressive"/);
    for (const file of ['palette.mjs', 'fonts.mjs']) assert.ok((await readFile(path.join(site.generated, file), 'utf8')).length > 0);
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
    const { compileMarkdown } = await import('markupress');
    const { resource } = await compileMarkdown(reference, { file: '/tmp/inert-reference.md', pageName: 'inert-reference' });
    const renderedDescription = /<div class="component-description">([\s\S]*?)<\/div>/.exec(resource)?.[1];
    assert.match(renderedDescription, /&lt;evil-writer&gt;/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
