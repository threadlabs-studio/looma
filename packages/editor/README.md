# @looma/editor

Candidate editor UI elements, styles, Tiptap 2 presets, and table helpers for Looma. The package uses Tiptap's vanilla `Editor`; `@looma/vue` is the supported Release 1 adapter.

Release status: Candidate `0.1.0`, not Stable.

## Install

```sh
pnpm add @looma/editor @looma/core @looma/tokens @tiptap/core
```

Standard npm and pnpm clients install the declared Tiptap extension peers automatically. If peer installation is disabled, install every package returned by `npm view @looma/editor peerDependencies` before importing `@looma/editor/extensions`.

## Import

```ts
import "@looma/tokens/tokens.css";
import "@looma/core/styles.css";
import "@looma/editor/editor.css";
import "@looma/core";
import "@looma/editor";

import {
  getDefaultEditorExtensions,
  handleTableOverlayAction,
  insertTableAtRange
} from "@looma/editor/extensions";
```

## Candidate surface

- Six custom elements: toolbar, slash menu, table context menu, table toolbar, insert-table grid, and table overlay.
- `getDefaultEditorExtensions()` for the qualified Tiptap 2 extension preset.
- `handleTableOverlayAction(editor, detail)` for boundary row/column actions.
- `insertTableAtRange(editor, range, options)` for stable table insertion.
- Token-aligned editor CSS.

The app creates the Tiptap editor, owns content and persistence, supplies command state, maps emitted intent to commands, and restores focus. Looma does not own saves, uploads, collaboration, or app-specific commands.

## Accepted limitation

Table controls have visible keyboard/touch paths and content-integrity coverage, but Confluence-level boundary polish and discoverability remain deferred under `E-TBL-003`. Data loss or corruption is not an accepted limitation.

Block menus, floating toolbars, link editing, mentions, and emoji picking are roadmap items—not Candidate claims. React integration remains a deferred repository preview.

See the [public Candidate docs](https://threadlabs-studio.github.io/looma/), [editor evidence](https://github.com/threadlabs-studio/looma/blob/main/docs/editor-bugs.md), and [R1 support matrix](https://github.com/threadlabs-studio/looma/blob/main/docs/release-support-matrix.md). Report problems in the [issue tracker](https://github.com/threadlabs-studio/looma/issues).

Licensed under [MIT](https://github.com/threadlabs-studio/looma/blob/main/LICENSE).
