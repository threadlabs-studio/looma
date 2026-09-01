# @threadlabs/looma

The public Looma package. Install it once, then import only the framework and
feature subpaths your application uses.

```sh
pnpm add @threadlabs/looma
```

```ts
import { openOverlay } from "@threadlabs/looma";
import { TopBar } from "@threadlabs/looma/vue";
import { getDefaultEditorExtensions } from "@threadlabs/looma/editor/extensions";
```

Vue and Tiptap are optional peers. Install them only when using the matching
subpaths. See the repository getting-started guide for the full CSS and adapter
setup.
