# @looma/editor

Confluence / Notion-like block editor UI for Looma, built on **open-source Tiptap** only. The **base** is Tiptap’s **Vanilla JavaScript** API ([docs](https://tiptap.dev/docs/editor/getting-started/install/vanilla-javascript)): the core `Editor` instance from `@tiptap/core`. All editor UI is **web components** (custom elements); **Vue and React adapters** in `@looma/vue` / `@looma/react` create or receive that vanilla editor and wire it to these elements.

## Status

**Shipped (first slice):** Extension preset (inline code, CodeBlock, list Enter/Backspace behavior, tables), slash menu web component, toolbar shell, table context menu + table toolbar + insert-table grid + table overlay web components, editor CSS, `handleTableOverlayAction(editor, detail)` for mapping overlay boundary clicks to Tiptap row/column commands, and `insertTableAtRange(editor, range, options)` for stable slash-triggered table insertion. Apps use the preset and web components; they bind data and event listeners only. See [Editor Roadmap](../../docs/editor-roadmap.md) for full scope and phases.

## Scope (from roadmap)

- Slash commands (`/` menu) — **web component** + adapter
- Tables: hover “+” add row/column, context menu, resize, merge/split — **web components** + adapter
- List behavior: Enter = new list item (no paragraph gap) — extension/keymap
- Block menu: duplicate, delete, “Turn into” — **web components** + adapter
- Formatting toolbar, optional floating toolbar — **web components** + adapter
- Inline code, code block, links, image (app provides upload)
- Optional: emoji picker, @mentions — **web components** + adapter
- All styling via Looma tokens; 44px touch targets; domain-neutral API

## What Looma provides vs what the app does

| Looma | App (e.g. Knit) |
|-------|------------------|
| **Extension preset** `getDefaultEditorExtensions()` from `@looma/editor/extensions` | Creates `Editor` with Looma preset (+ app-specific extensions); **binds content and onUpdate** (e.g. save) |
| **Web components** `ui-editor-toolbar`, `ui-editor-slash-menu`, `ui-editor-table-context-menu`, `ui-editor-table-toolbar`, `ui-editor-insert-table-grid`, `ui-editor-table-overlay` (+ more to come) | Mounts components; **binds event listeners** (e.g. `onTableOverlayAction` → `handleTableOverlayAction(editor, e.detail)`) |
| **Editor CSS** `@looma/editor/editor.css` | Imports styles; theming, layout |
| **Vue/React adapters** (in `@looma/vue` / `@looma/react`) | Wire vanilla editor to web components; app uses adapter and binds data + listeners only |

## Usage

- **Extensions:** `import { getDefaultEditorExtensions, handleTableOverlayAction, insertTableAtRange } from '@looma/editor/extensions'`. Use `getDefaultEditorExtensions()` when creating the editor. When handling `looma-editor-table-overlay-action`, call `handleTableOverlayAction(editor, e.detail)` to run the correct Tiptap row/column command. Use `insertTableAtRange(editor, range)` when `/table` should insert a stable default table instead of opening app-owned UI somewhere else.
- **Vanilla JS:** Create the editor with `new Editor({ extensions: getDefaultEditorExtensions(), content, ... })` from `@tiptap/core`; import the custom elements from `@looma/editor` and wire commands to their events.
- **With Vue/React:** Use the editor adapters from `@looma/vue` or `@looma/react` (e.g. `EditorToolbar`, `EditorSlashMenu`, `EditorTableOverlay`, `EditorTableContextMenu`, `EditorInsertTableGrid`), which render the web components and accept event handlers (`onSlashMenuSelect`, `onTableOverlayAction`, etc.).

## Docs

- [Editor Roadmap](../../docs/editor-roadmap.md) — full scope, phases, Looma vs app split; **base:** [Tiptap Vanilla JavaScript](https://tiptap.dev/docs/editor/getting-started/install/vanilla-javascript); **extensions:** [Custom extensions](https://tiptap.dev/docs/editor/extensions/custom-extensions)
- [Component Roadmap](../../docs/component-roadmap.md) — where editor fits in Looma

## Dependencies

- **Main entry** (`@looma/editor`): `@looma/core`, `@looma/tokens`. Registers web components; **no** Tiptap in main bundle.
- **Extensions entry** (`@looma/editor/extensions`): **peer** dependencies on `@tiptap/core` and all extension packages. Install Tiptap in the app when using `getDefaultEditorExtensions()`.
- **App:** Uses Looma preset + web components; binds content, onUpdate, and event listeners only. No editor logic in the app.
