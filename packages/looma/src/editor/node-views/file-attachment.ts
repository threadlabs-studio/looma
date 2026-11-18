import type { NodeViewRenderer } from '@tiptap/core';
import { componentRegistry } from '@nextwebwg/html-next/runtime';
import { createUiButton } from '@threadlabs/looma/vanilla/UiButton.js';
import { createUiIcon } from '@threadlabs/looma/vanilla/UiIcon.js';
import { createUiIconButton } from '@threadlabs/looma/vanilla/UiIconButton.js';
import { createUiTooltip } from '@threadlabs/looma/vanilla/UiTooltip.js';
import { createUiCluster } from '@threadlabs/looma/vanilla/UiCluster.js';
import { createUiStack } from '@threadlabs/looma/vanilla/UiStack.js';
import { createUiText } from '@threadlabs/looma/vanilla/UiText.js';
import { fileAttachmentAttrs, fileAttachmentSize } from '../extensions/file-attachment';
import { getReferenceDisplay, observeReferenceDisplay } from '../reference-display';
import { deleteFileBlock, removeFileBlock, type FileDeletionServices } from '../file-deletions';

let sequence = 0;
/** A compact file link with an editable reference action and optional original deletion. */
export const createFileAttachmentNodeView = (services: FileDeletionServices): NodeViewRenderer => ({ node, editor, getPos }) => {
  let current = node, pending = false;
  const metadata = () => { try { return fileAttachmentAttrs(current.attrs); } catch { return null; } };
  const deletesOriginal = () => {
    const a = metadata(), display = a ? getReferenceDisplay(editor)[`attachment:${a.href}`] : undefined;
    return Boolean(a && services.enabled() && display?.status !== 'deleted' && display?.status !== 'pending' && display?.deletable !== false);
  };
  const name = document.createTextNode(''), size = document.createTextNode('');
  const download = createUiIcon({ name: 'download', tone: 'muted', attributes: { 'aria-hidden': 'true' } });
  const card = createUiButton({ variant: 'card', tone: 'neutral', size: 'sm', fit: true, href: '', target: '_blank', rel: 'noopener noreferrer',
    attributes: { 'data-looma-file-attachment': '' },
    slots: { icon: [createUiIcon({ name: 'file', tone: 'secondary', attributes: { 'aria-hidden': 'true' } })], action: [download] },
    children: [createUiStack({ gap: 'none', children: [
      createUiText({ as: 'span', weight: 'medium', wrap: 'anywhere', attributes: { 'data-looma-file-name': '' }, children: [name] }),
      createUiText({ as: 'span', size: 'xs', tone: 'muted', attributes: { 'data-looma-file-size': '' }, children: [size] }),
    ] })],
  });
  const id = `looma-file-delete-${++sequence}`;
  const trash = createUiIconButton({ label: 'Delete file', variant: 'ghost', tone: 'neutral', size: 'xs', attributes: { id, 'data-looma-file-delete': '' },
    children: [createUiIcon({ name: 'trash', tone: 'muted', attributes: { 'aria-hidden': 'true' } })],
  });
  trash.addEventListener('click', async () => {
      if (!deletesOriginal()) { removeFileBlock(editor, getPos); return; }
      const a = metadata();
      if (!a || pending) return;
      pending = true;
      render();
      try { await deleteFileBlock(editor, getPos, a, services); }
      finally { pending = false; render(); }
  });
  const tooltip = document.createTextNode('');
  const dom = createUiCluster({ padding: 's', gap: 'xs', wrap: 'nowrap', attributes: { contenteditable: 'false', 'data-looma-file-block': '' },
    children: [card, trash, createUiTooltip({ for: id, children: [tooltip] })] });
  const render = () => {
    const a = metadata(), display = a ? getReferenceDisplay(editor)[`attachment:${a.href}`] : undefined;
    const deleted = display?.status === 'deleted';
    name.data = a ? `${a.name}${deleted ? ' (deleted)' : ''}` : 'Unavailable attachment';
    size.data = a ? fileAttachmentSize(a.size) : '';
    componentRegistry.update(card, { href: a?.href ?? '', disabled: !a || deleted || display?.status === 'pending' });
    download.hidden = deleted;
    trash.hidden = !editor.isEditable;
    const deleteOriginal = deletesOriginal(), verb = deleteOriginal ? 'Delete' : 'Remove';
    tooltip.data = deleteOriginal ? 'Delete file and remove reference' : 'Remove attachment reference';
    componentRegistry.update(trash, { loading: pending, label: `${verb} ${a?.name ?? 'unavailable attachment'}` });
  };
  const stop = observeReferenceDisplay(editor, render);
  render();
  return { dom,
    update(next) { if (next.type !== current.type) return false; current = next; render(); return true; },
    destroy: stop,
    selectNode() { componentRegistry.update(card, { selected: true }); },
    deselectNode() { componentRegistry.update(card, { selected: false }); },
    stopEvent: event => event.type === 'click' || event.type === 'keydown',
    ignoreMutation: () => true,
  };
};
