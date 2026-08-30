# Architecture

Looma is an SSR-first component system. Consumer-authored semantic HTML is the fallback contract; browser JavaScript progressively enhances it.

It is the UI library used by [Knit](https://knit.wiki), but its public APIs remain domain-neutral.

## Release 1 package graph

```text
@threadlabs/looma-tokens
├── @threadlabs/looma-layout
│   └── @threadlabs/looma-core
│       └── @threadlabs/looma-editor
└───────────┘

@threadlabs/looma-vue → layout + core + editor
```

The five packages above are the complete public Candidate graph. Docs, Storybook, examples, tooling, `@threadlabs/looma-react`, and `@threadlabs/looma-svelte` are private or deferred workspaces.

## Responsibilities

- `@threadlabs/looma-tokens`: CSS semantic tokens plus light, dark, and high-contrast themes.
- `@threadlabs/looma-layout`: six light-DOM spacing and layout elements with no external margins.
- `@threadlabs/looma-core`: 26 shadow-root elements that preserve authored semantic light DOM through slots.
- `@threadlabs/looma-editor`: six guarded light-DOM editor elements, editor styles, Tiptap 2 presets, and table helpers.
- `@threadlabs/looma-vue`: the supported Vue 3 translation over layout, core, and editor contracts.

## SSR and upgrade contract

- Public entry points must evaluate without `window`, `document`, or custom-element globals.
- Authored semantic content remains meaningful before upgrade and if JavaScript fails.
- Core styling and interaction appear inside shadow roots after upgrade; authored content remains slotted light DOM.
- Layout and editor elements use light DOM.
- Adapters forward attributes, properties, events, and slots without introducing another behavior model.

See [Release 1 support and limitations](./release-1-support.md) for the exact published surface and evidence boundary.
