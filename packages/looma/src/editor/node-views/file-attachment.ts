import type { NodeViewRenderer } from '@tiptap/core';
import { componentRegistry } from '@nextwebwg/html-next/runtime';
import { createUiButton } from '@threadlabs/looma/vanilla/UiButton.js';
import { createUiIcon } from '@threadlabs/looma/vanilla/UiIcon.js';
import { createUiStack } from '@threadlabs/looma/vanilla/UiStack.js';
import { createUiText } from '@threadlabs/looma/vanilla/UiText.js';
import { fileAttachmentAttrs, fileAttachmentSize } from '../extensions/file-attachment';

/** A whole-card native link, with decorative SVGs and authored filename/size. No nested action. */
export const fileAttachmentNodeView: NodeViewRenderer = ({ node }) => {
  const metadata = (attrs: Record<string, unknown>) => { try { return fileAttachmentAttrs(attrs); } catch { return null; } };
  const a = metadata(node.attrs);
  const name = document.createTextNode(a?.name ?? 'Unavailable attachment'), size = document.createTextNode(a ? fileAttachmentSize(a.size) : '');
  const dom = createUiButton({ variant: 'card', tone: 'neutral', href: a?.href ?? '', disabled: !a, target: '_blank', rel: 'noopener noreferrer',
    attributes: { contenteditable: 'false', 'data-looma-file-attachment': '' },
    slots: { icon: [createUiIcon({ name: 'file', tone: 'secondary', attributes: { 'aria-hidden': 'true' } })],
      action: [createUiIcon({ name: 'download', tone: 'secondary', attributes: { 'aria-hidden': 'true' } })] },
    children: [createUiStack({ gap: 'xs', children: [createUiText({ as: 'span', tone: 'default', weight: 'medium', wrap: 'anywhere', children: [name] }), createUiText({ as: 'span', size: 'sm', tone: 'secondary', children: [size] })] })],
  });
  return { dom,
    update(next) {
      if (next.type !== node.type) return false;
      const a = metadata(next.attrs); name.data = a?.name ?? 'Unavailable attachment'; size.data = a ? fileAttachmentSize(a.size) : '';
      componentRegistry.update(dom, { href: a?.href ?? '', disabled: !a }); return true;
    },
    selectNode() { componentRegistry.update(dom, { selected: true }); },
    deselectNode() { componentRegistry.update(dom, { selected: false }); },
    stopEvent: event => event.type === 'click' || event.type === 'keydown',
    ignoreMutation: () => true,
  };
};
