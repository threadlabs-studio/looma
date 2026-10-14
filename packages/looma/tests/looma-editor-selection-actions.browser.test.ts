import type { Editor } from '@tiptap/core';
import { userEvent } from '@vitest/browser/context';
import { afterEach, expect, it, vi } from 'vitest';
import { createApp, h, nextTick, type App } from 'vue';
import { LoomaEditor } from '../src/vue/editor/LoomaEditor';
import '../tokens.css';
import '../theme-light.css';
import '../vue/components.css';
let app: App;
afterEach(() => { app?.unmount(); document.body.innerHTML = ''; vi.restoreAllMocks(); });
async function mount(editable = true, width = 1280, rangeActions = false) {
  vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(width);
  const host = document.createElement('div'); host.style.width = '600px'; host.style.marginTop = '150px'; document.body.append(host);
  let editor!: Editor;
  const action = vi.fn(), rangeAction = vi.fn();
  app = createApp({ render: () => h(LoomaEditor, { editable, toolbarMode: 'contextual', compactToolbar: true,
    selectionActions: [{ id: 'note', label: 'Annotate' }, { id: 'query', label: 'Ask about selection' }],
    modelValue: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Before selected words after.' }] }] },
    rangeActions: rangeActions ? [{ id: 'inspect', label: 'Inspect notes', from: 8, to: 22 }, { id: 'inspect', label: 'Inspect notes', from: 8, to: 25 }] : [],
    onRangeAction: rangeAction,
    onSelectionAction: action, onReady: (instance: Editor) => { editor = instance; },
  }) }); app.mount(host); await nextTick();
  await vi.waitFor(() => expect(editor).toBeTruthy());
  editor.commands.focus(); editor.commands.setTextSelection({ from: 8, to: 22 });
  await new Promise(resolve => requestAnimationFrame(resolve));
  return { editor, action, rangeAction };
}
it('keeps direct actions compact and emits the exact selection without editing it', async () => {
  const { editor, action } = await mount(); const before = editor.getJSON();
  await vi.waitFor(() => expect(document.querySelector('[aria-label="Annotate"]')).toBeTruthy());
  const compact = document.querySelector('[aria-label="Annotate"]')!.closest('[aria-label="Editor toolbar"]')!;
  expect(compact.querySelector('[aria-label="Format"]')).toBeTruthy();
  expect(compact.querySelector('[aria-label="Heading 1"]')).toBeNull();
  await userEvent.click(document.querySelector('[aria-label="Annotate"]')!);
  expect(action).toHaveBeenCalledWith(expect.objectContaining({ id: 'note', from: 8, to: 22, text: 'selected words', before: 'Before ', after: ' after.' }));
  expect(editor.getJSON()).toEqual(before);
});
it('exposes full formatting through Format and preserves the selected range', async () => {
  const { editor } = await mount();
  await vi.waitFor(() => expect(document.querySelector('[aria-label="Format"]')).toBeTruthy());
  await userEvent.click(document.querySelector('[aria-label="Format"]')!);
  await vi.waitFor(() => expect(document.querySelector('.looma-editor__compact-formatting [aria-label="Heading 2"]')).toBeTruthy());
  await userEvent.click(document.querySelector('.looma-editor__compact-formatting [aria-label="Heading 2"]')!);
  expect(editor.isActive('heading', { level: 2 })).toBe(true);
});
it('permits read-only selection actions without exposing formatting', async () => {
  const { editor, action } = await mount(false); const before = editor.getJSON();
  await vi.waitFor(() => expect(document.querySelector('[aria-label="Annotate"]')).toBeTruthy());
  expect(document.querySelector('[aria-label="Bold"]')).toBeNull();
  await userEvent.click(document.querySelector('[aria-label="Annotate"]')!);
  expect(action).toHaveBeenCalledOnce(); expect(editor.getJSON()).toEqual(before);
});
it('puts selection actions in the existing narrow editing dock', async () => {
  await mount(true, 375);
  await vi.waitFor(() => expect(document.querySelector('.looma-editor__mobile-toolbar-shell [aria-label="Annotate"]')).toBeTruthy());
  expect(document.querySelector('[data-tippy-root]')).toBeNull();
});
it('dismisses the expanded Format inventory on Escape and permits a fresh selection gesture', async () => {
  const { editor } = await mount();
  await vi.waitFor(() => expect(document.querySelector('[aria-label="Format"]')).toBeTruthy());
  await userEvent.click(document.querySelector('[aria-label="Format"]')!);
  await vi.waitFor(() => expect(document.querySelector('.looma-editor__compact-formatting')?.matches(':popover-open')).toBe(true));
  await userEvent.keyboard('{Escape}');
  await vi.waitFor(() => expect(document.querySelector('.looma-editor__compact-formatting')?.matches(':popover-open')).toBe(false));
  editor.chain().focus().setTextSelection({ from: 1, to: 7 }).run();
  await vi.waitFor(() => expect(document.querySelector('[aria-label="Annotate"]')).toBeTruthy());
});

for (const editable of [true, false]) for (const width of [1280, 375]) {
  it(`opens grouped range actions with a native caret click (${editable ? 'editable' : 'read-only'}, ${width}px)`, async () => {
    const { editor, action, rangeAction } = await mount(editable, width, true);
    const before = editor.getJSON();
    const paragraph = editor.view.dom.querySelector('p')!;
    const node = paragraph.firstChild!;
    const text = document.createRange(); text.setStart(node, 10); text.setEnd(node, 11);
    const char = text.getBoundingClientRect(), box = paragraph.getBoundingClientRect();
    await userEvent.click(paragraph, { position: { x: char.left + char.width / 2 - box.left, y: char.top + char.height / 2 - box.top } });
    await vi.waitFor(() => expect(document.querySelectorAll('[aria-label="Inspect notes"]').length).toBe(1));
    expect(editor.state.selection.empty).toBe(true);
    if (!editable) expect(document.querySelector('[aria-label="Bold"]')).toBeNull();
    await userEvent.click(document.querySelector('[aria-label="Inspect notes"]')!);
    expect(rangeAction).toHaveBeenCalledWith({ id: 'inspect', ranges: [{ from: 8, to: 22 }, { from: 8, to: 25 }] });
    expect(action).not.toHaveBeenCalled(); expect(editor.getJSON()).toEqual(before);
    editor.commands.setTextSelection(2);
    await vi.waitFor(() => expect(document.querySelector('[aria-label="Inspect notes"]')).toBeNull());
  });
}
