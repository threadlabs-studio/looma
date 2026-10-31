---
slug: /getting-started
title: Getting Started
hide_table_of_contents: true
---

import { DeclarativeModel } from "@site/src/components/DeclarativeModel";

<DeclarativeModel />

## Install Looma

Looma's HTML definitions are the source for Vue, React and Svelte components. In an existing Vite project, install Looma and the HTML Next Vite adapter:

```sh
pnpm add @threadlabs/looma
pnpm add -D @nextwebwg/html-next-unplugin
```

Looma installs its HTML Next runtime dependency automatically. Configure the adapter before your framework's Vite plugin, then import components from `@threadlabs/looma`. The adapter generates the framework code and types in your project.

Framework conversion requires Vite adapter alpha.79 or later, which includes Vue server preparation for date controls. Looma declares its runtime minimum in its package dependencies; both packages admit later releases beyond 1.0.

## Vue

If your project does not already have Vue tooling, install it:

```sh
pnpm add vue
pnpm add -D @vitejs/plugin-vue vite vue-tsc typescript
```

```ts
// vite.config.ts
import { defineConfig } from "vite";
import htmlNext from "@nextwebwg/html-next-unplugin/vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [htmlNext({ target: "vue" }), vue()],
});
```

```vue
<script setup>
import { UiButton, UiStack } from "@threadlabs/looma";
</script>

<template>
  <UiStack gap="m">
    <h1>Account</h1>
    <UiButton variant="solid">Save</UiButton>
  </UiStack>
</template>
```

## React

If your project does not already have React tooling, install it:

```sh
pnpm add react react-dom
pnpm add -D @vitejs/plugin-react vite typescript @types/react @types/react-dom
```

```ts
// vite.config.ts
import { defineConfig } from "vite";
import htmlNext from "@nextwebwg/html-next-unplugin/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [htmlNext({ target: "react" }), react()],
});
```

The component names retain their prefix:

```tsx
import { UiButton, UiStack } from "@threadlabs/looma";

export default function Account() {
  return <UiStack gap="m"><h1>Account</h1><UiButton variant="solid">Save</UiButton></UiStack>;
}
```

## Svelte

If your project does not already have Svelte tooling, install it:

```sh
pnpm add svelte@5
pnpm add -D @sveltejs/vite-plugin-svelte vite svelte-check typescript
```

```ts
// vite.config.ts
import { defineConfig } from "vite";
import htmlNext from "@nextwebwg/html-next-unplugin/vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [htmlNext({ target: "svelte" }), svelte()],
});
```

```svelte
<script>
import { UiButton, UiStack } from "@threadlabs/looma";
</script>

<UiStack gap="m"><h1>Account</h1><UiButton variant="solid">Save</UiButton></UiStack>
```

## Styles and type checking

Import tokens and one theme once in your application entry:

```ts
import "@threadlabs/looma/tokens.css";
import "@threadlabs/looma/theme-light.css";
```

The framework compiler includes each component's styles. A source consumer does
not import `@threadlabs/looma/vue.css`.

Applications that start touch-input tracking explicitly import `trackInputModality`
from `@threadlabs/looma/input-modality` and call it with their document during client
setup. This replaces its former Vue-barrel export; its behavior is unchanged.

The adapter discovers Looma through its `html-next` export condition. An HTML
folder export names `ui-button` as `UiButton`, `ui-site-header` as `UiSiteHeader`,
and `ui-editor-toolbar` as `UiEditorToolbar`. These names apply in all three
frameworks.

Vite prepares framework declarations automatically. Run `html-next-sync` before
standalone `vue-tsc`, `tsc`, or `svelte-check`, and include `src/html-next.d.ts` in
your TypeScript project. Generated files under `node_modules/.html-next` and the
ambient declaration file may be ignored by Git.

Named slots use Vue's `<template #brand>`, React's `slots={{ brand: <a>…</a> }}`,
and Svelte snippets passed through `slots={{ brand }}`. Default content uses the
framework's normal children syntax. Declared events retain their native
`CustomEvent` payloads; read `event.detail`.

## HTML Next pages

Link the definitions used by the page:

```html
<link rel="component" href="@threadlabs/looma/components/ui-button/ui-button.html">
<ui-button variant="solid">Save</ui-button>
```

An HTML Next page compiler resolves the package resource. A browser-only page
needs a browser-resolvable URL and the HTML Next browser runtime. The `.html`
file is a component definition, not an ordinary JavaScript component import.

## Editors

Vue and Tiptap are optional to Looma as a whole. Install only the framework and editor peers used by your application.

The document editor (`UiEditor`), short field (`UiCompactEditor`), and semantic JSON renderer (`UiCompactContent`) are HTML Next components. Import them through the same Vite plugin as the other controls. Install `@tiptap/core` and `@tiptap/pm` for editing; there is no Tiptap Vue dependency.

Use the supported Tiptap 2 peers:

```sh
pnpm add '@tiptap/core@>=2 <3' '@tiptap/pm@>=2 <3'
```

Pass JSON through `content`, handle `change.detail.content`, and answer the host integration requests:

```vue
<script setup lang="ts">
import { ref } from "vue";
import {
  UiEditor,
} from "@threadlabs/looma";
import type { LoomaImageUploader, LoomaMentionQuery } from "@threadlabs/looma/editor";

const content = ref({ type: "doc", content: [{ type: "paragraph" }] });
const findPeople: LoomaMentionQuery = async ({ query, limit }, { signal }) => {
  const response = await fetch(
    `/api/people?q=${encodeURIComponent(query)}&limit=${limit}`,
    { signal },
  );
  return (await response.json()).people;
};
const uploadImage: LoomaImageUploader = async ({ file }, { signal }) => ({
  src: await upload(file, { signal }),
  alt: file.name,
});
</script>

<template>
  <UiEditor
    :content="content"
    @change="content = $event.detail.content"
    :mention-query="findPeople"
    :mention-limit="8"
    :image-upload="uploadImage"
  />
</template>
```

To add only Looma table behavior to an existing Tiptap editor:

```ts
import { Editor } from "@tiptap/core";
import { LoomaTableKit } from "@threadlabs/looma/editor/extensions";

const editor = new Editor({ extensions: [LoomaTableKit] });
```

## Know the boundary

- `@threadlabs/looma` is the complete R1 public package; supported capabilities live at its explicit subpaths.
- Every published component contract lowers to its declared native light-DOM root. No custom-element registry or shadow-root implementation is part of the public model.
- Vue, React and Svelte use the HTML Next Vite adapter; framework compilation belongs to the consumer.
- `UiEditor` owns its Tiptap lifecycle, formatting controls, slash commands,
  bounded mention suggestions, focus behavior, image insertion, and table editing.
- Hosts own persistence, the authorized people-directory query, upload
  transport, collaboration, presence, workspace/page concepts, and app-specific
  commands.

Read the [Release 1 support and limitations](./release-1-support.md) before adopting Looma, then use the component pages for exact markup and API contracts.
