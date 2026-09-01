# @threadlabs/looma

The public Looma package. Install it once, then import only the framework and
feature subpaths your application uses.

```sh
pnpm add @threadlabs/looma
```

```ts
import { openOverlay } from "@threadlabs/looma";
import { TopBar } from "@threadlabs/looma/vue";
import { EditorToolbar, getDefaultEditorExtensions } from "@threadlabs/looma/vue/editor";
```

Vue and Tiptap are optional to the package as a whole. `/vue` needs only Vue 3.5
or newer. Looma's `/editor` and `/vue/editor` surfaces are Tiptap-backed and
require the declared Tiptap 2 peers; `/vue/editor` consumers must also install
`@tiptap/vue-3@^2.11.5` for `useEditor` and `EditorContent`. `/editor/ui` is the
low-level UI-only boundary. See the repository getting-started guide for the
full CSS and adapter setup.
