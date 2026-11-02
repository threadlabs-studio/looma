import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Real source contracts drive the fixture facade, including internal components. */
export async function sourceCatalog() {
  const core = process.env.LOOMA_HTMLNEXT_ROOT
    ? await import(pathToFileURL(path.join(process.env.LOOMA_HTMLNEXT_ROOT, 'packages/html-next/dist/index.js')).href)
    : await import('@nextwebwg/html-next');
  const source = new URL("../../src/components/", import.meta.url);
  const definitions = [];
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const folder = new URL(entry.name + '/', source);
    for (const name of await readdir(folder)) if (name.endsWith('.html')) {
      const file = new URL(name, folder);
      definitions.push(...core.parseComponentResource(await readFile(file, 'utf8'), file.pathname).definitions);
    }
  }
  return { core, definitions };
}

export async function componentFixtures(target, catalog = undefined) {
  const { core, definitions } = catalog ?? await sourceCatalog();
  const graph = new Map(definitions.map(definition => [definition.contract.tag, definition]));
  return definitions.map(definition => {
    const contract = definition.contract;
    const events = (definition.declarations ?? []).filter(declaration => declaration.kind === 'event').map(event => {
      const type = event.shape ?? core.parseTypeExpression(event.type);
      return { name: event.name, fields: type.kind === 'object' ? type.fields.map(field => field.name) : [] };
    });
    const requests = Object.keys(contract.requests ?? {});
    return {
      name: contract.name, tag: contract.tag, kind: 'component', inputs: Object.keys(contract.props), requests,
      props: [...Object.keys(contract.props), ...requests.flatMap(name => [name.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), 'on' + name.split('-').map(part => part[0].toUpperCase() + part.slice(1)).join('')])],
      events, slots: [...new Set([...(definition.slots ?? []).map(slot => slot.name ?? ""), ...Object.keys(contract.slots ?? {})])].map(name => ({ name, props: Object.keys(contract.slots?.[name]?.props ?? {}) })),
      nativeControl: ['input', 'textarea', 'select'].includes(definition.template.name),
      ...(target === 'angular' ? { nativeHost: core.angularHostTag(definition, graph) } : {}),
    };
  });
}

export function componentFacade(components, implementations, target) {
  return `import * as implementations from ${JSON.stringify(implementations)};\nexport const rendererTarget = ${JSON.stringify(target)};\n${components.map(component => `export const ${component.name} = { ...${JSON.stringify(component)}, implementation: implementations.${component.name} };`).join('\n')}`;
}
