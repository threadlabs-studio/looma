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

Looma Release 1 is a Candidate `0.5.0` package for Vue 3 and direct declarative HTML use. It is not Stable yet. React support is in development.

:::caution Confirm the Candidate tag

These instructions target the exact `@threadlabs/looma@0.5.0` Candidate. Before adopting it, confirm that npm resolves that package at `0.5.0` under the `candidate` dist-tag. Preview documentation can be built before that registry gate; production documentation is published only after the gate passes.

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

The root package and `@threadlabs/looma/vue` work without Tiptap. Looma's `/editor` and
`/vue/editor` entries are Tiptap-backed by design.

## Import the tokens and the components

Import the design tokens and one theme once in the browser entry for your application. For HTML
pages, import the package to register every component; each component carries its own scoped
styles.

```ts
import "@threadlabs/looma/tokens.css";
import "@threadlabs/looma/theme-light.css";

import "@threadlabs/looma";
```

Vue applications import the Vue components and their stylesheet instead:

```ts
import "@threadlabs/looma/tokens.css";
import "@threadlabs/looma/theme-light.css";
import "@threadlabs/looma/vue.css";
```

Choose only one Looma theme file unless your application supplies its own semantic-token values. Importing the public modules during server rendering is supported; document lowering and controller behavior wait for a browser.

## How components load

HTML Next defines two ways to load components, and they build the same components:

- **Installed package** (above). Your bundler imports Looma's entry points, which register the component definitions ahead of time. This is how Looma is used today.
- **No build.** A page loads HTML Next's browser entry with a `<script type="module">` and links each component's HTML with `<link rel="component" href="…/@threadlabs/looma/components/ui-button/ui-button.html">`; definitions load on demand.

## Render with a framework adapter

The mode control above changes the syntax, not the component model. The Vue components are converted from the same definitions: each renders the component's native root with Vue, with the same props, events, slots, methods, and behavior, and no HTML Next runtime.

```vue
<script setup lang="ts">
import { Button, Stack } from "@threadlabs/looma/vue";
</script>

<template>
  <Stack gap="m">
    <h1>Account</h1>
    <Button variant="solid">Save</Button>
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
- React support is in development; the package has no React export.
- `LoomaEditor` owns its Tiptap lifecycle, formatting controls, slash commands,
  bounded mention suggestions, focus behavior, image insertion, and table editing.
- Hosts own persistence, the authorized people-directory query, upload
  transport, collaboration, presence, workspace/page concepts, and app-specific
  commands.

Read the [Release 1 support and limitations](./release-1-support.md) before adopting the Candidate, then use the component pages for exact markup and API contracts.
