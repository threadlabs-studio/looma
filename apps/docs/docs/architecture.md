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
- `@threadlabs/looma/layout`: eight declarative spacing and layout components with no external margins.
- `@threadlabs/looma`: 31 published declarative core components that preserve authored semantic light DOM through slots.
- `@threadlabs/looma/editor`: the complete Tiptap-backed editor API.
- `@threadlabs/looma/editor/ui`: seven low-level declarative editor surfaces without the Tiptap integration.
- `@threadlabs/looma/editor/extensions`: focused Tiptap 2 presets and table helpers.
- `@threadlabs/looma/vue`: the supported Vue 3 translation over layout and core contracts, without the editor graph.
- `@threadlabs/looma/vue/editor`: the supported turnkey Vue 3 editor integration, including the Tiptap lifecycle, commands, table editing, and themed controls.

## SSR and upgrade contract

- Public entry points must evaluate without browser globals.
- Authored semantic content remains meaningful before lowering and if JavaScript fails.
- Each framework-neutral contract declares props and defaults, property-only structured inputs,
  methods, slots, events, internal state, dependencies, and a native root.
- Browser imports lower direct `ui-*` invocations to native light-DOM roots and attach the matching
  controller. They do not register custom elements or create shadow roots.
- Framework adapters create those native roots directly and attach the same contract instead of
  introducing another behavior model.

See [Release 1 support and limitations](./release-1-support.md) for the exact published surface and evidence boundary.
