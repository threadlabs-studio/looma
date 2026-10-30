import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { generateComponentApiMetadata } from './component-api-generator.mjs';
import { readExamples, titleOf } from '../../packages/looma/tooling/docs/catalog.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const packageRoot = path.join(repo, 'packages/looma');

/** Publish self-contained data and browser companions, not repository-only generator imports. */
export async function buildDocsCatalog() {
  const output = path.join(packageRoot, 'docs');
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  for (const file of await readdir(path.join(packageRoot, 'tooling/docs'))) {
    if (file.endsWith('.test.mjs')) continue;
    await cp(path.join(packageRoot, 'tooling/docs', file), path.join(output, file), { recursive: true });
  }
  const { groups, components } = await generateComponentApiMetadata();
  const ts = createRequire(path.join(packageRoot, 'package.json'))('typescript');
  const entries = [];
  for (const api of components) {
    const id = `${api.package}/${api.tag}`;
    const examples = await readExamples(path.join(packageRoot, 'src/components', api.tag, 'examples'), id);
    for (const example of examples) {
      if (!example.behavior) continue;
      const destination = `examples/${api.tag}/examples/${example.name}.behavior.js`;
      await mkdir(path.dirname(path.join(output, destination)), { recursive: true });
      const source = await readFile(example.behavior, 'utf8');
      await writeFile(path.join(output, destination), ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replace(/((?:from\s*|import\s*)["'])(\.[^"']+)(["'])/g, (_, lead, target, quote) => lead + target.replace(/\.ts$/, '.js').replace(/\.behavior$/, '.behavior.js') + quote));
      example.behavior = `@threadlabs/looma/docs/${destination}`;
    }
    entries.push({ ...api, id, title: api.title ?? titleOf(api.tag), resource: `${api.package}/components/${api.tag}/${api.tag}.html`, targets: ['html-next', 'vue', 'react', 'svelte'], examples });
  }
  const manifest = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
  const resources = [];
  for (const tag of await readdir(path.join(packageRoot, 'src/components'))) {
    try { await readFile(path.join(packageRoot, 'src/components', tag, `${tag}.html`)); }
    catch (error) { if (['ENOENT', 'ENOTDIR'].includes(error.code)) continue; throw error; }
    resources.push({ tag, package: manifest.name, resource: `${manifest.name}/components/${tag}/${tag}.html` });
  }
  const catalog = { resources, schemaVersion: 1, package: manifest.name, version: manifest.version, groups, components: entries };
  await writeFile(path.join(output, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
  return catalog;
}
