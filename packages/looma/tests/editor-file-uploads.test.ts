// @vitest-environment jsdom
import { Editor } from '@tiptap/core';
import { afterEach, expect, it, vi } from 'vitest';
import { getDefaultEditorExtensions, getDefaultSlashCommands, loomaMarkdownFromDoc } from '../src/editor/extensions';
import { createFileUploads, type LoomaFileUploadsState } from '../src/editor/file-uploads';
const editors: Editor[] = [];
afterEach(() => editors.splice(0).forEach(editor => editor.destroy()));
it('offers file insertion only when its host can upload', () => {
  expect(getDefaultSlashCommands().some(command => command.title === 'File attachment')).toBe(false);
  expect(getDefaultSlashCommands(undefined, undefined, undefined, () => {}).some(command => command.title === 'File attachment')).toBe(true);
});
it('keeps a readable file link through undo and preserves intervening typing at the upload anchor', async () => {
  const editor = new Editor({ extensions: getDefaultEditorExtensions(), content: '<p>Before after</p>' }); editors.push(editor);
  editor.commands.setTextSelection(7);
  let finish!: (answer: {href:string;name:string;size:number;contentType:string}) => void;
  let signal!: AbortSignal;
  const uploads = createFileUploads({ editor, upload: () => (_file, init) => {
    signal = init.signal;
    return new Promise(resolve => { finish = resolve; });
  }, onError: vi.fn() });
  const pending = uploads.insert(new File(['pdf'], 'report.pdf'));
  editor.commands.insertContent(' typed');
  finish({ href: '/files/report.pdf', name: 'report.pdf', size: 3, contentType: 'application/pdf' });
  await pending;
  expect(signal.aborted).toBe(false);
  expect(editor.getText()).toContain('report.pdf');
  expect(JSON.stringify(editor.getJSON())).toContain('/files/report.pdf');
  const restored = new Editor({ extensions: getDefaultEditorExtensions(), content: editor.getHTML() }); editors.push(restored);
  expect(restored.getJSON().content?.[0]?.content?.find(node => node.text === 'report.pdf')).toMatchObject({
    text: 'report.pdf', marks: [{ type: 'link', attrs: { href: '/files/report.pdf', target: '_blank' } }],
  });
  expect(restored.getText()).toContain('report.pdf (application/pdf, 3 B)');
  expect(loomaMarkdownFromDoc(editor.state.doc)).toContain('[report.pdf](/files/report.pdf)');
  expect(editor.getText()).toContain('(application/pdf, 3 B)');
  expect(editor.getText()).toContain(' typed');
  editor.commands.undo();
  expect(editor.getText()).not.toContain('report.pdf');
  expect(editor.getText()).toContain(' typed');
});
it('leaves the document unchanged on rejection or a canceled late answer', async () => {
  const editor = new Editor({ extensions: getDefaultEditorExtensions(), content: '<p>Keep me</p>' }); editors.push(editor);
  const before = editor.getJSON(), onError = vi.fn();
  const uploads = createFileUploads({editor,upload: () => async () => { throw Error('offline'); },onError});
  await uploads.insert(new File(['pdf'], 'a.pdf'));
  expect(editor.getJSON()).toEqual(before); expect(onError).toHaveBeenCalled();
  let finish!: (answer: {href:string;name:string;size:number;contentType:string})=>void;
  const canceled=createFileUploads({editor,upload:()=>()=>new Promise(resolve=>{finish=resolve;}),onError});
  const pending=canceled.insert(new File(['pdf'],'a.pdf'));canceled.cancel();
  finish({href:'/file',name:'a.pdf',size:3,contentType:'application/pdf'});await pending;
  expect(editor.getJSON()).toEqual(before);
});

it('retries the failed file at its retained anchor after typing and a selection change', async () => {
  const editor = new Editor({ extensions: getDefaultEditorExtensions(), content: '<p>Before after</p>' }); editors.push(editor);
  editor.commands.setTextSelection(7);
  const file = new File(['pdf'], 'report.pdf', { type: 'application/pdf' });
  let state: LoomaFileUploadsState | undefined;
  const upload = vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce({ href: '/files/report.pdf', name: file.name, size: file.size, contentType: file.type });
  const uploads = createFileUploads({ editor, upload: () => upload, onError: vi.fn(), onState: next => { state = next; } });
  await uploads.insert(file);
  expect(state).toMatchObject({ uploading: false, failed: file });
  editor.commands.insertContent(' typed ');
  editor.commands.setTextSelection(1);
  await uploads.retry();
  expect(upload.mock.calls.map(([sent]) => sent)).toEqual([file, file]);
  expect(editor.getText()).toBe('Before typed report.pdf (application/pdf, 3 B)  after');
  expect(state).toEqual({ uploading: false, progress: null, failed: null });
  uploads.cancel();
});

it('clears a failed file on cancel and ignores progress from a completed attempt', async () => {
  const editor = new Editor({ extensions: getDefaultEditorExtensions(), content: '<p>Keep me</p>' }); editors.push(editor);
  let progress!: (loaded: number, total: number) => void;
  let state: LoomaFileUploadsState | undefined;
  const upload = vi.fn(async (_file: File, init: { progress: (loaded: number, total: number) => void }) => { progress = init.progress; throw Error('offline'); });
  const uploads = createFileUploads({ editor, upload: () => upload, onError: vi.fn(), onState: next => { state = next; } });
  await uploads.insert(new File(['pdf'], 'report.pdf'));
  progress(1, 2);
  expect(state).toMatchObject({ uploading: false, failed: expect.any(File) });
  uploads.cancel();
  await uploads.retry();
  expect(upload).toHaveBeenCalledTimes(1);
  expect(state).toEqual({ uploading: false, progress: null, failed: null });
  expect(editor.getText()).toBe('Keep me');
});

it('cancels a pending file when its insertion point is removed', async () => {
  const editor = new Editor({ extensions: getDefaultEditorExtensions(), content: '<p>Old document</p>' }); editors.push(editor);
  editor.commands.setTextSelection(4);
  let finish!: (answer: { href: string; name: string; size: number; contentType: string }) => void;
  let signal!: AbortSignal;
  const uploads = createFileUploads({ editor, upload: () => (_file, init) => {
    signal = init.signal;
    return new Promise(resolve => { finish = resolve; });
  }, onError: vi.fn() });
  const pending = uploads.insert(new File(['pdf'], 'report.pdf'));
  editor.commands.setContent('<p>Replacement document</p>');
  finish({ href: '/report.pdf', name: 'report.pdf', size: 3, contentType: 'application/pdf' });
  await pending;
  expect(signal.aborted).toBe(true);
  expect(editor.getText()).toBe('Replacement document');
});

it('does not clear a new upload started by the host during the previous insertion', async () => {
  const editor = new Editor({ extensions: getDefaultEditorExtensions(), content: '<p>Files: </p>' }); editors.push(editor);
  editor.commands.setTextSelection(8);
  let finishSecond!: (answer: { href: string; name: string; size: number; contentType: string }) => void;
  let second: Promise<void> | undefined;
  const uploads = createFileUploads({ editor, upload: () => file => file.name === 'first.pdf'
    ? { href: '/first.pdf', name: file.name, size: 1, contentType: 'application/pdf' }
    : new Promise(resolve => { finishSecond = resolve; }), onError: vi.fn() });
  editor.on('update', () => { if (!second && editor.getText().includes('first.pdf')) second = uploads.insert(new File(['b'], 'second.pdf')); });
  await uploads.insert(new File(['a'], 'first.pdf'));
  finishSecond({ href: '/second.pdf', name: 'second.pdf', size: 1, contentType: 'application/pdf' });
  await second;
  expect(editor.getText()).toContain('first.pdf');
  expect(editor.getText()).toContain('second.pdf');
});

it.each(['transaction', 'abort'])('keeps a replacement upload owned by the host %s callback', async trigger => {
  const editor = new Editor({ extensions: getDefaultEditorExtensions(), content: '<p>Old content</p>' }); editors.push(editor);
  editor.commands.setTextSelection(4);
  const answers = new Map<string, (value: { href: string; name: string; size: number; contentType: string }) => void>();
  let second: Promise<void> | undefined;
  const startSecond = () => { second ??= uploads.insert(new File(['b'], 'second.pdf')); };
  if (trigger === 'transaction') editor.on('transaction', ({ transaction }) => { if (transaction.docChanged) startSecond(); });
  const uploads = createFileUploads({ editor, upload: () => (file, init) => {
    if (trigger === 'abort' && file.name === 'first.pdf') init.signal.addEventListener('abort', startSecond, { once: true });
    return new Promise(resolve => { answers.set(file.name, resolve); });
  }, onError: vi.fn() });
  const first = uploads.insert(new File(['a'], 'first.pdf'));
  if (trigger === 'transaction') editor.commands.setContent('<p>Replacement</p>');
  else uploads.cancel();
  answers.get('first.pdf')!({ href: '/first.pdf', name: 'first.pdf', size: 1, contentType: 'application/pdf' });
  answers.get('second.pdf')!({ href: '/second.pdf', name: 'second.pdf', size: 1, contentType: 'application/pdf' });
  await Promise.all([first, second]);
  expect(editor.getText()).not.toContain('first.pdf');
  expect(editor.getText()).toContain('second.pdf');
});
