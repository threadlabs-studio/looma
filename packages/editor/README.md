# @threadlabs/looma-editor

> Internal implementation workspace. Consumers install `@threadlabs/looma` and
> use `/editor`, `/editor/extensions`, or `/editor.css`.

Candidate editor UI elements, styles, Tiptap 2 presets, slash commands, and table editing for Looma. The package uses Tiptap's vanilla `Editor`; the public facade's `/vue/editor` entry provides the turnkey Vue editor.

Release status: Candidate `0.1.15`, not Stable.

## Install

```sh
pnpm add @threadlabs/looma-editor @threadlabs/looma-core @threadlabs/looma-tokens @tiptap/core
```

Standard npm and pnpm clients install the declared Tiptap extension peers automatically. If peer installation is disabled, install every package returned by `npm view @threadlabs/looma-editor peerDependencies` before importing `@threadlabs/looma-editor/extensions`.

## Import

```ts
import "@threadlabs/looma-tokens/tokens.css";
import "@threadlabs/looma-core/styles.css";
import "@threadlabs/looma-editor/editor.css";
import "@threadlabs/looma-core";
import "@threadlabs/looma-editor";

import {
  getDefaultEditorExtensions,
  LoomaTableKit,
  getLoomaTableExtensions,
  handleTableOverlayAction,
  insertTableAtRange
} from "@threadlabs/looma-editor/extensions";
```

## Candidate surface

- Six custom elements: toolbar, slash menu, table context menu, table toolbar, insert-table grid, and table overlay.
- `getDefaultEditorExtensions()` for the qualified Tiptap 2 extension preset.
- `LoomaTableKit` or `getLoomaTableExtensions()` for consumers adding Looma table editing to an existing Tiptap editor.
- `createLoomaSlashCommandExtension()` for the same slash-command behavior with a custom renderer.
- `handleTableOverlayAction(editor, detail)` for boundary row/column actions.
- `insertTableAtRange(editor, range, options)` for stable table insertion.
- Token-aligned editor CSS.

The turnkey `LoomaEditor` owns the Tiptap editor, command state, focus behavior,
formatting controls, slash commands, and table actions. Host applications pass
content and editability, receive document updates, and optionally provide an
image-upload callback. Persistence, collaboration, workspace/page concepts, and
app-specific commands remain host responsibilities.

The Vue turnkey editor also owns domain-neutral responsive-image behavior. A
host can mark an uploaded image responsive, persist intrinsic dimensions, and
provide a synchronous resolver for delivery-only image attributes. Looma keeps
those attributes out of Tiptap JSON, falls back to the stored source after a
rendition error, differentiates edit-mode selection from viewer activation, and
offers an in-editor retry after upload failure. CDN selection and full-screen
viewer rendering remain host responsibilities.

On narrow screens, `LoomaEditor` uses the browser visual viewport so its single
formatting/table dock stays above the software keyboard. The dock is touch
scrollable with CSS snap points. Slash and table popups use the same visible
viewport boundary. Tables keep a useful minimum cell width and scroll within
their wrapper instead of compressing every column.

## Accepted limitation

Table controls have visible keyboard/touch paths, hover-first row and column
selectors, outside-edge row insertion, column drag resizing, background color,
merge/split actions, and content-integrity coverage. Looma-owned editor controls
use the shared Lucide registry and inherit host theme colors through
`currentColor` and Looma tokens.

Link editing, mentions, and emoji picking are roadmap items—not Candidate claims. React integration remains a deferred repository preview.

See the [public Candidate docs](https://threadlabs-studio.github.io/looma/), [editor evidence](https://github.com/threadlabs-studio/looma/blob/main/docs/editor-bugs.md), and [R1 support matrix](https://github.com/threadlabs-studio/looma/blob/main/docs/release-support-matrix.md). Report problems in the [issue tracker](https://github.com/threadlabs-studio/looma/issues).

Licensed under [MIT](https://github.com/threadlabs-studio/looma/blob/main/LICENSE).
