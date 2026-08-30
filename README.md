# Looma Monorepo

Looma is a stack-agnostic UI library based on web standards and Open UI principles.

> **Candidate availability:** Before installing, confirm that npm's `candidate`
> dist-tag resolves the complete synchronized `0.1.0` package graph. A source or
> documentation preview can exist before that registry gate passes.

## Install the Candidate

```sh
npm install vue@^3.5 @threadlabs/looma-vue @threadlabs/looma-core @threadlabs/looma-editor @threadlabs/looma-layout @threadlabs/looma-tokens
```

For direct custom-element use without Vue or the editor:

```sh
npm install @threadlabs/looma-core @threadlabs/looma-layout @threadlabs/looma-tokens
```

Import tokens, one theme, component styles, and the element entry points once in
the browser entry. See the [install-first guide](apps/docs/docs/getting-started.md)
for the exact imports and a Vue example.

## Release 1

Looma Release 1 is a public npm **Candidate `0.1.0`**, not a claim that every
component or framework adapter is Stable. The intended public package graph is:

- `@threadlabs/looma-tokens`: CSS tokens and themes.
- `@threadlabs/looma-layout`: light-DOM layout primitives with no external margins.
- `@threadlabs/looma-core`: shadow-DOM web components that enhance consumer-authored semantic light DOM.
- `@threadlabs/looma-editor`: light-DOM editor elements and Tiptap extension helpers.
- `@threadlabs/looma-vue`: the supported Release 1 framework adapter.

`@threadlabs/looma-react` and `@threadlabs/looma-svelte` remain repository previews and are not part
of the Release 1 public package set. Apps and documentation workspaces are private.

The owner-approved public namespace is `@threadlabs/looma-*`. Registry mutation
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
