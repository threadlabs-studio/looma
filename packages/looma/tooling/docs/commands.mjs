import { watch } from 'node:fs';
import { lstat, open, readFile, realpath, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDocumentation, tool } from './site.mjs';
import { createThemeStore } from './store.mjs';
import { serveLocalDocumentation } from './local-server.mjs';
import { defaultRecipe, themeCSS } from './theme.mjs';

export const configName = 'looma.docs.json';
export async function readConfiguration(root = process.cwd()) {
  root = await realpath(path.resolve(root));
  try { return { root, config: JSON.parse(await readFile(path.join(root, configName), 'utf8')) }; }
  catch (error) { if (error.code === 'ENOENT') throw new Error(`No ${configName} in this project. Run looma-docs init first.`); throw error; }
}

/** Initialization creates explicit owned files, leaving the application's imports to its author. */
export async function initializeDocumentation({ root = process.cwd(), title = 'Your design system' } = {}) {
  root = await realpath(path.resolve(root));
  const config = { title, base: '/', outDir: '.looma/site', theme: { recipe: 'looma.theme.json', css: 'looma.theme.css' }, components: [] };
  const recipe = defaultRecipe();
  const system = await readFile(fileURLToPath(import.meta.resolve('@threadlabs/looma/theme-system.css')), 'utf8');
  const files = new Map([[configName, JSON.stringify(config, null, 2) + '\n'], [config.theme.recipe, JSON.stringify(recipe, null, 2) + '\n'], [config.theme.css, themeCSS(recipe, system)]]);
  for (const name of files.keys()) {
    try { await lstat(path.join(root, name)); throw new Error(`${name} already exists. Initialization will not replace it.`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const created = [];
  try {
    for (const [name, source] of files) {
      const file = path.join(root, name); const handle = await open(file, 'wx', 0o644); created.push(file);
      try { await handle.writeFile(source); } finally { await handle.close(); }
    }
  } catch (error) { await Promise.all(created.map(file => unlink(file))); throw error; }
  return { config, files: [...files.keys()], applicationImport: './' + config.theme.css };
}

async function themeConfiguration(root, config, local = false) {
  if (!config.theme && !local) return config;
  const store = await createThemeStore({ root, ...config.theme });
  const current = await store.read({ includeCSS: true });
  return { ...config, recipe: current.recipe, revision: current.revision, ...(current.css !== null ? { themeCSSContents: current.css } : {}), local };
}
export async function buildProjectDocumentation({ root = process.cwd(), config, catalog } = {}) {
  if (!config) ({ root, config } = await readConfiguration(root));
  return buildDocumentation({ root, config: await themeConfiguration(root, config), catalog });
}
export async function previewProjectDocumentation({ root = process.cwd(), config, port = 3000 } = {}) {
  if (!config) ({ root, config } = await readConfiguration(root));
  const { previewApplication } = await tool('@threadlabs/markupkit', root);
  return previewApplication({ root, outDir: config.outDir ?? '.looma/site', base: config.base ?? '/', host: '127.0.0.1', port });
}

/** MarkupKit serves the build; this local-only gateway adds the constrained repository writer. */
export async function devProjectDocumentation({ root = process.cwd(), config, catalog, port = 3000, onError = console.error } = {}) {
  const configured = Boolean(config);
  if (!config) ({ root, config } = await readConfiguration(root));
  const store = await createThemeStore({ root, ...config.theme });
  let closed = false, dirty = true, building, timer;
  const rebuild = () => {
    clearTimeout(timer);
    if (building) return building;
    building = (async () => {
      while (dirty && !closed) {
        dirty = false;
        if (!configured) {
          const next = (await readConfiguration(root)).config;
          if (['base', 'outDir', 'theme'].some(key => JSON.stringify(next[key]) !== JSON.stringify(config[key]))) throw new Error('The server address, output or theme-file configuration changed. Restart looma-docs dev to use it.');
          config = next;
        }
        await buildDocumentation({ root, config: await themeConfiguration(root, config, true), catalog });
      }
    })().finally(() => { building = undefined; });
    return building;
  };
  await rebuild();
  const upstream = await previewProjectDocumentation({ root, config, port: 0 });
  let gateway;
  try {
    gateway = await serveLocalDocumentation({ upstream: upstream.url, store, base: config.base ?? '/', port, onSaved: async () => { dirty = true; await rebuild(); } });
  } catch (error) { await upstream.close(); throw error; }
  const watcher = watch(root, { recursive: true }, (_event, filename) => {
    if (!filename || closed) return;
    const relative = String(filename).split(path.sep).join('/');
    if (relative.split('/').some(part => part === 'node_modules' || part === '.git' || part === '.looma')) return;
    const output = config.outDir ?? '.looma/site';
    if (relative === output || relative.startsWith(output + '/')) return;
    const inputs = [configName, config.theme?.recipe ?? 'looma.theme.json', config.theme?.css ?? 'looma.theme.css', config.content, ...(config.components ?? []).map(entry => entry.directory), ...(config.overrides ?? [])].filter(Boolean).map(value => value.replace(/^\.\//, ''));
    if (!inputs.some(input => relative === input || relative.startsWith(input + '/'))) return;
    dirty = true;
    clearTimeout(timer); timer = setTimeout(() => { void rebuild().catch(onError); }, 150);
  });
  return { url: gateway.url, close: async () => { closed = true; clearTimeout(timer); watcher.close(); await building?.catch(() => {}); await gateway.close(); await upstream.close(); } };
}
