# @threadlabs/looma

Looma's components, written once as [Declarative HTML Components](https://nextwebwg.org/html-next/)
and shipped three ways: as HTML, as Vue components, and as plain DOM factories.

```sh
pnpm add @threadlabs/looma
```

## Vue

```ts
import "@threadlabs/looma/tokens.css";
import "@threadlabs/looma/vue.css";
import { Button, TopBar } from "@threadlabs/looma/vue";
```

The Vue components are ordinary Vue 3.5.43+ single-file components, compiled to JavaScript with
declarations; the `.vue` sources ship beside them. They depend on Vue and Looma only.

The editor is Tiptap-based and needs `@tiptap/vue-3@^2.11.5`:

```ts
import { LoomaEditor } from "@threadlabs/looma/vue/editor";
import { getDefaultEditorExtensions } from "@threadlabs/looma/editor/extensions";
```

The editor components' event and geometry types, without Tiptap, are in
`@threadlabs/looma/editor/ui`.

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

## Theming

Components read design tokens (`--ui-*` custom properties) from `tokens.css` and a theme
(`theme-light.css`, `theme-dark.css`, `theme-high-contrast.css`), and each exposes its own
`--ui-<component>-*` properties. Set them on the component or any ancestor.


## Weave your design system

The package includes the documentation generator and theme customizer used by Looma's public site. Browse real component cards, generate a theme from shared semantic decisions, and document your own HTML Next components beside Looma's.

Install the optional documentation tools, then initialize your project:

```sh
pnpm add -D markupress @nextwebwg/htmlkit@1.0.0-alpha.69 vite
pnpm exec looma-docs init
pnpm exec looma-docs dev
```

The local editor saves `looma.theme.json` and generated `looma.theme.css`; import that CSS in your application. Static builds offer CSS and recipe downloads. See the [design-system guide](https://threadlabs.studio/looma/design-system/) for configuration, discovery, saving and recovery. Programmatic tooling is available through `@threadlabs/looma/docs`.
