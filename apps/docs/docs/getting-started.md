---
slug: /
title: Getting Started
hide_title: true
hide_table_of_contents: true
---

import { DocsLandingHero } from "@site/src/components/DocsLandingHero";
import { DeclarativeModel } from "@site/src/components/DeclarativeModel";

<DocsLandingHero />

<DeclarativeModel />

## Install Looma

Looma Release 1 is a Candidate `0.2.7` package for Vue 3 and direct declarative HTML use. It is not Stable yet. React and Svelte adapters in the repository are internal previews and are not published or supported in Release 1.

:::caution Confirm the Candidate tag

These instructions target the exact `@threadlabs/looma@0.2.7` Candidate. Before adopting it, confirm that npm resolves that package at `0.2.7` under the `candidate` dist-tag. Preview documentation can be built before that registry gate; production documentation is published only after the gate passes.

:::

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

Looma ships the concrete Tiptap extensions used by its editor preset inside the
editor subpath. You do not need to enumerate those packages yourself.
`@tiptap/vue-3` is explicit because the turnkey `LoomaEditor` uses Tiptap's
official Vue lifecycle. Applications that use `/editor` without Vue should
install a compatible `@tiptap/core` 2.x instead.

The root package, `@threadlabs/looma/core`, `@threadlabs/looma/layout`, and
`@threadlabs/looma/vue` work without Tiptap. Looma's `/editor` and
`/vue/editor` entries are Tiptap-backed by design.

## Import styles and component graphs

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

Choose only one Looma theme file unless your application supplies its own semantic-token values. Importing the public modules during server rendering is supported; document lowering and controller behavior wait for a browser.

## Render with a framework adapter

The mode control above changes the syntax, not the component model. Looma wrappers preserve native, authored markup and project the same inputs, methods, events, slots, and controller behavior into the framework lifecycle. The markup remains the semantic fallback before JavaScript lowers the declarative invocation to its native root and attaches behavior.

```vue
<script setup lang="ts">
import { Button, Stack } from "@threadlabs/looma/vue";
</script>

<template>
  <Stack gap="m">
    <h1>Account</h1>
    <Button variant="solid">
      <button type="button">Save</button>
    </Button>
  </Stack>
</template>
```

For a complete Vue editor, pass content and host integration callbacks to Looma:

```vue
<script setup lang="ts">
import { ref } from "vue";
import {
  LoomaEditor,
  type LoomaMentionProvider,
} from "@threadlabs/looma/vue/editor";

const content = ref({ type: "doc", content: [] });
const findPeople: LoomaMentionProvider = async (query, { limit }) => {
  const response = await fetch(
    `/api/people?q=${encodeURIComponent(query)}&limit=${limit}`,
  );
  return (await response.json()).people;
};
</script>

<template>
  <LoomaEditor
    v-model="content"
    :mention-provider="findPeople"
    :mention-limit="8"
    :upload-image="async file => ({ url: await upload(file), alt: file.name })"
  />
</template>
```

To add only Looma table behavior to an existing Tiptap editor:

```ts
import { Editor } from "@tiptap/core";
import { LoomaTableKit } from "@threadlabs/looma/editor/extensions";

const editor = new Editor({ extensions: [LoomaTableKit] });
```

## Know the Candidate boundary

- `@threadlabs/looma` is the complete R1 public package; supported capabilities live at its explicit subpaths.
- Every published component contract lowers to its declared native light-DOM root. No custom-element registry or shadow-root implementation is part of the public model.
- React and Svelte adapters are internal repository previews, not R1 exports.
- `LoomaEditor` owns its Tiptap lifecycle, formatting controls, slash commands,
  bounded mention suggestions, focus behavior, image insertion, and table editing.
- Hosts own persistence, the authorized people-directory query, upload
  transport, collaboration, presence, workspace/page concepts, and app-specific
  commands.

Read the [Release 1 support and limitations](./release-1-support.md) before adopting the Candidate, then use the component pages for exact markup and API contracts.
