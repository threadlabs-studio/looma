# @threadlabs/looma

Looma's components are authored as HTML Next definitions. The HTML Next Vite adapter
converts those definitions in Vue, React and Svelte applications.

```sh
pnpm add '@threadlabs/looma@>=0.49.0' vue
pnpm add -D '@nextwebwg/html-next-unplugin@>=1.0.0-alpha.76' @vitejs/plugin-vue vite
```

```ts
// vite.config.ts
import { defineConfig } from "vite";
import htmlNext from "@nextwebwg/html-next-unplugin/vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({ plugins: [htmlNext({ target: "vue" }), vue()] });
```

```vue
<script setup>
import { UiButton, UiSiteHeader } from "@threadlabs/looma";
</script>
<template><UiButton variant="solid">Save</UiButton></template>
```

Import `@threadlabs/looma/tokens.css` and one theme in your application entry.
The framework compiler includes component styles; source consumers do not import
`@threadlabs/looma/vue.css`. Use `html-next-sync` before standalone type checking
and include its `src/html-next.d.ts` output in your TypeScript project.
The framework-neutral `trackInputModality` helper is available from
`@threadlabs/looma/input-modality` for client setup.

For React, use `target: "react"` before `react()` from `@vitejs/plugin-react`.
For Svelte 5, use `target: "svelte"` before `svelte()` from
`@sveltejs/vite-plugin-svelte`. Both import the same prefixed names from
`@threadlabs/looma`. Use HTML Next runtime alpha.74 or later and Vite adapter alpha.76 or later; see the [loading guide](https://threadlabs.studio/looma/getting-started/).

The document editor, compact field, and compact renderer use the same source imports:

```ts
import { UiEditor, UiCompactEditor, UiCompactContent } from "@threadlabs/looma";
import type { LoomaMentionQuery, LoomaImageUploader } from "@threadlabs/looma/editor";
```

Both editable components accept Tiptap JSON through `content` and emit native `change` events with `detail.content`. The document editor answers service requests for extensions, mentions, links, uploads, code grammars and image delivery. The compact field supports short rich text without loading document controls. `UiCompactContent` renders escaped JSON during SSR. Install the supported Tiptap 2 peers for editing:

```sh
pnpm add '@tiptap/core@>=2 <3' '@tiptap/pm@>=2 <3'
```

The Vite compiler includes styles; no Vue stylesheet or Tiptap Vue integration is needed.

## Expressive Markdown

Convert saved editor JSON with the SSR-safe `@threadlabs/looma/editor/expressmark`
adapter. It preserves supported semantic content and reports unsupported data
instead of silently flattening it. See [conversion examples and coverage](EXPRESSIVE-MARKDOWN.md).

## HTML

```html
<link rel="stylesheet" href="…/@threadlabs/looma/tokens.css">
<script type="module">
  import "@threadlabs/looma";
</script>

<ui-stack gap="m">
  <ui-button variant="solid">Save</ui-button>
</ui-stack>
```

Importing the package registers every component with the
[HTML Next runtime](https://www.npmjs.com/package/@nextwebwg/html-next), which turns
each `<ui-*>` element into its native root. Each component's styles are scoped to it; the token
stylesheet is the only stylesheet to include. Without a build, link components one by one from
`@threadlabs/looma/components/<tag>/<tag>.html`.

## Site navigation

Provide the brand and navigation once. SiteHeader automatically adds a hamburger
in the inline navigation's position beside the logo below 64rem, using compact
mobile spacing. Optional actions stay at the trailing edge. It opens the
same links in a full-height, scrollable modal drawer with a dark backdrop. It
handles focus, page scroll locking, Escape,
outside presses, and closing after link selection. No separate menu or drawer wiring
is needed. `breakpoint="sm"` and `breakpoint="md"` switch at 40rem and 48rem.

```html
<ui-site-header>
  <a slot="brand" href="/">Folio</a>
  <a slot="navigation" href="/guide">Guide</a>
  <a slot="navigation" href="/journal">Journal</a>
</ui-site-header>
```

In Vue, use `SiteHeader` with `#brand`, `#navigation`, and optional `#actions`.
Router links keep their original handlers and state. Localize `label`, `menuLabel`,
and `closeLabel` as needed. Without JavaScript, navigation stays available inline.

Use the optional `menu` slot only when the trigger opens a different navigation
surface, such as a combined documentation sidebar. That explicit override owns its
own target and behavior; omitting it gives you the automatic drawer.

## Theming

Components read design tokens (`--ui-*` custom properties) from `tokens.css` and a theme
(`theme-light.css`, `theme-dark.css`, `theme-high-contrast.css`), and each exposes its own
`--ui-<component>-*` properties. Set them on the component or any ancestor.


## Weave your design system

The package includes the documentation generator and theme customizer used by Looma's public site. Browse real component cards, generate a theme from shared semantic decisions, and document your own HTML Next components beside Looma's.

Install the optional documentation tools, then initialize your project:

```sh
pnpm add -D 'markupress@>=0.14.6' '@threadlabs/markupkit@>=0.4.2' vite
pnpm exec looma-docs init
pnpm exec looma-docs dev
```

The local editor saves `looma.theme.json` and generated `looma.theme.css`; import that CSS in your application. Static builds offer CSS and recipe downloads. See the [design-system guide](https://threadlabs.studio/looma/design-system/) for configuration, discovery, saving and recovery. Programmatic tooling is available through `@threadlabs/looma/docs`.
