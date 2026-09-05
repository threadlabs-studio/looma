# @threadlabs/looma-vue

> Internal implementation workspace. Consumers install `@threadlabs/looma` and
> import `@threadlabs/looma/vue` for general adapters or
> `@threadlabs/looma/vue/editor` for the Vue editor integration.

The supported Vue 3 adapter for Looma Release 1. `/vue` maps Vue props, slots,
and callbacks to layout and core elements without loading the editor graph.
`/vue/editor` exports `LoomaEditor`, a complete Tiptap editor, plus low-level
wrappers for advanced composition.

Release status: Candidate `0.1.12`. Browser registration/render and linked-workspace Knit qualification pass; packed-artifact Knit qualification remains a publication gate. React and Svelte adapters are not part of the R1 public package set.

## Install

For the general adapter, which has no editor or Tiptap dependency:

```sh
pnpm add @threadlabs/looma vue@^3.5.0
```

For `@threadlabs/looma/vue/editor`, keep the official Vue integration and all
other `@tiptap/*` peers on the supported Tiptap 2 line:

```sh
pnpm add @threadlabs/looma vue@^3.5.0 @tiptap/vue-3@^2.11.5
```

Install the remaining optional editor peers reported by
`npm view @threadlabs/looma peerDependencies` at compatible 2.x versions.

## Use

```vue
<script setup lang="ts">
import { Button } from "@threadlabs/looma/vue";
</script>

<template>
  <Button variant="solid">
    <button type="button">Save</button>
  </Button>
</template>
```

Use the turnkey editor when Looma should own the complete editing experience:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { LoomaEditor } from "@threadlabs/looma/vue/editor";

const document = ref({ type: "doc", content: [] });
</script>

<template>
  <LoomaEditor
    v-model="document"
    :upload-image="async file => ({ url: await upload(file), alt: file.name })"
  />
</template>
```

`LoomaEditor` owns formatting controls, slash commands, selection behavior, and
table editing. The host owns persistence and implements the optional upload callback.
On mobile, it exposes one visual-viewport-aware toolbar above the keyboard. A
table selection replaces formatting actions with table actions; the leading
Formatting control returns to text controls. The toolbar is horizontally
touch-scrollable and snap-aligned.

Import the required token/component CSS from their owning packages. The adapter and its public dependency graph must remain safe to import during SSR.

See the [adapter contract](https://github.com/threadlabs-studio/looma/blob/main/docs/adapters.md), [public Candidate docs](https://threadlabs-studio.github.io/looma/), and [R1 support matrix](https://github.com/threadlabs-studio/looma/blob/main/docs/release-support-matrix.md). Report problems in the [issue tracker](https://github.com/threadlabs-studio/looma/issues).

Licensed under [MIT](https://github.com/threadlabs-studio/looma/blob/main/LICENSE).
