# Looma Monorepo

Looma is a stack-agnostic UI library based on web standards and Open UI principles.

> **Candidate availability:** Before installing, confirm that npm's `candidate`
> dist-tag resolves `@threadlabs/looma@0.1.6`. A source or
> documentation preview can exist before that registry gate passes.

## Install the Candidate

```sh
pnpm add @threadlabs/looma@candidate
```

The root package and core, layout, and CSS subpaths require no framework or
editor import. `@threadlabs/looma/vue` adds only Vue 3.5 or newer. Looma's editor
is a Tiptap editor: its concrete extension preset ships inside the editor
subpath, while an
editor consumer supplies a compatible Tiptap 2 core. `@threadlabs/looma/vue/editor`
exports the turnkey `LoomaEditor` component and uses `@tiptap/vue-3@^2.11.5`
for Tiptap's official lifecycle APIs. The advanced
`@threadlabs/looma/editor/ui` subpath exposes only raw web-component chrome.

```ts
import { openOverlay } from "@threadlabs/looma";
import "@threadlabs/looma/tokens.css";
import "@threadlabs/looma/theme-light.css";
```

Import tokens, one theme, component styles, and the element entry points once in
the browser entry. See the [install-first guide](apps/docs/docs/getting-started.md)
for the exact imports and a Vue example.

## Release 1

Looma Release 1 is a public npm **Candidate `0.1.6`**, not a claim that every
component or framework adapter is Stable. The sole public package is
`@threadlabs/looma`, with explicit subpaths:

- `@threadlabs/looma` and `@threadlabs/looma/core`: core web components and overlay APIs.
- `@threadlabs/looma/layout`: light-DOM layout primitives with no external margins.
- `@threadlabs/looma/editor`: the complete Tiptap-backed editor surface, including elements, extension presets, and commands.
- `@threadlabs/looma/editor/ui`: low-level editor web-component chrome without the Tiptap integration.
- `@threadlabs/looma/editor/extensions`: the focused extension preset, standalone `LoomaTableKit`, and command-helper subpath.
- `@threadlabs/looma/vue`: general Vue adapters without the editor graph.
- `@threadlabs/looma/vue/editor`: the turnkey `LoomaEditor` plus advanced low-level Vue wrappers.
- Explicit `.css` subpaths provide tokens, themes, layout, core, and editor styles.

React and Svelte adapters remain internal repository previews and are not part
of the Release 1 public package. Apps and documentation workspaces are private.

The owner-approved public identity is `@threadlabs/looma`. Registry mutation
still requires the protected release authorization and evidence gates. See the
[Release 1 support matrix](docs/release-support-matrix.md) and
[release checklist](docs/release-checklist.md) for the exact promise and gate status.

## Core Rules

- Accessibility first and mobile first.
- Progressive enhancement with SSR-first markup contracts.
- HTML and CSS first, JS as enhancement.
- Composition over configuration.
- No global magical state.
- No external margins in components.

## Documentation

- `apps/docs/docs/getting-started.md`: install and first supported Vue render.
- `apps/docs/docs/release-1-support.md`: public Candidate support boundary.
- `docs/release-support-matrix.md`: public package, component, DOM, and proof boundary.
- `docs/architecture.md`: package and runtime architecture.
- `docs/adapters.md`: supported adapter contract and repository-preview status.
- `docs/component-qualification-guide.md`: Candidate and Stable evidence rules.
- `docs/public-release.md`: original public-repository and namespace-decision notes.

Source: [threadlabs-studio/looma](https://github.com/threadlabs-studio/looma) ·
[Issues](https://github.com/threadlabs-studio/looma/issues).

## License

MIT. See [LICENSE](./LICENSE).
