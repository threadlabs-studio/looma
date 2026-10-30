import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const catalogVersion = 1;
export const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
export const titleOf = tag => tag.replace(/^ui-/, '').split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
export async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT' && fallback !== undefined) return fallback; throw error; }
}

/** Authored examples are data during discovery; controllers are never evaluated. */
export async function readExamples(directory, componentId) {
  let files;
  try { files = (await readdir(directory)).sort(); } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  return Promise.all(files.filter(file => /^[^.]+\.html$/.test(file)).map(async file => {
    const name = file.slice(0, -5);
    const source = await readFile(path.join(directory, file), 'utf8');
    const meta = /^<!--\r?\n([\s\S]*?)\r?\n-->\s*/.exec(source);
    if (!meta) throw new Error(`${path.join(directory, file)}: example requires title/description metadata.`);
    const fields = Object.fromEntries(meta[1].split(/\r?\n/).map(line => {
      const at = line.indexOf(':'); return at < 0 ? [] : [line.slice(0, at).trim(), line.slice(at + 1).trim()];
    }).filter(pair => pair.length));
    const frameworks = {};
    for (const [target, extension, language] of [['html-next', '.snippet.html', 'html'], ['vue', '.vue', 'vue'], ['react', '.tsx', 'tsx'], ['svelte', '.svelte', 'svelte']]) {
      if (files.includes(name + extension)) frameworks[target] = { language, code: await readFile(path.join(directory, name + extension), 'utf8') };
    }
    const behavior = files.includes(name + '.behavior.ts') ? path.join(directory, name + '.behavior.ts') : files.includes(name + '.behavior.js') ? path.join(directory, name + '.behavior.js') : undefined;
    return { id: `${componentId}/${name}`, name, title: fields.title ?? name, description: fields.description ?? '', markup: source.slice(meta[0].length).trim(), resizable: fields.preview === 'resizable', ...(fields.preview === 'stretch' ? { stretch: true } : {}), bindings: fields.bind ?? '', frameworks, ...(behavior ? { behavior } : {}) };
  }));
}

async function resources(directory) {
  const result = [];
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'examples') continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await resources(file));
    else if (entry.name.endsWith('.html')) result.push(file);
  }
  return result;
}

/** Discover only explicitly selected roots through HTML Next's public parser. */
export async function discoverComponents({ root, directory, packageName, groups = [] }) {
  if (!packageName || !directory) throw new Error('A discovery root requires packageName and directory.');
  const { parseComponentResource, typeScriptType } = await import('@nextwebwg/html-next');
  const components = [];
  for (const source of await resources(path.resolve(root, directory))) {
    const html = await readFile(source, 'utf8');
    if (!/<template\b[^>]*\bcomponent=/.test(html)) continue;
    const parsed = parseComponentResource(html, source);
    const metadata = await readJson(path.join(path.dirname(source), 'docs.json'), {});
    for (const definition of parsed.definitions) {
      const contract = definition.contract;
      const docs = metadata.components?.[contract.tag] ?? metadata;
      const id = `${packageName}/${contract.tag}`;
      const properties = Object.entries(contract.props).map(([name, prop]) => ({ name, type: typeScriptType(prop.type), description: prop.description ?? '', ...(Object.hasOwn(prop, 'default') ? { default: prop.default } : {}), ...(prop.values ? { options: prop.values } : {}) }));
      const attributes = properties.map(prop => ({ ...prop, property: prop.name, name: prop.name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`) }));
      const events = (definition.declarations ?? []).filter(item => item.kind === 'event').map(event => ({ name: event.name, detailType: event.shape ? typeScriptType(event.shape) : String(event.type), detailDocs: docs.events?.[event.name] ?? '' }));
      const slots = (definition.slots ?? []).map(slot => ({ name: slot.name ?? 'default', description: docs.slots?.[slot.name ?? 'default'] ?? '' }));
      const tokens = [...new Set([...definition.css.matchAll(/var\(\s*(--[\w-]+)/g)].map(match => match[1]))].sort();
      components.push({ id, package: packageName, tag: contract.tag, title: docs.title ?? titleOf(contract.tag), description: docs.description ?? contract.summary ?? '', ...(docs.summary ? { summary: docs.summary } : {}), group: docs.group ?? 'project', ...(docs.navigationParent ? { navigationParent: docs.navigationParent } : {}), root: contract.nativeElement, source, resource: source, targets: ['html-next', 'vue', 'react', 'svelte'], attributes, properties, events, slots, designTokens: { sources: [path.relative(root, source)], component: [], shared: tokens.map(name => ({ name, fallbacks: [] })) }, examples: await readExamples(path.join(path.dirname(source), 'examples'), id) });
    }
  }
  const categories = components.some(component => component.group === 'project') && !groups.some(group => group.id === 'project') ? [...groups, { id: 'project', label: 'Project components' }] : groups;
  return { schemaVersion: catalogVersion, package: packageName, groups: categories, components };
}

/** Merge deterministically, reporting both owners instead of silently shadowing resources. */
export function mergeCatalogs(catalogs, { categories = {} } = {}) {
  const resourceByTag = new Map();
  const exampleOwners = new Map();
  const groups = new Map(); const byId = new Map(); const byTag = new Map();
  for (const catalog of catalogs) {
    if (catalog.schemaVersion !== catalogVersion) throw new Error(`Unsupported documentation catalog version ${catalog.schemaVersion} for ${catalog.package}.`);
    for (const group of catalog.groups ?? []) {
      const mapped = categories[group.id] ?? group.id;
      if (typeof mapped !== 'string' || !/^[a-z][a-z0-9-]*$/.test(mapped)) throw new Error(`Invalid category identity ${JSON.stringify(mapped)} in ${catalog.package}.`);
      const previous = groups.get(mapped);
      if (previous && previous.label !== group.label && mapped === group.id) throw new Error(`Conflicting category ${mapped}: ${previous.label} and ${group.label}. Configure a category mapping explicitly.`);
      if (!previous) groups.set(mapped, { ...group, id: mapped });
    }
    for (const entry of catalog.components) {
      // HTML Next's public component-tag grammar also keeps generated filenames inside their tree.
      if (typeof entry.tag !== 'string' || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/.test(entry.tag)) throw new Error(`Invalid component tag ${JSON.stringify(entry.tag)} in ${catalog.package}.`);
      if (typeof entry.id !== 'string' || !entry.id) throw new Error(`Missing component identity for ${entry.tag} in ${catalog.package}.`);
      const component = { ...entry, group: categories[entry.group] ?? entry.group };
      const previous = byTag.get(component.tag) ?? byId.get(component.id);
      if (previous) throw new Error(`Duplicate component ${component.tag}: ${previous.id} (${previous.source ?? previous.resource}) and ${component.id} (${component.source ?? component.resource}).`);
      byId.set(component.id, component); byTag.set(component.tag, component);
      if (!Array.isArray(component.examples)) throw new Error(`Component ${component.id} requires an examples array.`);
      for (const example of component.examples) {
        if (typeof example.id !== 'string' || !example.id || typeof example.markup !== 'string') throw new Error(`Invalid example identity or markup in ${component.id}.`);
        if (!example.id.startsWith(component.id + '/')) throw new Error(`Example ${example.id} must belong to ${component.id}.`);
        const previous = exampleOwners.get(example.id);
        if (previous) throw new Error(`Duplicate example ${example.id}: ${previous} and ${component.id}.`);
        exampleOwners.set(example.id, component.id);
      }
    }
    for (const entry of [...catalog.resources ?? [], ...catalog.components]) {
      const previous = resourceByTag.get(entry.tag);
      if (previous && (previous.package !== entry.package || previous.resource !== entry.resource)) throw new Error(`Conflicting resource ${entry.tag}: ${previous.resource} and ${entry.resource}.`);
      resourceByTag.set(entry.tag, { tag: entry.tag, package: entry.package, resource: entry.resource });
    }
  }
  const ownerOf = (component, trail = []) => {
    if (trail.includes(component.id)) throw new Error(`Compound parent cycle: ${[...trail, component.id].join(' → ')}.`);
    if (!component.navigationParent) return component;
    const parent = byId.get(component.navigationParent) ?? byTag.get(component.navigationParent);
    if (!parent) throw new Error(`Missing compound parent ${component.navigationParent} for ${component.id}.`);
    return ownerOf(parent, [...trail, component.id]);
  };
  for (const component of byId.values()) {
    if (component.navigationParent) {
      const owner = ownerOf(component);
      component.navigationParent = owner.tag;
      component.group = owner.group;
    }
    if (!groups.has(component.group)) throw new Error(`Unknown category ${component.group} for ${component.id}. Declare its category or map it to an existing one.`);
  }
  return { schemaVersion: catalogVersion, resources: [...resourceByTag.values()], groups: [...groups.values()], components: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id)) };
}

/** Read a published catalog without importing the optional documentation server. */
export async function readCatalog(specifier = new URL('./catalog.json', import.meta.url)) {
  const catalog = await readJson(specifier instanceof URL ? fileURLToPath(specifier) : specifier);
  if (catalog.schemaVersion !== catalogVersion) throw new Error(`Unsupported documentation catalog version ${catalog.schemaVersion}.`);
  return catalog;
}
