import type { Editor } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import type { Transaction } from '@tiptap/pm/state';

/** A retained file, represented as a readable ordinary link in the document. */
export interface LoomaFileDescriptor { href: string; name: string; size: number; contentType: string; }
/** The application retains the bytes and returns their authorized download URL. */
export type LoomaFileUpload = (file: File, init: { signal: AbortSignal; progress: (loaded: number, total: number) => void }) => PromiseLike<LoomaFileDescriptor | null> | LoomaFileDescriptor | null;
/** File insertion status, independent of the document and its undo history. */
export interface LoomaFileUploadsState { uploading: boolean; progress: { loaded: number; total: number } | null; failed: File | null; }
/** Captures the caret before transport and retains its mapped position for an explicit retry. */
export function createFileUploads(options: { editor: Editor; upload: () => LoomaFileUpload | undefined; onError: (error: unknown, file: File) => void; onState?: (state: LoomaFileUploadsState) => void }) {
  const { editor } = options;
  type Upload = { file: File; position: number; controller?: AbortController; failed: boolean; map: (event: { transaction: Transaction }) => void };
  let active: Upload | undefined;
  const state = (uploading: boolean, progress: LoomaFileUploadsState['progress'] = null, failed: File | null = null) => options.onState?.({ uploading, progress, failed });
  const finish = () => {
    if (active) { editor.off('transaction', active.map); active = undefined; }
    state(false);
  };
  const cancel = () => { active?.controller?.abort(); finish(); };
  const run = async (job: Upload) => {
    const upload = options.upload();
    if (!upload || editor.isDestroyed || !editor.isEditable) { cancel(); return; }
    const controller = new AbortController();
    job.controller = controller; job.failed = false;
    const current = () => active === job && job.controller === controller && !controller.signal.aborted;
    state(true);
    try {
      const answer = await upload(job.file, { signal: controller.signal, progress: (loaded, total) => {
        if (current() && !job.failed) state(true, { loaded, total });
      } });
      if (!current()) return;
      if (!answer || editor.isDestroyed || !editor.isEditable) { finish(); return; }
      if (!/^(?:https?:\/\/|\/(?!\/))/.test(answer.href) || !Number.isSafeInteger(answer.size) || answer.size < 0) throw new Error('Invalid file descriptor');
      const size = answer.size < 1000 ? `${answer.size} B` : answer.size < 1_000_000 ? `${Math.ceil(answer.size / 1000)} KB` : `${Number((answer.size / 1_000_000).toFixed(1))} MB`;
      editor.view.dispatch(closeHistory(editor.state.tr));
      editor.chain().focus().insertContentAt(job.position, [
        { type: 'text', text: answer.name || job.file.name, marks: [{ type: 'link', attrs: { href: answer.href, target: '_blank', rel: 'noopener noreferrer' } }] },
        { type: 'text', text: ` (${answer.contentType || 'application/octet-stream'}, ${size}) ` },
      ]).run();
      editor.view.dispatch(closeHistory(editor.state.tr));
      if (current()) finish();
    } catch (error) {
      if (!current()) return;
      job.failed = true;
      state(false, null, job.file);
      options.onError(error, job.file);
    }
  };
  return {
    cancel,
    async insert(file: File) {
      cancel();
      if (editor.isDestroyed || !editor.isEditable) return;
      const job: Upload = { file, position: editor.state.selection.from, failed: false,
        map: ({ transaction }) => {
          const mapped = transaction.mapping.mapResult(job.position);
          if (mapped.deletedAcross) cancel();
          else job.position = mapped.pos;
        } };
      active = job; editor.on('transaction', job.map);
      await run(job);
    },
    async retry() { if (active?.failed) await run(active); },
  };
}
