import { createHash } from 'node:crypto';
import { escapeHtml as escape } from './catalog.mjs';
import { parse } from 'expressmark';
import { renderHtml } from 'expressmark/render';
import { parseFragment } from 'parse5';
import { frameworkExamples, frameworkLabels } from './framework-examples.mjs';

const descriptionDocument = description => parse(description ?? '', { syntax: 'standard' });
// This HTML enters Markdown again. Entities protect rendered text from a second
// interpretation; existing entities stay intact. Markupress owns final HTML Next escaping.
const descriptionHtml = description => renderHtml(descriptionDocument(description), { escapeText: html => html.replace(/[!-/:-@[-`{-~]/g, character => character === '&' || character === ';' ? character : `&#${character.codePointAt(0)};`) }).replaceAll('\n', '&#10;');
function descriptionText(node) {
  if (node.nodeName === '#text') return node.value;
  if (node.tagName === 'img') return node.attrs.find(attribute => attribute.name === 'alt')?.value ?? '';
  if (node.tagName === 'br') return '\n';
  return (node.childNodes ?? []).map(descriptionText).join(node.nodeName === '#document-fragment' ? ' ' : '');
}
export const cardDescription = description => descriptionText(parseFragment(renderHtml(descriptionDocument(description)))).split(/(?<=[.!?])\s/)[0];

const literal = value => escape(value).replaceAll('{', '\\{');
const code = value => `<code>${escape(value ?? '—')}</code>`;
const table = (head, rows) => `<table><thead><tr>${head.map(h => `<th>${literal(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(value => `<td>${value}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
export const exampleKey = id => createHash('sha256').update(id).digest('hex').slice(0, 20);
export const componentPath = component => `/${component.group === 'editor' ? 'editor' : 'components'}/${component.navigationParent ?? component.tag}/` + (component.navigationParent ? `#${component.tag}-api` : '');
export const previewTag = example => `looma-preview-${exampleKey(example.id)}`;
export const previewMarkup = (example, namespace, base = '/', layout = false) => `<div slot="preview"><div data-preview="${escape(example.id)}"${layout || example.stretch ? ' data-preview-layout' : ''}>${scopedExampleMarkup(example, base, namespace)}</div></div>`;
export function exampleResources(examples, catalog) {
  const resources = new Map([...catalog.resources ?? [], ...catalog.components].map(resource => [resource.tag, resource.resource]));
  const tags = [...new Set(examples.flatMap(example => [...example.markup.matchAll(/<([a-z][\w]*-[\w-]+)\b/g)].map(match => match[1])))];
  return tags.filter(tag => resources.has(tag)).map(tag => `<link rel="component" href="${escape(resources.get(tag))}">`).join('\n');
}

/** Keep authored ID relationships local when several examples share one document. */
export function scopedExampleMarkup(example, base = '/', namespace) {
  const ids = new Set([...example.markup.matchAll(/\sid=["']([^"']+)["']/g)].map(match => match[1]));
  const destinations = [...new Set([...example.markup.matchAll(/\bhref=["']#([^"']+)["']/g)].map(match => match[1]))].filter(id => !ids.has(id));
  const markup = example.markup.replaceAll('src="/_looma/', `src="${base}_looma/`) + destinations.map(id => `<span id="${escape(id)}" hidden></span>`).join('');
  return markup.replace(/<([a-z][\w:-]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi, (tag, name, attributes) => {
    if (name === 'img') attributes = attributes.replace(/\ssrc="([^"]*\/_looma\/[^"]*)"/, (_, url) => ` from:src="${escape(JSON.stringify(url))}"`);
    const scoped = attributes.replace(/\s(id|for|commandfor|popovertarget|aria-labelledby|aria-describedby|aria-controls|aria-owns|aria-activedescendant|list|form|headers|href|name)\s*=\s*(["'])(.*?)\2/gi, (attribute, key, quote, value) => {
      if (key === 'name' && !['ui-radio', 'ui-radio-group'].includes(name) && !(name === 'input' && /\btype=["']radio["']/.test(attributes))) return attribute;
      if (!value || key === 'href' && !value.startsWith('#')) return attribute;
      if (namespace) {
        const scopedValue = (key === 'href' ? '#' : '') + value.replace(/^#/, '').split(/\s+/).map(id => `${namespace}-${id}`).join(' ');
        return `${key === 'id' && !/\bdata-example-id=/.test(attributes) ? ` data-example-id="${escape(value)}"` : ''} ${key}="${escape(scopedValue)}"`;
      }
      const values = value.replace(/^#/, '').split(/\s+/);
      const binding = values.map(id => `concat($namespace, '-', ${JSON.stringify(id)})`).join(', " ", ');
      const source = key === 'href' ? `concat('#', ${binding})` : values.length > 1 ? `concat(${binding})` : `concat($namespace, '-', ${JSON.stringify(value)})`;
      return `${key === 'id' && !/\bdata-example-id=/.test(attributes) ? ` data-example-id="${escape(value)}"` : ''} from:${key}="${escape(source)}"`;
    });
    return `<${name}${scoped}>`;
  });
}

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

export const exampleCodes = (example, component, components) => frameworkExamples(example, components);

/** The same card invocation is embedded in reference pages and rendered by the customizer. */
export function cardMarkup(example, base = '/', component = {}, { reference = false, code: exampleCode = '' } = {}) {
  return `<looma-example-card identity="${escape(example.id)}"${reference ? ' reference' : ''} title="${escape(component.title ?? example.title)}" description="${escape(reference ? example.description : cardDescription(component.summary ?? component.description ?? example.description))}" example-title="${escape(example.title)}" category="${escape(component.group ?? 'forms')}" tag="${escape(component.tag ?? '')}" package-name="${escape(component.package ?? '')}" native-root="${escape(component.root ? `<${component.root}>` : '')}" href="${component.tag ? base + componentPath(component).slice(1) : ''}"${example.resizable ? ' resizable' : ''}>${previewMarkup(example, `${reference ? 'reference' : 'catalog'}-${exampleKey(example.id)}`, base, component.group === 'layout')}${reference ? `<div slot="heading" class="looma-example-heading"><h3 id="example-${exampleKey(example.id)}">${escape(example.title)}</h3><p>${escape(example.description)}</p></div>` : ''}${exampleCode}</looma-example-card>`;
}

export function referencePage(component, catalog, cardResource, base) {
  const parts = catalog.components.filter(c => c.navigationParent === component.tag);
  const examples = [...component.examples, ...parts.flatMap(part => part.examples)];
  const codes = example => {
    const owner = catalog.components.find(c => c.examples.some(e => e.id === example.id)) ?? component;
    // Blank lines let Markupress parse real fences inside the projected HTML slots.
    // A fence longer than any authored run keeps snippets literal, including nested fences.
    const tabs = Object.entries(exampleCodes(example, owner, catalog.components)).map(([mode, value]) => {
      const fence = '~'.repeat(Math.max(3, ...[...value.code.matchAll(/~+/g)].map(match => match[0].length + 1)));
      const language = /^[\w+-]+$/.test(value.language) ? value.language : 'text';
      return `<section aria-label="${frameworkLabels[mode]}"><div data-theme="dark" style="--ui-surface-sunken: #0d1117">\n\n${fence}${language}\n${value.code}\n${fence}\n\n</div></section>`;
    }).join('\n');
    return `<ui-tabs slot="code" label="Example syntax" group="syntax" style="--ui-tabs-panel-padding: 0px">${tabs}</ui-tabs>`;
  };
  const body = `<div class="looma-reference-examples"><ui-stack gap="xl">${examples.map(example => `<ui-card as="section" variant="subtle" padding="lg">${cardMarkup(example, base, catalog.components.find(c => c.examples.some(e => e.id === example.id)) ?? component, { reference: true, code: codes(example) })}</ui-card>`).join('')}</ui-stack></div>`;
  return `---\ntitle: ${JSON.stringify(component.title)}\ndescription: ${JSON.stringify(component.description || `${component.title} component reference.`)}\nid: ${JSON.stringify(component.id)}\n---\n\n# ${escape(component.title)}\n\n<div class="component-description">${descriptionHtml(component.description)}</div>\n\n<link rel="component" href="${cardResource}">\n${exampleResources(examples, catalog)}\n<link rel="component" href="${cardResource.replace(/card\.html$/, 'reference.html')}">\n<link rel="component" href="@threadlabs/looma/components/ui-card/ui-card.html">\n<link rel="component" href="@threadlabs/looma/components/ui-tabs/ui-tabs.html">\n<link rel="component" href="@threadlabs/looma/components/ui-disclosure/ui-disclosure.html">\n<link rel="component" href="@threadlabs/looma/components/ui-stack/ui-stack.html">\n\n<looma-reference>\n\n<div class="looma-reference-tabs"><ui-tabs label="Component reference" style="--ui-tabs-panel-padding: 0px; --ui-tabs-tab-min-block-size: var(--ui-control-size-lg)"><section aria-label="Examples">${body}</section><section aria-label="API"><h2 id="api">API</h2>\n${apiBody(component)}\n${parts.map(part => `<h2 id="${part.tag}-api">${literal(part.title)} API</h2><p>${literal(part.description)}</p>${apiBody(part, part.tag + '-')}`).join('\n')}</section></ui-tabs></div>\n\n</looma-reference>\n`;
}
