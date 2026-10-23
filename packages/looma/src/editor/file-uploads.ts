import type { Editor } from '@tiptap/core';

/** A retained file, represented as a readable ordinary link in the document. */
export interface LoomaFileDescriptor { href: string; name: string; size: number; contentType: string; }
/** The application retains the bytes and returns their authorized download URL. */
export type LoomaFileUpload = (file: File, init: { signal: AbortSignal; progress: (loaded: number, total: number) => void }) => PromiseLike<LoomaFileDescriptor | null> | LoomaFileDescriptor | null;
/** File insertion status, independent of the document and its undo history. */
export interface LoomaFileUploadsState { uploading: boolean; progress: { loaded: number; total: number } | null; }
/** Captures the caret before asynchronous transport; later transactions map that caret. */
export function createFileUploads(options: { editor: Editor; upload: () => LoomaFileUpload | undefined; onError: (error: unknown, file: File) => void; onState?: (state: LoomaFileUploadsState) => void }) {
  let active: AbortController | undefined;
  const state = (uploading: boolean, progress: LoomaFileUploadsState['progress'] = null) => options.onState?.({ uploading, progress });
  return {
    cancel() { active?.abort(); state(false); },
    async insert(file: File) {
      const upload = options.upload();
      if (!upload || options.editor.isDestroyed) return;
      active?.abort();
      const controller = new AbortController(); active = controller;
      const { editor } = options;
      let position = editor.state.selection.from;
      const map = ({ transaction }: { transaction: import('@tiptap/pm/state').Transaction }) => { position = transaction.mapping.map(position); };
      editor.on('transaction', map); state(true);
      try {
        const answer = await upload(file, { signal: controller.signal, progress: (loaded, total) => { if (!controller.signal.aborted) state(true, { loaded, total }); } });
        if (!answer || controller.signal.aborted || editor.isDestroyed || !editor.isEditable) return;
        if (!/^(?:https?:\/\/|\/(?!\/))/.test(answer.href) || !Number.isSafeInteger(answer.size) || answer.size < 0) throw new Error('Invalid file descriptor');
        const size = answer.size < 1000 ? `${answer.size} B` : answer.size < 1_000_000 ? `${Math.ceil(answer.size / 1000)} KB` : `${Number((answer.size / 1_000_000).toFixed(1))} MB`;
        editor.chain().focus().insertContentAt(position, [
          { type: 'text', text: answer.name || file.name, marks: [{ type: 'link', attrs: { href: answer.href, target: '_blank', rel: 'noopener noreferrer' } }] },
          { type: 'text', text: ` (${answer.contentType || 'application/octet-stream'}, ${size}) ` },
        ]).run();
      } catch (error) { if (!controller.signal.aborted) options.onError(error, file); }
      finally { editor.off('transaction', map); if (active === controller) { active = undefined; state(false); } }
    },
  };
}
