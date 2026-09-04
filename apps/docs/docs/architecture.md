# Architecture

Looma is an SSR-first component system. Consumer-authored semantic HTML is the fallback contract; browser JavaScript progressively enhances it.

It is the UI library used by [Knit](https://knit.wiki), but its public APIs remain domain-neutral.

## Release 1 public package

`@threadlabs/looma` is the complete public Candidate artifact. Its explicit
subpaths keep core, layout, editor, Vue, and CSS boundaries discoverable without
exposing the private workspace graph. Docs, Storybook, examples, tooling, and
deferred adapters remain internal workspaces.

## Responsibilities

- `@threadlabs/looma/*.css`: CSS semantic tokens, themes, and component styles.
- `@threadlabs/looma/layout`: six light-DOM spacing and layout elements with no external margins.
- `@threadlabs/looma`: 26 shadow-root elements that preserve authored semantic light DOM through slots.
- `@threadlabs/looma/editor`: the complete Tiptap-backed editor API.
- `@threadlabs/looma/editor/ui`: low-level editor web-component chrome without the Tiptap integration.
- `@threadlabs/looma/editor/extensions`: focused Tiptap 2 presets and table helpers.
- `@threadlabs/looma/vue`: the supported Vue 3 translation over layout and core contracts, without the editor graph.
- `@threadlabs/looma/vue/editor`: the supported turnkey Vue 3 editor integration, including the Tiptap lifecycle, commands, table editing, and themed controls.

## SSR and upgrade contract

- Public entry points must evaluate without `window`, `document`, or custom-element globals.
- Authored semantic content remains meaningful before upgrade and if JavaScript fails.
- Core styling and interaction appear inside shadow roots after upgrade; authored content remains slotted light DOM.
- Layout and editor elements use light DOM.
- Adapters forward attributes, properties, events, and slots without introducing another behavior model.

See [Release 1 support and limitations](./release-1-support.md) for the exact published surface and evidence boundary.
