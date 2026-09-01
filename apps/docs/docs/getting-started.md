---
slug: /
---

# Getting Started

Looma Release 1 is a Candidate `0.1.0` package for Vue 3 and direct custom-element use. It is not Stable yet. React and Svelte adapters in the repository are internal previews and are not published or supported in Release 1.

:::caution Confirm the Candidate tag

These instructions target the exact `@threadlabs/looma@0.1.0` Candidate. Before adopting it, confirm that npm resolves that package at `0.1.0` under the `candidate` dist-tag. Preview documentation can be built before that registry gate; production documentation is published only after the gate passes.

:::

## Install Looma

Use Node 20 or newer:

```bash npm2yarn
pnpm add @threadlabs/looma
```

Vue and Tiptap are optional peers. Install Vue 3.5 or newer only when using
`@threadlabs/looma/vue`. Install the Tiptap 2 peers listed by
`npm view @threadlabs/looma peerDependencies` only when using
`@threadlabs/looma/editor/extensions` (current npm and pnpm clients normally
install compatible peers automatically).

The root package, `@threadlabs/looma/core`, `@threadlabs/looma/layout`, and
`@threadlabs/looma/editor` work without Vue or Tiptap.

## Import styles and register elements

Import global package CSS once in the browser entry for your application:

```ts
import "@threadlabs/looma/tokens.css";
import "@threadlabs/looma/theme-light.css";
import "@threadlabs/looma/layout.css";
import "@threadlabs/looma/styles.css";
import "@threadlabs/looma/editor.css";

import "@threadlabs/looma/layout";
import "@threadlabs/looma";
import "@threadlabs/looma/editor";
```

Choose only one Looma theme file unless your application supplies its own semantic-token values. Importing the public modules during server rendering is supported; registration and DOM behavior wait for a browser.

## Render a Vue component

Looma wrappers preserve native, authored markup. That markup is the semantic fallback before JavaScript upgrades the custom element.

```vue
<script setup lang="ts">
import { Button, Stack } from "@threadlabs/looma/vue";
</script>

<template>
  <Stack gap="md">
    <h1>Account</h1>
    <Button variant="solid">
      <button type="button">Save</button>
    </Button>
  </Stack>
</template>
```

## Know the Candidate boundary

- `@threadlabs/looma` is the complete R1 public package; supported capabilities live at its explicit subpaths.
- Core elements enhance consumer-authored semantic light DOM with shadow-root behavior. Layout and editor elements remain light DOM.
- React and Svelte adapters are internal repository previews, not R1 exports.
- Editor table UI is keyboard and touch operable and protected by content-integrity tests, but Confluence-level polish remains deferred.
- Looma does not own saves, uploads, collaboration, presence, workspace/page concepts, or app-specific commands.

Read the [Release 1 support and limitations](./release-1-support.md) before adopting the Candidate, then use the component pages for exact markup and API contracts.
