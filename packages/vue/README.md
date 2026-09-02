# @threadlabs/looma-vue

> Internal implementation workspace. Consumers install `@threadlabs/looma` and
> import `@threadlabs/looma/vue` for general adapters or
> `@threadlabs/looma/vue/editor` for the Vue editor integration.

The supported Vue 3 adapter for Looma Release 1. `/vue` maps Vue props, slots, and callbacks to layout and core elements without loading the editor graph. `/vue/editor` supplies the Tiptap-backed editor helpers and wrappers.

Release status: Candidate `0.1.1`. Browser registration/render and linked-workspace Knit qualification pass; packed-artifact Knit qualification remains a publication gate. React and Svelte adapters are not part of the R1 public package set.

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

Import the required token/component CSS from their owning packages. The adapter and its public dependency graph must remain safe to import during SSR.

See the [adapter contract](https://github.com/threadlabs-studio/looma/blob/main/docs/adapters.md), [public Candidate docs](https://threadlabs-studio.github.io/looma/), and [R1 support matrix](https://github.com/threadlabs-studio/looma/blob/main/docs/release-support-matrix.md). Report problems in the [issue tracker](https://github.com/threadlabs-studio/looma/issues).

Licensed under [MIT](https://github.com/threadlabs-studio/looma/blob/main/LICENSE).
