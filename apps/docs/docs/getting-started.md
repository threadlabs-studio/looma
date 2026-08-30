---
slug: /
---

# Getting Started

Looma Release 1 is a Candidate `0.1.0` package set for Vue 3 and direct custom-element use. It is not Stable yet. React and Svelte adapters shown elsewhere in this repository are previews and are not published or supported in Release 1.

:::caution Publication pending

These commands become usable when the Candidate is published to npm. The repository is licensed under MIT; publication remains blocked on permanent namespace approval, authenticated scope ownership, and protected release-environment approval. Do not depend on an unpublished registry package.

:::

## Install the supported Vue graph

Use Node 20 or newer and Vue 3.5 or newer:

```bash npm2yarn
npm install vue@^3.5 @looma/vue @looma/core @looma/editor @looma/layout @looma/tokens
```

The editor declares its Tiptap 2 extension set as peer dependencies. Current npm and pnpm clients install compatible peers automatically. If your package manager disables peer installation, install every peer listed by `npm view @looma/editor peerDependencies` before importing `@looma/editor/extensions`.

For direct custom-element use without Vue or the editor:

```bash npm2yarn
npm install @looma/core @looma/layout @looma/tokens
```

## Import styles and register elements

Import global package CSS once in the browser entry for your application:

```ts
import "@looma/tokens/tokens.css";
import "@looma/tokens/theme-light.css";
import "@looma/layout/layout.css";
import "@looma/core/styles.css";
import "@looma/editor/editor.css";

import "@looma/layout";
import "@looma/core";
import "@looma/editor";
```

Choose only one Looma theme file unless your application supplies its own semantic-token values. Importing the public modules during server rendering is supported; registration and DOM behavior wait for a browser.

## Render a Vue component

Looma wrappers preserve native, authored markup. That markup is the semantic fallback before JavaScript upgrades the custom element.

```vue
<script setup lang="ts">
import { Button, Stack } from "@looma/vue";
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

- `@looma/tokens`, `@looma/layout`, `@looma/core`, `@looma/editor`, and `@looma/vue` are the complete R1 public graph.
- Core elements enhance consumer-authored semantic light DOM with shadow-root behavior. Layout and editor elements remain light DOM.
- `@looma/react` and `@looma/svelte` are repository previews, not R1 packages.
- Editor table UI is keyboard and touch operable and protected by content-integrity tests, but Confluence-level polish remains deferred.
- Looma does not own saves, uploads, collaboration, presence, workspace/page concepts, or app-specific commands.

Read the [Release 1 support and limitations](./release-1-support.md) before adopting the Candidate, then use the component pages for exact markup and API contracts.
