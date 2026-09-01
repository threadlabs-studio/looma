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

Vue and Tiptap are optional to Looma as a whole. The general Vue adapters need
only Vue 3.5 or newer and do not load the editor graph:

```bash npm2yarn
pnpm add @threadlabs/looma vue@^3.5.0
```

The Vue editor entry adds Tiptap 2. Pin Tiptap's official Vue lifecycle package
to the supported 2.x line:

```bash npm2yarn
pnpm add @threadlabs/looma vue@^3.5.0 @tiptap/vue-3@^2.11.5
```

Also install the optional Tiptap peers listed by
`npm view @threadlabs/looma peerDependencies`, keeping every `@tiptap/*` package
on a compatible 2.x version. Those peers are optional at the package level so
core-only and general `/vue` consumers do not install an editor stack.
`@tiptap/vue-3` is explicit because the consuming application—not Looma—owns
Tiptap's Vue editor lifecycle and `EditorContent`.

The root package, `@threadlabs/looma/core`, `@threadlabs/looma/layout`, and
`@threadlabs/looma/vue` work without Tiptap. Looma's `/editor` and
`/vue/editor` entries are Tiptap-backed by design.

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

For a Vue editor, use Tiptap's official lifecycle components with Looma's
editor-specific Vue entry:

```ts
import { useEditor, EditorContent } from "@tiptap/vue-3";
import {
  EditorToolbar,
  getDefaultEditorExtensions,
} from "@threadlabs/looma/vue/editor";

const editor = useEditor({ extensions: getDefaultEditorExtensions() });
```

## Know the Candidate boundary

- `@threadlabs/looma` is the complete R1 public package; supported capabilities live at its explicit subpaths.
- Core elements enhance consumer-authored semantic light DOM with shadow-root behavior. Layout and editor elements remain light DOM.
- React and Svelte adapters are internal repository previews, not R1 exports.
- Editor table UI is keyboard and touch operable and protected by content-integrity tests, but Confluence-level polish remains deferred.
- Looma does not own saves, uploads, collaboration, presence, workspace/page concepts, or app-specific commands.

Read the [Release 1 support and limitations](./release-1-support.md) before adopting the Candidate, then use the component pages for exact markup and API contracts.
