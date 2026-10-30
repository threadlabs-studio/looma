import { parseFragment } from 'parse5';
const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export const frameworkLabels = { 'html-next': 'HTML Next', vue: 'Vue', react: 'React', svelte: 'Svelte' };
const componentName = tag => tag.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join('');
const camel = name => name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
const voidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const nativeBooleans = new Set(['checked', 'disabled', 'hidden', 'multiple', 'open', 'readonly', 'required', 'selected', 'autofocus']);
const reactAttributes = { class: 'className', for: 'htmlFor', readonly: 'readOnly', tabindex: 'tabIndex', autofocus: 'autoFocus', maxlength: 'maxLength', minlength: 'minLength', colspan: 'colSpan', rowspan: 'rowSpan', srcset: 'srcSet', crossorigin: 'crossOrigin', spellcheck: 'spellCheck', contenteditable: 'contentEditable' };

/** Present invocations using the public APIs produced by each Vite framework target. */
export function frameworkExamples(example, components) {
  const byTag = new Map(components.map(component => [component.tag, component]));
  const tags = [...new Set([...example.markup.matchAll(/<([a-z][\w]*-[\w-]+)\b/g)].map(match => match[1]))].filter(tag => byTag.has(tag));
  const imports = [...new Set(tags.map(tag => byTag.get(tag).package))].map(owner =>
    `import { ${tags.filter(tag => byTag.get(tag).package === owner).map(componentName).sort().join(', ')} } from ${JSON.stringify(owner)};`).join('\n');
  const links = tags.map(tag => `<link rel="component" href="${byTag.get(tag).resource ?? `${byTag.get(tag).package}/components/${tag}/${tag}.html`}">`).join('\n');
  const fragment = parseFragment(example.markup);
  const codes = { 'html-next': { language: 'html', code: `${links}\n\n${example.markup}` } };
  for (const target of ['vue', 'react', 'svelte']) {
    const snippets = [];
    function render(node, omitSlot = false) {
      if (node.nodeName === '#text') {
        const text = escapeHtml(node.value);
        return target === 'react' ? text.replace(/[{}]/g, char => `{${JSON.stringify(char)}}`) : target === 'svelte' ? text.replaceAll('{', "{'{'}") : text;
      }
      if (!node.tagName) return '';
      const component = byTag.get(node.tagName);
      const tag = component ? componentName(node.tagName) : node.tagName;
      const children = node.content?.childNodes ?? node.childNodes ?? [];
      const slots = new Map();
      const ordinary = [];
      for (const child of children) {
        const slot = component && child.attrs?.find(attribute => attribute.name === 'slot')?.value;
        if (slot) slots.set(slot, [...slots.get(slot) ?? [], child]);
        else ordinary.push(child);
      }
      const attrs = node.attrs.filter(attribute => !omitSlot || attribute.name !== 'slot').map(attribute => {
        const contract = component?.attributes?.find(value => value.name === attribute.name);
        const property = component ? contract?.property ?? camel(attribute.name) : attribute.name;
        let value = attribute.value;
        let typed = false;
        if (contract?.type === 'boolean' || !contract && nativeBooleans.has(attribute.name)) { value = value !== 'false'; typed = true; }
        else if (contract?.type === 'number' && value.trim() !== '' && Number.isFinite(Number(value))) { value = Number(value); typed = true; }
        else if (component && /^[\[{]/.test(value)) {
          try { value = JSON.parse(value); typed = true; } catch { /* Ordinary strings remain strings. */ }
        }
        if (target === 'react') {
          const name = reactAttributes[property] ?? property;
          if (name === 'style') {
            value = Object.fromEntries(value.split(';').filter(part => part.includes(':')).map(part => {
              const at = part.indexOf(':'); const key = part.slice(0, at).trim();
              return [key.startsWith('--') ? key : camel(key), part.slice(at + 1).trim()];
            }));
            typed = true;
          }
          return typed ? `${name}={${JSON.stringify(value)}}` : `${name}=${JSON.stringify(value)}`;
        }
        if (target === 'svelte') return typed ? `${property}={${JSON.stringify(value)}}` : `${property}="${escapeHtml(value).replaceAll('{', '&#123;')}"`;
        return typed ? `:${property}="${escapeHtml(JSON.stringify(value))}"` : `${attribute.name}="${escapeHtml(value)}"`;
      });
      let content = ordinary.map(child => render(child)).join('');
      if (slots.size) {
        if (target === 'vue') content += [...slots].map(([name, nodes]) => `<template #${name}>${nodes.map(child => render(child, true)).join('')}</template>`).join('');
        else if (target === 'react') attrs.push(`slots={{${[...slots].map(([name, nodes]) => `${JSON.stringify(name)}: <>${nodes.map(child => render(child, true)).join('')}</>`).join(', ')}}}`);
        else {
          const bindings = [...slots].map(([name, nodes]) => {
            // Render descendants first, since they may declare their own named slots.
            const markup = nodes.map(child => render(child, true)).join('');
            const identifier = `slot${snippets.length}`;
            snippets.push(`{#snippet ${identifier}()}${markup}{/snippet}`);
            return `${JSON.stringify(name)}: ${identifier}`;
          });
          attrs.push(`slots={{${bindings.join(', ')}}}`);
        }
      }
      const start = `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}`;
      if (voidElements.has(tag)) return `${start}${target === 'react' ? ' /' : ''}>`;
      if (node.tagName === 'template' && omitSlot) return content;
      return `${start}>${content}</${tag}>`;
    }
    const markup = fragment.childNodes.map(node => render(node)).join('');
    codes[target] = target === 'react'
      ? { language: 'tsx', code: `${imports}\n\nexport default function Example() {\n  return (<>${markup}</>);\n}` }
      : { language: target, code: `<script${target === 'vue' ? ' setup' : ''}>\n${imports}\n</script>\n\n${target === 'vue' ? `<template>\n${markup}\n</template>` : `${snippets.join('\n')}\n${markup}`}` };
  }
  return { ...codes, ...example.frameworks };
}
