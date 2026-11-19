import type { Editor } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import type { Transaction } from '@tiptap/pm/state';
import type { LoomaFileDescriptor } from './file-uploads';
import { getReferenceDisplay, setReferenceDisplay } from './reference-display';

/** Host confirmation and storage transport; document removal belongs to the editor. */
export interface FileDeletionServices {
  enabled: () => boolean;
  confirm: (file: LoomaFileDescriptor, signal: AbortSignal) => Promise<boolean>;
  remove: (file: LoomaFileDescriptor, signal: AbortSignal) => Promise<boolean>;
  onError: (error: unknown, file: LoomaFileDescriptor) => void;
}

/** Remove an authored reference without changing the original file's availability. */
export function removeFileBlock(editor: Editor, position: () => number | undefined): void {
  if (editor.isDestroyed || !editor.isEditable) return;
  const at = position();
  if (at === undefined) return;
  const original = editor.state.doc.nodeAt(at);
  if (original?.type.name !== 'loomaFileAttachment') return;
  editor.view.dispatch(closeHistory(editor.state.tr).delete(at, at + original.nodeSize));
  editor.view.focus();
}

/** Remove one block optimistically; retain a mapped rollback anchor while transport runs. */
export async function deleteFileBlock(editor: Editor, position: () => number | undefined, file: LoomaFileDescriptor, services: FileDeletionServices): Promise<void> {
  if (!services.enabled() || editor.isDestroyed || !editor.isEditable) return;
  const controller = new AbortController();
  const cancel = () => controller.abort();
  editor.on('destroy', cancel);
  let restore: (() => void) | undefined, unwatch: (() => void) | undefined;
  try {
    if (!await services.confirm(file, controller.signal) || controller.signal.aborted || editor.isDestroyed || !editor.isEditable) return;
    const at = position();
    if (at === undefined) return;
    const original = editor.state.doc.nodeAt(at);
    if (original?.type.name !== 'loomaFileAttachment' || original.attrs.href !== file.href) return;
    editor.view.dispatch(closeHistory(editor.state.tr));
    editor.view.dispatch(editor.state.tr.delete(at, at + original.nodeSize));
    let anchor = at, valid = true;
    const map = ({ transaction }: { transaction: Transaction }) => {
      const next = transaction.mapping.mapResult(anchor, -1);
      if (next.deletedAcross) valid = false;
      anchor = next.pos;
    };
    editor.on('transaction', map);
    unwatch = () => editor.off('transaction', map);
    restore = () => {
      if (valid && !editor.isDestroyed) editor.view.dispatch(editor.state.tr.insert(anchor, original).setMeta('addToHistory', false));
    };
    if (!await services.remove(file, controller.signal)) throw new Error('The file was not deleted. Please retry.');
    restore = undefined;
    if (!editor.isDestroyed) {
      setReferenceDisplay(editor, { ...getReferenceDisplay(editor), [`attachment:${file.href}`]: { label: file.name, status: 'deleted', deletable: false } });
      editor.view.dispatch(closeHistory(editor.state.tr));
    }
  } catch (error) {
    unwatch?.(); unwatch = undefined;
    restore?.();
    if (!controller.signal.aborted) services.onError(error, file);
  } finally { unwatch?.(); editor.off('destroy', cancel); }
}
