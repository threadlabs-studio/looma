import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { discoverComponents, mergeCatalogs } from './catalog.mjs';

const core = { schemaVersion: 1, package: '@threadlabs/looma', groups: [{ id: 'display', label: 'Display' }], components: [] };
test('discovers a differently prefixed resource, descriptions and examples without running its controller', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'looma-discovery-'));
  try {
    const dir = path.join(root, 'components/acme-status');
    await mkdir(path.join(dir, 'examples'), { recursive: true });
    await writeFile(path.join(dir, 'acme-status.html'), '<template component="acme-status" module="./danger.js"><defs><prop name="label" type="string" default="Ready">The current status.</prop></defs><p>{label}<slot></slot></p></template>');
    await writeFile(path.join(dir, 'danger.js'), 'throw new Error("Discovery must not execute this");');
    await writeFile(path.join(dir, 'docs.json'), JSON.stringify({ title: 'Status', description: 'A project status.', summary: 'Current project state.', group: 'display' }));
    await writeFile(path.join(dir, 'examples/01-ready.html'), '<!--\ntitle: Ready\ndescription: The ready state.\n-->\n<acme-status label="Ready"></acme-status>');
    const catalog = await discoverComponents({ root, directory: 'components', packageName: 'acme-design' });
    const merged = mergeCatalogs([core, catalog]);
    const c = merged.components[0];
    assert.equal(c.id, 'acme-design/acme-status');
    assert.equal(c.group, 'display');
    assert.equal(c.description, 'A project status.');
    assert.equal(c.summary, 'Current project state.');
    const { cardMarkup } = await import('./render.mjs');
    assert.match(cardMarkup(c.examples[0], '/', c), /description="Current project state\."/);
    assert.match(cardMarkup(c.examples[0], '/', c, { reference: true }), /description="The ready state\."/);
    assert.equal(c.attributes[0].description, 'The current status.');
    assert.equal(c.attributes[0].default, 'Ready');
    assert.equal(c.examples[0].title, 'Ready');
    assert.equal(c.examples[0].id, 'acme-design/acme-status/01-ready');
    assert.deepEqual(c.targets, ['html-next']);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('merge rejects duplicate tags, conflicting categories and missing compound parents', () => {
  const component = { id: 'a/acme-status', package: 'a', tag: 'acme-status', group: 'display', examples: [] };
  const catalog = { schemaVersion: 1, package: 'a', groups: [], components: [component] };
  assert.throws(() => mergeCatalogs([core, catalog, { ...catalog, package: 'b', components: [{ ...component, id: 'b/acme-status', package: 'b' }] }]), /Duplicate.*acme-status.*a\/acme-status.*b\/acme-status/i);
  assert.throws(() => mergeCatalogs([core, { ...catalog, groups: [{ id: 'display', label: 'Widgets' }] }]), /category.*display/i);
  assert.throws(() => mergeCatalogs([core, { ...catalog, components: [{ ...component, navigationParent: 'missing' }] }]), /parent.*missing/i);
  assert.throws(() => mergeCatalogs([core, { ...catalog, components: [{ ...component, navigationParent: component.tag }] }]), /parent cycle/i);
  assert.throws(() => mergeCatalogs([core, { ...catalog, components: [{ ...component, tag: '../../../outside' }] }]), /invalid component tag/i);
  const example = { id: 'a/acme-status/default', markup: '<acme-status></acme-status>' };
  assert.throws(() => mergeCatalogs([core, { ...catalog, components: [{ ...component, examples: [example, example] }] }]), /duplicate example/i);
});

test('published catalog contains portable resources, authored APIs and browser-ready behavior', async () => {
  const { readCatalog } = await import('./catalog.mjs');
  const catalog = await readCatalog(new URL('../../docs/catalog.json', import.meta.url));
  const merged = mergeCatalogs([catalog]);
  assert.ok(merged.components.length > 75);
  const button = merged.components.find(c => c.tag === 'ui-button');
  assert.ok(button.attributes.find(prop => prop.name === 'variant').description.includes('Emphasis'));
  const examples = merged.components.flatMap(c => c.examples);
  assert.ok(examples.length > 290);
  for (const example of examples) {
    if (example.behavior) {
      assert.ok(example.behavior.startsWith('@threadlabs/looma/docs/examples/'));
      const { readFile } = await import('node:fs/promises');
      const code = await readFile(new URL('../../docs/' + example.behavior.slice('@threadlabs/looma/docs/'.length), import.meta.url), 'utf8');
      assert.ok(code.includes('export'));
    }
    assert.ok(!JSON.stringify(example).includes('/Users/'));
  }
});
