import { parseFragment } from 'parse5';
import { parseTypedValue } from '@nextwebwg/html-next';

export const componentName = tag => tag.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join('');
export const camel = name => name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
export const nativeBooleans = new Set(['allowfullscreen', 'async', 'autofocus', 'autoplay', 'checked', 'controls', 'default', 'defer', 'disabled', 'formnovalidate', 'hidden', 'inert', 'ismap', 'itemscope', 'loop', 'multiple', 'muted', 'nomodule', 'novalidate', 'open', 'playsinline', 'readonly', 'required', 'reversed', 'selected']);
const scalarTypes = new Set(['boolean', 'number', 'string']);

/** Parse authored invocations once; every printer consumes the same props, slot groups and text. */
export function exampleInvocations(markup, components) {
  const byTag = new Map(components.map(component => [component.tag, component]));
  const used = new Set();

  function readAttribute(input, component, attributes) {
    const contract = component?.attributes?.find(value => value.name === input.name);
    // Catalogs carry the parser's type node. `type` remains the human-readable API description.
    let type = contract?.valueType ?? (scalarTypes.has(contract?.type) ? contract.type : undefined);
    if (type?.kind === 'selected') {
      const selector = component.attributes.find(candidate => (candidate.property ?? candidate.name) === type.from);
      const supplied = attributes.find(candidate => candidate.name === selector?.name);
      const selected = supplied ? readAttribute(supplied, component, attributes).value : selector?.default;
      type = type.options.find(option => option.value === selected)?.type;
    }
    let value = input.value;
    if (type) {
      const parsed = parseTypedValue(value, type, `${component.tag}.${contract.property ?? input.name}`, 'html');
      if (!parsed.ok) throw new TypeError(parsed.issues.map(issue => `${issue.path}: ${issue.message}`).join('; '));
      value = parsed.value;
    } else if (!contract && nativeBooleans.has(input.name)) value = true;
    return { name: input.name, property: contract?.property ?? input.name, value };
  }

  function visit(node, omitSlot = false, preserve = false) {
    if (node.nodeName === '#text') return { kind: 'text', value: node.value, preserve };
    if (node.nodeName === '#comment') return { kind: 'comment', value: node.data };
    const component = byTag.get(node.tagName);
    if (component) used.add(component);
    const children = [];
    const slots = new Map();
    for (const child of node.content?.childNodes ?? node.childNodes ?? []) {
      const slotName = component && child.attrs?.find(attribute => attribute.name === 'slot')?.value;
      const projected = visit(child, Boolean(slotName), preserve || ['pre', 'textarea'].includes(node.tagName));
      if (slotName) {
        let slot = slots.get(slotName);
        if (!slot) {
          slot = { kind: 'slot', name: slotName, owner: component, children: [] };
          slots.set(slotName, slot);
          children.push(slot);
        }
        if (child.tagName === 'template') slot.children.push(...projected.children);
        else slot.children.push(projected);
      } else children.push(projected);
    }
    return {
      kind: 'element', tag: component ? componentName(component.tag) : node.tagName, component,
      attributes: node.attrs.filter(attribute => !omitSlot || attribute.name !== 'slot').map(value => readAttribute(value, component, node.attrs)),
      children, slots: [...slots.values()],
    };
  }

  const nodes = parseFragment(markup).childNodes.map(node => visit(node));
  return { nodes, components: [...used] };
}
