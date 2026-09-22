<p align="center">
  <img src="apps/docs/static/img/looma-mark.svg" alt="Looma" width="120" height="120">
</p>

<h1 align="center">Looma</h1>

<p align="center">
  A stack-agnostic UI library built on web standards and Open UI principles.
</p>

<p align="center">
  <a href="https://threadlabs-studio.github.io/looma/">Documentation</a> ·
  <a href="apps/docs/docs/getting-started.md">Getting started</a> ·
  <a href="https://github.com/threadlabs-studio/looma/issues">Issues</a>
</p>

## Install

```sh
pnpm add @threadlabs/looma
```

```ts
import "@threadlabs/looma/tokens.css";
import "@threadlabs/looma/vue.css";
import { Button, TopBar } from "@threadlabs/looma/vue";
```

Import the tokens, one theme, and the components once in your browser entry.
See the [getting-started guide](apps/docs/docs/getting-started.md) for the exact
imports and a Vue example.

The root package and the CSS subpaths need no framework. `@threadlabs/looma/vue`
adds only Vue 3.5 or newer. The editor is built on Tiptap: its extension preset
ships inside the editor subpath, and editor consumers supply a compatible
Tiptap 2 core. `@threadlabs/looma/vue/editor` exports a turnkey `LoomaEditor`
component and uses `@tiptap/vue-3@^2.11.5`.

## Package

Looma ships as a single package, `@threadlabs/looma`:

| Entry | Contents |
| --- | --- |
| `@threadlabs/looma` | Registers every component with the HTML Next runtime for HTML pages |
| `/components/*` | Individual component files for pages without a build |
| `/vue`, `/vue.css` | Every component as a Vue 3.5 component, plus their scoped styles |
| `/vue/editor` | The turnkey `LoomaEditor` and the editor components |
| `/editor` | Editor component contracts, Tiptap extensions, and commands |
| `/editor/extensions` | The Tiptap extensions alone |
| `tokens.css`, `theme-*.css` | Design tokens and themes |

Looma is pre-1.0: APIs may still change between minor versions. See the
[support matrix](docs/release-support-matrix.md) for what each component
currently promises. React support is in development.

## Principles

- Accessibility first and mobile first.
- Progressive enhancement with SSR-first markup.
- HTML and CSS first, JavaScript as enhancement.
- Composition over configuration.
- No global magical state.
- No external margins in components.

## Documentation

- [Getting started](apps/docs/docs/getting-started.md)
- [Release 1 support](apps/docs/docs/release-1-support.md)
- [Architecture](docs/architecture.md)
- [Adapters](docs/adapters.md)
- [Known follow-ups](docs/follow-ups.md)

## License

MIT. See [LICENSE](./LICENSE).
