# @threadlabs/looma

The public Looma package. Install it once, then import only the framework and
feature subpaths your application uses.

```sh
pnpm add @threadlabs/looma
```

```ts
import { openOverlay } from "@threadlabs/looma";
import { TopBar } from "@threadlabs/looma/vue";
import { LoomaEditor } from "@threadlabs/looma/vue/editor";
```

Vue and Tiptap are optional to the package as a whole. `/vue` needs only Vue 3.5
or newer. Looma's `/editor` and `/vue/editor` surfaces are Tiptap-backed and
ship Looma's concrete extension set within those subpaths. `/vue/editor` consumers
must also install `@tiptap/vue-3@^2.11.5`; `LoomaEditor` owns the Tiptap lifecycle,
formatting toolbar, slash menu, bounded mention suggestions, image insertion,
and table editing. `/editor/ui`
is the low-level UI-only boundary. See the
repository getting-started guide for the full CSS and adapter setup.
