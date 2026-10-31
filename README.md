<p align="center">
  <img src="apps/docs/static/img/looma-mark.svg" alt="Looma" width="120" height="120">
</p>

<h1 align="center">Looma</h1>

<p align="center">
  A stack-agnostic UI library built on web standards and Open UI principles.
</p>

<p align="center">
  <a href="https://threadlabs.studio/looma/">Documentation</a> ·
  <a href="apps/docs/docs/getting-started.md">Getting started</a> ·
  <a href="https://github.com/threadlabs-studio/looma/issues">Issues</a>
</p>

## Install

```sh
pnpm add '@threadlabs/looma@>=0.49.0'
```

Looma's HTML definitions are converted by the HTML Next Vite adapter in your application.
Configure `htmlNext({ target: "vue" })`, `target: "react"`, or `target: "svelte"`
before the framework's standard Vite plugin, then import components from the package root:

```ts
import "@threadlabs/looma/tokens.css";
import "@threadlabs/looma/theme-light.css";
import { UiButton, UiSiteHeader } from "@threadlabs/looma";
```

See the [loading guide](docs/framework-loading.md) for installation, Vite configuration,
framework calls, styles and types. Use HTML Next runtime alpha.74 or later and Vite adapter alpha.76 or later for Vue, React and Svelte; dependency ranges admit later releases beyond 1.0.

## Package

| Entry | Contents |
| --- | --- |
| `@threadlabs/looma` | HTML source condition for the Vite framework adapter; native registration fallback |
| `/components/*` | Individual HTML definitions and their controllers |
| `/editor`, `/editor/compact`, `/editor/ui`, `/editor/extensions` | Framework-neutral editor contracts, Tiptap extensions and commands |
| `/input-modality` | Shared client input-modality tracking |
| `tokens.css`, `theme-*.css` | Design tokens and themes |

The document and compact editors use the same authored HTML Next component model as the controls. Their framework-neutral sessions own Tiptap; Vue, React and Svelte use the Vite plugin. Looma is pre-1.0: breaking changes require a minor release.

Editing requires the supported Tiptap 2 peers:

```sh
pnpm add '@tiptap/core@>=2 <3' '@tiptap/pm@>=2 <3'
```

## Principles

- Accessibility first and mobile first.
- Progressive enhancement with SSR-first markup.
- HTML and CSS first, JavaScript as enhancement.
- Composition over configuration.
- No global magical state.
- No external margins in components.

## Documentation

- [Getting started](apps/docs/docs/getting-started.md)
- [Theming: global, group, and component values](apps/docs/docs/tokens.md)
- [Release 1 support](apps/docs/docs/release-1-support.md)
- [Architecture](docs/architecture.md)
- [Adapters](docs/adapters.md)
- [Known follow-ups](docs/follow-ups.md)

## License

MIT. See [LICENSE](./LICENSE).

## Compact rich text

Import `UiCompactEditor` and `UiCompactContent` from `@threadlabs/looma` through the HTML Next Vite plugin. Pass a Tiptap JSON document as `content` and handle `change.detail.content`; use `label` for the accessible textbox name and `id` for a stable textbox reference. The field supports paragraphs, hard breaks, bold, italic, inline code, Markdown typing rules and undo/redo without a document toolbar. Enter creates a paragraph; Shift+Enter creates a line break. `editable` defaults to true. Native `--focus` and `--focus-end` commands focus the field.

The compact field uses the same field surface, border, radius and focus tokens as Textarea. Its text grows inside a bounded scrolling field; narrow/coarse-pointer use keeps body-sized type. `UiCompactContent` renders escaped semantic HTML, including during SSR.

Answer the `extensions` request before creation to install additional Tiptap extensions. The application owns lookup, persistence and serialization for its custom nodes. Headless compact helpers are available from `@threadlabs/looma/editor/compact`. This entry loads no document toolbar, slash menu, tables, image controls or syntax highlighting. The Vite compiler includes its styles.
