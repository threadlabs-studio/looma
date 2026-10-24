import { createHash } from 'node:crypto';
import { escapeHtml as escape } from './catalog.mjs';

const literal = value => escape(value).replaceAll('{', '\\{');
const code = value => `<code>${literal(value ?? '—')}</code>`;
const table = (head, rows) => `<table><thead><tr>${head.map(h => `<th>${literal(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(value => `<td>${value}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
export const exampleKey = id => createHash('sha256').update(id).digest('hex').slice(0, 20);
export const componentPath = component => `/components/${component.navigationParent ?? component.tag}/` + (component.navigationParent ? `#${component.tag}-api` : '');
export const previewPath = example => `/_looma/preview/${exampleKey(example.id)}/`;

export function apiBody(api, prefix = '') {
  const attributes = api.attributes ?? [];
  const properties = api.properties ?? [];
  const events = api.events ?? [];
  const slots = api.slots ?? [];
  const tokens = api.designTokens ?? { component: [], shared: [] };
  const section = (name, items, headings, render) => `<h2 id="${prefix}${name.toLowerCase().replaceAll(' ', '-')}">${name}</h2>${items.length ? table(headings, items.map(render)) : `<p>No ${name.toLowerCase()}.</p>`}`;
  const fields = value => value?.length ? `<ul>${value.map(field => `<li>${code(field.path)}: ${code(field.type)}${field.required ? ' (required)' : ''}</li>`).join('')}</ul>` : '';
  return `<p><strong>Package:</strong> ${code(api.package)} · <strong>Native root:</strong> ${code(api.root)}</p>`
    + section('Attributes', attributes, ['Name', 'Description', 'Property', 'Type', 'Default', 'Allowed values'], p => [code(p.name), literal(p.description ?? ''), code(p.property), code(p.type) + fields(p.fields), code(p.default), code(p.options?.join(', '))])
    + (api.targets?.includes('vue') ? section('Framework props', properties, ['Name', 'Type', 'Default', 'Allowed values'], p => [code(p.name), code(p.type) + fields(p.fields), code(p.default), code(p.options?.join(', '))]) : '')
    + section('Events', events, ['Name', 'Detail', 'Description'], e => [code(e.name), code(e.detailSchema ?? e.detailType) + fields(e.fields), literal(e.detailDocs ?? '')])
    + section('Slots', slots, ['Name', 'Purpose'], s => [code(s.name), literal(s.description ?? '')])
    + `<h2 id="${prefix}design-tokens">Design tokens</h2><p>Set shared theme properties on a theme boundary. Component hooks apply only to their owning component.</p>`
    + section('Component tokens', tokens.component ?? [], ['Token', 'Declared values', 'Fallback'], t => [code(t.name), code(t.declarations?.join(' | ')), code(t.fallbacks?.join(' | '))])
    + section('Shared tokens', tokens.shared ?? [], ['Token', 'Fallback'], t => [code(t.name), code(t.fallbacks?.join(' | '))]);
}

function structuredBindings(example) {
  let markup = example.markup;
  const assignments = [];
  for (const pair of (example.bindings ?? '').split(/\s+/).filter(Boolean)) {
    const [attribute, variable] = pair.split('=');
    if (!/^[a-zA-Z_$][\w$]*$/.test(variable ?? '') || !/^[\w-]+$/.test(attribute)) throw new Error(`Invalid example binding ${pair} in ${example.id}.`);
    const match = new RegExp(`<[^>]*\\s${attribute}='([^']*)'[^>]*>`).exec(markup);
    const id = match && /\sid="([^"]+)"/.exec(match[0])?.[1];
    if (!match || !id) throw new Error(`Example binding ${pair} in ${example.id} needs an element with an id.`);
    const value = JSON.parse(match[1].replaceAll('&#39;', "'").replaceAll('&quot;', '"').replaceAll('&amp;', '&'));
    assignments.push({ id, variable, property: attribute.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), value });
    markup = markup.replace(match[0], match[0].replace(` ${attribute}='${match[1]}'`, ''));
  }
  return { markup, assignments };
}

export function exampleCodes(example, component, components) {
  const tags = [...new Set([...example.markup.matchAll(/<([a-z][\w]*-[\w-]+)\b/g)].map(match => match[1]))];
  const owners = [...new Set(tags.map(tag => components.find(c => c.tag === tag)?.package).filter(Boolean))];
  const html = `<script type="module">\n${owners.map(owner => `import ${JSON.stringify(owner)};`).join('\n')}\n</script>\n\n${example.markup}`;
  const codes = { 'html-next': { language: 'html', code: html } };
  if (component.targets?.includes('vue')) {
    const toName = tag => tag.replace(/^ui-/, '').split('-').map(word => word[0].toUpperCase() + word.slice(1)).join('');
    const groups = new Map();
    for (const tag of tags) {
      const entry = components.find(c => c.tag === tag);
      if (!entry?.targets?.includes('vue')) continue;
      const owner = entry.vueImport ?? `${entry.package}/vue${tag.startsWith('ui-editor-') ? '/editor' : ''}`;
      groups.set(owner, [...groups.get(owner) ?? [], toName(tag)]);
    }
    const binding = structuredBindings(example);
    let markup = binding.markup;
    for (const tag of tags) if (components.find(c => c.tag === tag)?.targets?.includes('vue')) markup = markup.replace(new RegExp(`(</?)${tag}(?=[\\s/>])`, 'g'), (_, start) => start + toName(tag));
    for (const assignment of binding.assignments) markup = markup.replace(`id="${assignment.id}"`, `id="${assignment.id}" :${assignment.property}="${assignment.variable}"`);
    const declarations = binding.assignments.map(assignment => `const ${assignment.variable} = ${JSON.stringify(assignment.value, null, 2)};`).join('\n');
    codes.vue = { language: 'vue', code: `<script setup>\n${[...groups].map(([owner, names]) => `import { ${names.sort().join(', ')} } from ${JSON.stringify(owner)};`).join('\n')}\n${declarations}\n</script>\n\n<template>\n${markup}\n</template>` };
  }
  return { ...codes, ...example.frameworks };
}

/** The same card invocation is embedded in reference pages and rendered by the customizer. */
export function cardMarkup(example, base = '/', component = {}) {
  return `<looma-example-card identity="${escape(example.id)}" title="${escape(component.title ?? example.title)}" description="${escape(component.description ?? example.description)}" example-title="${escape(example.title)}" category="${escape(component.group ?? 'forms')}" tag="${escape(component.tag ?? '')}" package-name="${escape(component.package ?? '')}" native-root="${escape(component.root ? `<${component.root}>` : '')}" href="${component.tag ? base + componentPath(component).slice(1) : ''}" src="${base}${previewPath(example).slice(1)}"${example.resizable ? ' resizable' : ''}></looma-example-card>`;
}

export function referencePage(component, catalog, cardResource, base) {
  const parts = catalog.components.filter(c => c.navigationParent === component.tag);
  const examples = [...component.examples, ...parts.flatMap(part => part.examples)];
  const codes = example => {
    const owner = catalog.components.find(c => c.examples.some(e => e.id === example.id)) ?? component;
    const tabs = Object.entries(exampleCodes(example, owner, catalog.components)).map(([mode, value]) => `<section aria-label="${mode === 'vue' ? 'Vue' : 'HTML Next'}"><pre><code class="language-${escape(value.language)}">${literal(value.code)}</code></pre></section>`).join('');
    return `<ui-disclosure summary="Example code"><ui-tabs label="Example syntax" group="syntax">${tabs}</ui-tabs></ui-disclosure>`;
  };
  const body = `<ui-stack gap="xl">${examples.map(example => `<section>${cardMarkup(example, base, catalog.components.find(c => c.examples.some(e => e.id === example.id)) ?? component)}${codes(example)}</section>`).join('')}</ui-stack>`;
  return `---\ntitle: ${JSON.stringify(component.title)}\ndescription: ${JSON.stringify(component.description || `${component.title} component reference.`)}\nid: ${JSON.stringify(component.id)}\n---\n\n# ${escape(component.title)}\n\n${escape(component.description)}\n\n<link rel="component" href="${cardResource}">\n<link rel="component" href="${cardResource.replace(/card\.html$/, 'reference.html')}">\n<link rel="component" href="@threadlabs/looma/components/ui-tabs/ui-tabs.html">\n<link rel="component" href="@threadlabs/looma/components/ui-disclosure/ui-disclosure.html">\n<link rel="component" href="@threadlabs/looma/components/ui-stack/ui-stack.html">\n\n<looma-reference>\n\n:::: tabs\n== Examples\n\n${body}\n\n== API\n\n<h2 id="api">API</h2>\n${apiBody(component)}\n${parts.map(part => `<h2 id="${part.tag}-api">${literal(part.title)} API</h2><p>${literal(part.description)}</p>${apiBody(part, part.tag + '-')}`).join('\n')}\n::::\n\n</looma-reference>\n`;
}
