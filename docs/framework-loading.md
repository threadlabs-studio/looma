# Load Looma with HTML Next

Looma's HTML definitions are the source for Vue, React and Svelte components. Install the HTML Next Vite adapter and your framework's standard Vite compiler. Import components from `@threadlabs/looma`; the adapter generates the framework code and types in the consuming project.

## Vue

```sh
pnpm add @threadlabs/looma vue
pnpm add -D @nextwebwg/html-next-unplugin@1.0.0-alpha.70 @vitejs/plugin-vue vite vue-tsc typescript
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

Use `htmlNext({ target: "react" })` before `react()` from `@vitejs/plugin-react`.
Install React, React DOM, their types, and the standard React Vite plugin. The
component names retain their prefix:

```tsx
import { UiButton, UiStack } from "@threadlabs/looma";

export default function Account() {
  return <UiStack gap="m"><h1>Account</h1><UiButton variant="solid">Save</UiButton></UiStack>;
}
```

React adoption is currently blocked by declaration-generation errors in HTML
Next 1.0.0-alpha.70. The source consumer test records these errors; the loading
pattern above is the adapter API, not a claim that the complete Looma graph is
qualified for React.

## Svelte

Use `htmlNext({ target: "svelte" })` before `svelte()` from
`@sveltejs/vite-plugin-svelte`. Install Svelte 5 and its standard Vite plugin.

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
