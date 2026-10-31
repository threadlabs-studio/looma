import { camel, componentName, exampleInvocations, nativeBooleans } from './example-invocations.mjs';

const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const indent = depth => '  '.repeat(depth);
const textValue = node => node.preserve ? node.value : node.value.replace(/[\t\n\r\f ]+/g, ' ');
const formattingSpace = node => node?.kind === 'text' && !node.preserve && /^[\t\n\r\f ]*$/.test(node.value);
const key = value => /^[a-zA-Z_$][\w$]*$/.test(value) ? value : JSON.stringify(value);
const kebab = value => value.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
const voidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const reactAttributes = { class: 'className', for: 'htmlFor', readonly: 'readOnly', tabindex: 'tabIndex', autofocus: 'autoFocus', maxlength: 'maxLength', minlength: 'minLength', colspan: 'colSpan', rowspan: 'rowSpan', srcset: 'srcSet', crossorigin: 'crossOrigin', spellcheck: 'spellCheck', contenteditable: 'contentEditable', allowfullscreen: 'allowFullScreen', formnovalidate: 'formNoValidate', novalidate: 'noValidate', playsinline: 'playsInline' };
const numericAttributes = new Set(['cols', 'rows', 'size', 'span', 'rowSpan', 'colSpan', 'tabIndex', 'maxLength', 'minLength', 'start']);
const inlineElements = new Set('a abbr b bdi bdo br button cite code del em i img input ins kbd label mark q s samp small span strong sub sup time u var wbr'.split(' '));
const reserved = new Set('await break case catch class const continue debugger default delete do else enum export extends false finally for function if implements import in instanceof interface let new null package private protected public return static super switch this throw true try typeof var void while with yield arguments eval'.split(' '));

export const frameworkLabels = { 'html-next': 'HTML Next', vue: 'Vue', react: 'React', svelte: 'Svelte' };

// Derive block layout from the tree. Mixed text and inline adjacency stay together.
function layout(nodes) {
  const structural = nodes.some(node => node.kind === 'slot' || node.kind === 'element' && (node.component || !inlineElements.has(node.tag)));
  const multiline = structural
    && !nodes.some(node => node.kind === 'text' && !formattingSpace(node));
  return { multiline, nodes: multiline ? nodes.filter(node => !formattingSpace(node)) : nodes };
}

function text(node, target) {
  const value = textValue(node);
  if (target === 'html-next') return escapeHtml(value);
  if (target === 'react') {
    if (node.preserve || /[\n\r\t]/.test(node.value)) {
      return `{${JSON.stringify(value)}}`;
    }
    return escapeHtml(value).replace(/[{}]/g, char => `{${JSON.stringify(char)}}`);
  }
  const escaped = escapeHtml(value);
  return target === 'svelte' ? escaped.replaceAll('{', "{'{'}") : escaped.replaceAll('{', '&#123;');
}

function attribute(value, target, component) {
  let name = value.property;
  let data = value.value;
  if (target === 'html-next') return data === true || data === '' ? name : `${name}="${escapeHtml(data)}"`;
  if (target === 'react') {
    name = reactAttributes[name] ?? name;
    if (name === 'style') {
      data = Object.fromEntries(String(data).split(';').filter(part => part.includes(':')).map(part => {
        const at = part.indexOf(':');
        const property = part.slice(0, at).trim();
        return [property.startsWith('--') ? property : camel(property), part.slice(at + 1).trim()];
      }));
    } else if (!component && numericAttributes.has(name) && /^[-+]?\d+$/.test(data)) data = Number(data);
    if (data === true) return name;
    return typeof data === 'string' ? `${name}="${escapeHtml(data)}"` : `${name}={${JSON.stringify(data)}}`;
  }
  if (target === 'svelte') {
    if (data === true) return name;
    return typeof data === 'string' ? `${name}="${escapeHtml(data).replaceAll('{', '&#123;')}"` : `${name}={${JSON.stringify(data)}}`;
  }
  name = component ? kebab(name) : value.name;
  if (data === true && nativeBooleans.has(name) && !component) return name;
  return typeof data === 'string' ? `${name}="${escapeHtml(data).replaceAll('{', '&#123;')}"` : `:${name}="${escapeHtml(JSON.stringify(data))}"`;
}

function snippetBindings(model) {
  const taken = new Set([...reserved, ...model.components.map(component => componentName(component.tag))]);
  const bindings = new Map();
  function visit(nodes) {
    for (const node of nodes) {
      if (node.kind === 'slot') {
        let base = camel(node.name.replace(/[^\w$-]/g, '-')).replace(/-/g, '');
        if (!/^[a-zA-Z_$]/.test(base)) base = `slot${base}`;
        if (reserved.has(base)) base += 'Content';
        let name = base;
        if (taken.has(name)) {
          const owner = componentName(node.owner.tag).replace(/^Ui/, '');
          base = owner[0].toLowerCase() + owner.slice(1) + base[0].toUpperCase() + base.slice(1);
          name = base;
          for (let index = 2; taken.has(name); index++) name = `${base}${index}`;
        }
        taken.add(name);
        bindings.set(node, name);
      }
      if (node.children) visit(node.children);
    }
  }
  visit(model.nodes);
  return bindings;
}

/** Print the public invocation API, keeping framework-specific syntax out of the parsed model. */
function printer(model, target) {
  const bindings = target === 'svelte' ? snippetBindings(model) : new Map();

  function sequence(nodes, depth, forceLines = false) {
    const arranged = layout(nodes);
    const content = arranged.nodes.map(node => (arranged.multiline ? indent(depth) : '') + render(node, depth)).join(arranged.multiline ? '\n' : '');
    return (forceLines && !arranged.multiline ? indent(depth) : '') + content;
  }

  function reactValue(nodes, depth) {
    const content = [...nodes];
    const boundaryIndentation = node => formattingSpace(node) && /[\n\r]/.test(node.value);
    while (boundaryIndentation(content[0])) content.shift();
    while (boundaryIndentation(content.at(-1))) content.pop();
    const arranged = layout(content);
    if (!arranged.nodes.length) return 'null';
    if (arranged.nodes.length === 1) {
      const node = arranged.nodes[0];
      if (node.kind === 'text') return JSON.stringify(textValue(node));
      if (node.kind === 'comment') return `null /*${node.value}*/`;
      return render(node, depth);
    }
    return arranged.multiline
      ? `<>\n${sequence(content, depth + 1)}\n${indent(depth)}</>`
      : `<>${sequence(content, depth)}</>`;
  }

  function render(node, depth) {
    if (node.kind === 'text') return text(node, target);
    if (node.kind === 'comment') return target === 'react' ? `{/*${node.value}*/}` : `<!--${node.value}-->`;
    if (node.kind === 'slot') {
      return `<template #${node.name}>\n${sequence(node.children, depth + 1, true)}\n${indent(depth)}</template>`;
    }
    const attrs = node.attributes.map(value => attribute(value, target, node.component));
    if (node.slots.length && target === 'svelte') {
      attrs.push(`slots={{ ${node.slots.map(slot => slot.name === bindings.get(slot) ? slot.name : `${key(slot.name)}: ${bindings.get(slot)}`).join(', ')} }}`);
    }
    if (node.slots.length && target === 'react') {
      attrs.push(`slots={{\n${node.slots.map(slot => `${indent(depth + 2)}${key(slot.name)}: ${reactValue(slot.children, depth + 2)},`).join('\n')}\n${indent(depth + 1)}}}`);
    }
    const wrapped = attrs.length > 0;
    const start = wrapped ? `<${node.tag}\n${attrs.map(value => indent(depth + 1) + value).join('\n')}\n${indent(depth)}` : `<${node.tag}`;
    const children = target === 'vue' ? node.children : node.children.filter(child => child.kind !== 'slot');
    const arranged = layout(children);
    if (!arranged.nodes.length && (node.component || target === 'react')) return `${start}${wrapped ? '' : ' '}/>`;
    if (voidElements.has(node.tag)) return `${start}>`;
    const content = sequence(children, depth + 1);
    return arranged.multiline
      ? `${start}>\n${content}\n${indent(depth)}</${node.tag}>`
      : `${start}>${content}</${node.tag}>`;
  }

  function body(depth) {
    const arranged = layout(model.nodes);
    if (target === 'react') return reactValue(model.nodes, depth);
    return (arranged.multiline ? '' : indent(depth)) + sequence(model.nodes, depth);
  }

  return {
    body,
    snippets: () => [...bindings].map(([slot, name]) => `{#snippet ${name}()}\n${sequence(slot.children, 1, true)}\n{/snippet}`).join('\n\n'),
  };
}

/** Present invocations using the public APIs produced by each Vite framework target. */
export function frameworkExamples(example, components) {
  const model = exampleInvocations(example.markup, components);
  const importSource = component => component.importSource ?? component.package;
  const imports = [...new Set(model.components.map(importSource))].map(owner => {
    const names = model.components.filter(component => importSource(component) === owner).map(component => componentName(component.tag)).sort();
    const line = `import { ${names.join(', ')} } from ${JSON.stringify(owner)};`;
    return line.length <= 100 ? line : `import {\n${names.map(name => `  ${name},`).join('\n')}\n} from ${JSON.stringify(owner)};`;
  }).join('\n');
  const links = model.components.map(component => `<link\n  rel="component"\n  href="${escapeHtml(component.resource ?? `${component.package}/components/${component.tag}/${component.tag}.html`)}"\n>`).join('\n');
  const html = printer(exampleInvocations(example.markup, []), 'html-next').body(0);
  const codes = { 'html-next': { language: 'html', code: [links, html].filter(Boolean).join('\n\n') } };
  for (const target of ['vue', 'react', 'svelte']) {
    const output = printer(model, target);
    const script = imports ? `<script${target === 'vue' ? ' setup' : ''}>\n${imports.split('\n').map(line => '  ' + line).join('\n')}\n</script>\n\n` : '';
    codes[target] = target === 'react'
      ? { language: 'tsx', code: `${imports ? imports + '\n\n' : ''}export default function Example() {\n  return ${output.body(1)};\n}` }
      : { language: target, code: script + (target === 'vue' ? `<template>\n${output.body(1)}\n</template>` : [output.snippets(), output.body(0)].filter(Boolean).join('\n\n')) };
  }
  return { ...codes, ...example.frameworks };
}
