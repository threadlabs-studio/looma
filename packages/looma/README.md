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

## Site navigation

Provide the brand and navigation once. SiteHeader automatically adds a hamburger
in the inline navigation's position beside the logo below 64rem, keeping the same
brand-to-navigation gap. Optional actions stay at the trailing edge. It opens the
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
pnpm add -D markupress @threadlabs/markupkit@0.2.0 vite
pnpm exec looma-docs init
pnpm exec looma-docs dev
```

The local editor saves `looma.theme.json` and generated `looma.theme.css`; import that CSS in your application. Static builds offer CSS and recipe downloads. See the [design-system guide](https://threadlabs.studio/looma/design-system/) for configuration, discovery, saving and recovery. Programmatic tooling is available through `@threadlabs/looma/docs`.
