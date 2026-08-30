# @looma/vue

The supported Vue 3 adapter for Looma Release 1. It maps Vue props, slots, and callbacks to the public layout, core, and editor custom elements without owning divergent behavior.

Release status: Candidate `0.1.0`. Browser registration/render and linked-workspace Knit qualification pass; packed-artifact Knit qualification remains a publication gate. React and Svelte adapters are not part of the R1 public package set.

## Install

```sh
pnpm add vue @looma/vue @looma/core @looma/editor @looma/layout @looma/tokens
```

## Use

```vue
<script setup lang="ts">
import { Button } from "@looma/vue";
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
