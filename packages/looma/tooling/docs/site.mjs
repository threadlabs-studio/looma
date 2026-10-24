import { cp, mkdir, readFile, readdir, realpath, rename, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { discoverComponents, escapeHtml, mergeCatalogs, readCatalog, readJson } from './catalog.mjs';
import { cardMarkup, componentPath, exampleKey, previewPath, referencePage } from './render.mjs';
import { defaultRecipe, themeCSS } from './theme.mjs';
import { customizerResource } from './customizer-render.mjs';
import { catalogResource } from './catalog-view.mjs';
import { cacheDirectory, rejectSymlink, withBuildLock } from './workspace.mjs';

const own = name => fileURLToPath(new URL(name, import.meta.url));
/** Resolve import-only optional tooling peers in the consumer's ESM package scope. */
export async function tool(name, root) {
  if (!['markupress', '@nextwebwg/htmlkit', 'vite'].includes(name)) throw new Error(`Unknown documentation tool ${name}.`);
  const directory = await cacheDirectory(root, 'tooling');
  const file = path.join(directory, name.replaceAll('/', '-').replace('@', '') + '.mjs');
  await rejectSymlink(file);
  const temporary = file + '.' + randomUUID() + '.tmp';
  try { await writeFile(temporary, `export * from ${JSON.stringify(name)};\n`, { flag: 'wx' }); await rename(temporary, file); }
  finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
  return import(pathToFileURL(file).href);
}
const normalizeBase = base => '/' + String(base ?? '/').replace(/^\/+|\/+$/g, '') + (String(base ?? '/').replaceAll('/', '') ? '/' : '');
const relativeHref = (from, to) => path.relative(path.dirname(from), to).split(path.sep).join('/');

async function authoredFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await authoredFiles(file)); else files.push(file);
  }
  return files;
}

/** Prepare a disposable documentation tree from published catalogs and opted-in project roots. */
export async function prepareDocumentation({ root, config = {}, catalog }) {
  root = await realpath(path.resolve(root));
  const base = normalizeBase(config.base);
  const catalogs = [catalog ?? await readCatalog()];
  for (const entry of config.catalogs ?? []) {
    const file = entry.startsWith('.') || path.isAbsolute(entry) ? path.resolve(root, entry) : createRequire(path.join(root, 'package.json')).resolve(entry);
    catalogs.push(await readCatalog(file));
  }
  for (const entry of config.components ?? []) catalogs.push(await discoverComponents({ root, ...entry }));
  const combined = mergeCatalogs(catalogs, { categories: config.categories });
  for (const component of combined.components) {
    component.examples = component.examples.length ? component.examples : [{ id: `${component.id}/default`, name: 'default', title: component.title, description: component.description, markup: `<${component.tag}></${component.tag}>`, frameworks: {}, resizable: false }];
  }
  const generated = await cacheDirectory(root, 'generated');
  const output = path.resolve(root, config.outDir ?? '.looma/site');
  if (output === generated || output.startsWith(generated + path.sep)) throw new Error('Choose an output directory outside .looma/generated, which owns disposable source files.');
  await rm(generated, { recursive: true, force: true });
  await mkdir(generated, { recursive: true });
  let content = path.join(generated, 'docs');
  if (config.content) {
    const relative = path.relative(root, path.resolve(root, config.content));
    if (!relative || relative.startsWith('..' + path.sep) || path.isAbsolute(relative) || relative.split(path.sep).includes('.looma')) throw new Error('Authored content must be a directory inside the project, outside .looma.');
    const mirror = path.join(generated, 'project');
    await rm(mirror, { recursive: true, force: true });
    // Preserve every relative dependency path without copying the project or rewriting code examples.
    const mirrorParents = async (source, target, parts) => {
      await mkdir(target, { recursive: true });
      for (const entry of await readdir(source, { withFileTypes: true })) {
        if (['.looma', '.git', 'node_modules', 'package.json'].includes(entry.name)) continue;
        const original = path.join(source, entry.name), mirrored = path.join(target, entry.name);
        if (entry.name === parts[0]) {
          if (parts.length > 1) await mirrorParents(original, mirrored, parts.slice(1));
        } else await symlink(original, mirrored, entry.isDirectory() ? 'dir' : 'file');
      }
    };
    await mirrorParents(root, mirror, relative.split(path.sep));
    content = path.join(mirror, relative);
  }
  const previews = path.join(generated, 'previews');
  await rm(content, { recursive: true, force: true });
  await rm(previews, { recursive: true, force: true });
  await mkdir(path.join(content, 'components'), { recursive: true });
  await mkdir(previews, { recursive: true });
  const card = path.join(generated, 'card.html');
  await cp(own('card.html'), card);
  await cp(own('card.js'), path.join(generated, 'card.js'));
  await writeFile(path.join(generated, 'catalog-view.html'), catalogResource(combined.groups));
  await cp(own('catalog-view.js'), path.join(generated, 'catalog-view.js'));
  await cp(own('preview.js'), path.join(generated, 'preview.js'));
  for (const file of ['reference.html', 'reference.js']) await cp(own(file), path.join(generated, file));
  for (const file of ['customizer.js', 'theme.mjs', 'theme-session.mjs', 'value-editors.mjs']) await cp(own(file), path.join(generated, file));
  const write = async (file, source) => { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, source); };
  const examples = [];
  // HTMLKit route groups retain their labels/order in navigation without changing public URLs.
  const groupDirectories = new Map(combined.groups.map((group, index) => [group.id,
    `${String(index + 1).padStart(2, '0')}.(${group.label.replace(/[\\/()]/g, '-')})`]));
  const generatedReferences = new Set();
  const resourceByTag = new Map(combined.resources.map(resource => [resource.tag, resource]));
  for (const component of combined.components) {
    if (!component.navigationParent) {
      const section = component.group === 'editor' ? ['editor'] : ['components', groupDirectories.get(component.group)];
      const page = path.join(content, ...section, component.tag + '.md');
      await write(page, referencePage(component, combined, relativeHref(page, card), base));
      generatedReferences.add(`${component.group === 'editor' ? 'editor' : 'components'}/${component.tag}.md`);
    }
    for (const example of component.examples) {
      const key = exampleKey(example.id);
      const file = path.join(previews, key + '.html');
      const tags = [...new Set([...example.markup.matchAll(/<([a-z][\w]*-[\w-]+)\b/g)].map(match => match[1]))];
      const links = tags.filter(tag => resourceByTag.has(tag)).map(tag => `<link rel="component" href="${escapeHtml(resourceByTag.get(tag).resource)}">`).join('\n');
      // Navigation specimens name destinations supplied by their host application. Give those
      // fragments local stand-ins inside the isolated stage; keep real documentation links checked.
      const declaredIds = new Set([...example.markup.matchAll(/\sid=["']([^"']+)["']/g)].map(match => match[1]));
      const destinations = [...new Set([...example.markup.matchAll(/\bhref=["']#([^"']+)["']/g)].map(match => match[1]))].filter(id => !declaredIds.has(id));
      const anchors = destinations.map(id => `<span id="${escapeHtml(id)}" hidden></span>`).join('');
      const setup = path.join(previews, key + '.js');
      const behavior = example.behavior;
      await write(setup, `import { connect as connectPreview } from '../preview.js';\n${behavior ? `import setupExample from ${JSON.stringify(behavior)};\n` : ''}export function connect(host) { const stopPreview = connectPreview(host); ${behavior ? 'const stopExample = setupExample(host.element);' : ''} return () => { ${behavior ? 'stopExample?.();' : ''} stopPreview(); }; }\n`);
      await write(file, ` ${links}\n<template component="looma-preview-${key}" module="./${key}.js"><defs><meta name="hk:navigation" content="hidden"><title>${escapeHtml(example.title)}</title></defs><div data-preview="${escapeHtml(example.id)}"${component.group === 'layout' ? ' data-preview-layout' : ''}>${example.markup}${anchors}</div></template>\n`);
      examples.push({ ...example, file, component: component.id, path: base + previewPath(example).slice(1) });
    }
  }
  const gallery = combined.groups.map(group => {
    const components = combined.components.filter(c => c.group === group.id && !c.navigationParent);
    return components.length ? `<section data-catalog-group="${escapeHtml(group.id)}">\n\n## ${escapeHtml(group.label)}\n\n<ui-grid columns="3" min="sm">${components.map(component => `<div data-category="${escapeHtml(component.group)}" data-catalog-search="${escapeHtml(`${component.tag} ${component.title} ${component.description}`)}">${cardMarkup(component.examples[0], base, component)}</div>`).join('')}</ui-grid>\n\n</section>` : '';
  }).join('\n\n');
  await write(path.join(content, 'components/index.md'), `---\ntitle: Components\n---\n\n# Components\n\nExplore the live examples that also power your theme customizer.\n\n<link rel="component" href="${relativeHref(path.join(content, 'components/index.md'), card)}">\n<link rel="component" href="@threadlabs/looma/components/ui-grid/ui-grid.html">\n<link rel="component" href="${relativeHref(path.join(content, 'components/index.md'), path.join(generated, 'catalog-view.html'))}">\n\n<looma-catalog>\n\n${gallery}\n\n</looma-catalog>\n`);
  await write(path.join(content, 'index.md'), `---\ntitle: ${JSON.stringify(config.title ?? 'Your design system')}\n---\n\n# ${config.title ?? 'Your design system'}\n\nWeave your design system from Looma and your own HTML Next components.\n\n[Explore components](/components/) · [Customize your theme](/customize/)\n`);
  if (combined.components.some(component => component.group === 'editor')) await write(path.join(content, 'editor.md'), `---\ntitle: Editor\n---\n\n# Editor\n\nWriting tools and editor components, separate from the general component reference.\n\n${combined.components.filter(component => component.group === 'editor' && !component.navigationParent).map(component => `- [${component.title}](${componentPath(component)})`).join('\n')}\n`);
  await write(path.join(content, 'design-system.md'), await readFile(own('README.md'), 'utf8'));
  if (config.content) {
    const authored = path.resolve(root, config.content);
    for (const source of await authoredFiles(authored)) {
      const target = path.join(content, path.relative(authored, source));
      const publicPath = path.relative(authored, source).split(path.sep)
        .filter(segment => !/^\d+\.\([^)]*\)$/.test(segment)).map(segment => segment.replace(/^\d+\./, '')).join('/');
      if (generatedReferences.has(publicPath)) throw new Error(`Authored/generated documentation collision: ${source} would replace a generated component reference. Add guidance under another path.`);
      let exists = false;
      try { await readFile(target); exists = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
      // A project's landing page and footer are branding/content, never API overrides.
      if (exists && !['index.md', 'editor.md', '_footer.md'].includes(path.relative(content, target))) throw new Error(`Authored/generated documentation collision: ${source} would replace ${target}. Add guidance under another path.`);
      await mkdir(path.dirname(target), { recursive: true }); await cp(source, target);
    }
  }
  const customizer = path.join(generated, 'customizer.html');
  await write(customizer, customizerResource({ catalog: combined, config, base }, config.recipe));
  const customizerPage = path.join(content, 'customize.md');
  await write(customizerPage, `---\ntitle: Customize\n---\n\n# Weave your design system\n\n<link rel="component" href="${relativeHref(customizerPage, customizer)}">\n<looma-customizer></looma-customizer>\n`);
  await write(path.join(generated, 'catalog.json'), JSON.stringify(combined));
  const redirects = {};
  for (const component of combined.components) {
    const target = componentPath(component);
    redirects[`/components/${component.group}/${component.tag}/`] = target;
    if (component.navigationParent) redirects[`/parts/${component.tag}/`] = target;
  }
  return { root, config, base, catalog: combined, examples, generated, content, previews, redirects };
}

/** Bundle validated theme restoration into HTMLKit's before-paint head hook. */
async function themeBootstrap(site) {
  const { build } = await tool('vite', site.root);
  const entry = path.join(site.generated, 'theme-bootstrap.mjs');
  const baseline = site.config.recipe ?? { schemaVersion: 1, values: {} };
  await writeFile(entry, `import { installDocumentationTheme } from './theme-session.mjs';\nimport systemCSS from '@threadlabs/looma/theme-system.css?inline';\ninstallDocumentationTheme(window, { base: ${JSON.stringify(site.base)}, baseline: ${JSON.stringify(baseline)}, systemCSS });\n`);
  const bundled = await build({ root: site.root, configFile: false, logLevel: 'silent', build: { write: false, minify: true, lib: { entry, name: 'LoomaDocumentationTheme', formats: ['iife'] } } });
  return (Array.isArray(bundled) ? bundled[0] : bundled).output.find(file => file.type === 'chunk').code;
}

/** One plugin powers both the public consumer and local repositories. */
export function documentationPlugin(site) {
  return {
    name: 'looma-design-system',
    buildEnd: context => isolatePreviewScripts(site, context),
    generate: async () => ({ '/_looma/theme-system.css': await readFile(fileURLToPath(import.meta.resolve('@threadlabs/looma/theme-system.css')), 'utf8') }),
    config: () => ({ pages: [{ dir: path.relative(site.root, site.previews), prefix: '/_looma/preview/', layout: false }], css: [own('documentation.css')] }),
  };
}

export async function documentationOptions(site) {
  const { siteOptions } = await tool('markupress', site.root);
  const styles = ['tokens.css', 'theme-light.css', 'theme-dark.css', 'theme-system.css'].map(file => fileURLToPath(import.meta.resolve(`@threadlabs/looma/${file}`)));
  const options = siteOptions({ root: site.root, contentDir: path.relative(site.root, site.content), title: site.config.title ?? 'Your design system', base: site.base, outDir: site.config.outDir ?? 'site', ...(site.config.origin ? { origin: site.config.origin } : {}), ...(site.config.logo ? { logo: site.config.logo } : {}), ...(site.config.nav ? { nav: site.config.nav } : {}) }, { plugins: [documentationPlugin(site)], css: styles, redirects: site.redirects });
  const savedTheme = path.join(site.generated, 'saved-theme.css');
  await writeFile(savedTheme, site.config.themeCSSContents ?? themeCSS(site.config.recipe ?? defaultRecipe()));
  const themeStyles = [savedTheme, ...await portableThemeStyles(site)];
  return { ...options, plugins: [...options.plugins, { name: 'looma-saved-theme', config: () => ({ css: themeStyles }) },
    // Markupress supplies its head script in its own config hook; compose after it.
    { name: 'looma-browser-theme', config: async current => ({ headScript: [current.headScript, await themeBootstrap(site)].filter(Boolean).join('\n;\n') }) }] };
}

/** Opaque example frames cannot fetch local fonts without host-specific CORS headers.
 * Bundle those font files into theme CSS for both the local server and static output. */
async function portableThemeStyles(site) {
  const overrides = site.config.overrides ?? [];
  if (!overrides.length) return [];
  const { build } = await tool('vite', site.root);
  const entry = path.join(site.generated, 'theme-entry.css');
  await writeFile(entry, overrides.map(file => `@import ${JSON.stringify(path.resolve(site.root, file))};`).join('\n'));
  const bundled = await build({ root: site.root, base: './', configFile: false, logLevel: 'silent',
    build: { write: false, minify: false, cssMinify: false,
      assetsInlineLimit: file => /\.(woff2?|ttf|otf)$/i.test(file),
      rollupOptions: { input: entry, output: { assetFileNames: 'theme-assets/[name]-[hash][extname]' } } } });
  const styles = [];
  for (const output of (Array.isArray(bundled) ? bundled[0] : bundled).output) {
    if (output.type !== 'asset') continue;
    const file = path.join(site.generated, output.fileName);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, output.source);
    if (file.endsWith('.css')) styles.push(file);
  }
  return styles;
}

/** Build through HTMLKit, then make opaque preview scripts portable to static hosts without CORS. */
export async function buildDocumentation({ root = process.cwd(), config = {}, catalog } = {}) {
  return withBuildLock(root, async () => {
    const site = await prepareDocumentation({ root, config, catalog });
    const { buildApplication } = await tool('@nextwebwg/htmlkit', site.root);
    const built = await buildApplication(await documentationOptions(site));
    return { ...built, site };
  });
}

async function isolatePreviewScripts(site, { outDir, writeFile: writeOutput }) {
  const { build } = await tool('vite', site.root);
  // Preview entries and outputs are independent. Keep compiler memory bounded
  // and retain the build lock until every in-flight bundle has settled.
  const remaining = [...site.examples];
  const results = await Promise.allSettled(Array.from({ length: Math.min(2, remaining.length) }, async () => {
    try {
      for (let example; (example = remaining.pop());) {
        const htmlFile = path.join(outDir, '_looma/preview', exampleKey(example.id), 'index.html');
        let html = await readFile(htmlFile, 'utf8');
        const scripts = [...html.matchAll(/<script\b[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g)];
        if (!scripts.length) throw new Error(`No browser module found for isolated preview ${example.id}.`);
        for (const [tag, url] of scripts) {
          const input = path.join(outDir, url.slice(site.base.length));
          const bundle = await build({ configFile: false, logLevel: 'silent', build: { write: false, minify: true, lib: { entry: input, name: 'LoomaPreview', formats: ['iife'] }, rollupOptions: { output: { codeSplitting: false } } } });
          const code = (Array.isArray(bundle) ? bundle[0] : bundle).output.find(output => output.type === 'chunk').code;
          const name = `${exampleKey(example.id)}.js`;
          await writeOutput('_looma/runtime/' + name, code);
          html = html.replace(tag, `<script src="${site.base}_looma/runtime/${name}" defer></script>`);
        }
        html = html.replace(/<link\b[^>]*rel="modulepreload"[^>]*>/g, '');
        await writeFile(htmlFile, html);
      }
    } catch (error) { remaining.length = 0; throw error; }
  }));
  const failed = results.find(result => result.status === 'rejected');
  if (failed) throw failed.reason;
}
