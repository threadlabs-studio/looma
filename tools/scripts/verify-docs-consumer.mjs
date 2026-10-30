import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

async function run(command, args, cwd) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} exited with ${code}`)));
  });
}
const json = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + '\n');

/** Qualify the shipped product from an isolated install, including its real local writer and watcher. */
export async function verifyDocumentationConsumer(directory, tarball, manifest) {
  const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  await mkdir(directory, { recursive: true });
  await json(path.join(directory, 'package.json'), {
    name: 'looma-documentation-consumer', private: true, type: 'module',
    dependencies: {
      '@threadlabs/looma': `file:${tarball}`, '@nextwebwg/html-next': manifest.peerDependencies['@nextwebwg/html-next'],
      '@threadlabs/markupkit': manifest.peerDependencies['@threadlabs/markupkit'], markupress: manifest.peerDependencies.markupress, vite: manifest.peerDependencies.vite,
    },
  });
  // Fresh per-run metadata sees newly compatible peers; the shared package-file store is still reused.
  await run(pnpm, ['install', '--ignore-scripts', '--strict-peer-dependencies', '--config.auto-install-peers=false', '--prefer-offline', `--config.cache-dir=${path.join(path.dirname(directory), 'registry-metadata')}`], directory);
  await run(pnpm, ['exec', 'looma-docs', 'init', '--title', 'The Fellowship'], directory);
  const config = JSON.parse(await readFile(path.join(directory, 'looma.docs.json'), 'utf8'));
  Object.assign(config, { base: '/system/', content: 'docs', components: [{ directory: 'app/components', packageName: 'fellowship-ui' }] });
  await json(path.join(directory, 'looma.docs.json'), config);
  await mkdir(path.join(directory, 'app/components/office-status'), { recursive: true });
  await writeFile(path.join(directory, 'app/components/office-status/office-status.html'), '<template component="office-status"><defs><prop name="label" type="string" default="Ready">The office status.</prop></defs><p>{$label}</p></template>');
  await json(path.join(directory, 'app/components/office-status/docs.json'), { title: 'Office status', description: 'A Fellowship office status.', group: 'display' });
  await mkdir(path.join(directory, 'docs'));
  await writeFile(path.join(directory, 'docs/index.md'), '# The Fellowship desk\n\n<link rel="component" href="../app/components/office-status/office-status.html">\n\n<office-status label="Ready for second breakfast"></office-status>\n');
  // The docs job builds the complete catalog; this install proves the public builder
  // and authored discovery with one shipped component inside the package job's budget.
  await writeFile(path.join(directory, 'verify-build.mjs'), `
import { readFile } from 'node:fs/promises';
import { readCatalog, buildProjectDocumentation } from '@threadlabs/looma/docs';
const catalog = await readCatalog();
catalog.components = catalog.components.filter(component => component.tag === 'ui-button').map(component => ({ ...component, examples: component.examples.slice(0, 1) }));
const config = JSON.parse(await readFile('looma.docs.json', 'utf8'));
await buildProjectDocumentation({ root: process.cwd(), config, catalog });
`);
  await run(process.execPath, ['verify-build.mjs'], directory);
  const output = path.join(directory, '.looma/site');
  assert.match(await readFile(path.join(output, 'index.html'), 'utf8'), /Ready for second breakfast/);
  const reference = await readFile(path.join(output, 'components/office-status/index.html'), 'utf8');
  assert.match(reference, /The office status\./);
  assert.doesNotMatch(reference, /<h2[^>]*>Framework props<\/h2>/);
  assert.match(await readFile(path.join(output, 'customize/index.html'), 'utf8'), /data-mode="public"/);
  await writeFile(path.join(directory, 'verify-local.mjs'), `
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readCatalog, devProjectDocumentation, startingPoints } from '@threadlabs/looma/docs';
const config = JSON.parse(await readFile('looma.docs.json', 'utf8'));
const catalog = await readCatalog();
catalog.components = catalog.components.filter(component => component.tag === 'ui-button').map(component => ({ ...component, examples: component.examples.slice(0, 1) }));
const server = await devProjectDocumentation({ root: process.cwd(), config, catalog, port: 0 });
try {
  const origin = new URL(server.url).origin;
  const session = await (await fetch(server.url + '_looma/session', { headers: { Origin: origin } })).json();
  const saved = await fetch(server.url + '_looma/theme', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-Looma-Capability': session.capability }, body: JSON.stringify({ recipe: startingPoints.night, revision: session.revision }) });
  assert.equal(saved.status, 200, await saved.text());
  assert.equal(JSON.parse(await readFile('looma.theme.json', 'utf8')).values.canvas, '#11141c');
  assert.match(await readFile('looma.theme.css', 'utf8'), /pow\\(1 \\/ 7/);
  const loaded = await (await fetch(server.url + '_looma/session', { headers: { Origin: origin } })).json();
  assert.equal(loaded.recipe.values.canvas, '#11141c');
  await mkdir('app/components/office-note');
  await writeFile('app/components/office-note/office-note.html', '<template component="office-note"><p>Sam booked second breakfast.</p></template>');
  const deadline = Date.now() + 30_000;
  let discovered = false;
  while (Date.now() < deadline) {
    const page = await fetch(server.url + 'components/office-note/');
    if (page.status === 200) {
      const html = await page.text();
      if (!html.includes('<iframe') && html.includes('Sam booked second breakfast.')) { discovered = true; break; }
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(discovered, 'a newly authored component must appear without restarting dev');
} finally { await server.close(); }
`);
  await run(process.execPath, ['verify-local.mjs'], directory);
  console.log('Installed documentation CLI, discovery, theme saving and reload passed without peer overrides.');
}
