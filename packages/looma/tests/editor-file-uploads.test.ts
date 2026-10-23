// @vitest-environment jsdom
import { Editor } from '@tiptap/core';
import { afterEach, expect, it, vi } from 'vitest';
import { getDefaultEditorExtensions, getDefaultSlashCommands } from '../src/editor/extensions';
import { createFileUploads } from '../src/editor/file-uploads';
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
  const uploads = createFileUploads({ editor, upload: () => () => new Promise(resolve => { finish = resolve; }), onError: vi.fn() });
  const pending = uploads.insert(new File(['pdf'], 'report.pdf'));
  editor.commands.insertContent(' typed');
  finish({ href: '/files/report.pdf', name: 'report.pdf', size: 3, contentType: 'application/pdf' });
  await pending;
  expect(editor.getText()).toContain('report.pdf');
  expect(JSON.stringify(editor.getJSON())).toContain('/files/report.pdf');
  expect(editor.getText()).toContain(' typed');
  editor.commands.undo();
  expect(editor.getText()).not.toContain('report.pdf');
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
