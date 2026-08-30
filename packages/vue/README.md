# @looma/vue

The supported Vue 3 adapter for Looma Release 1. It maps Vue props, slots, and callbacks to the public layout, core, and editor custom elements without owning divergent behavior.

Release status: Candidate `0.1.0`, qualified against Knit. React and Svelte adapters are not part of the R1 public package set.

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

See the [adapter contract](../../docs/adapters.md) and [R1 support matrix](../../docs/release-support-matrix.md).
