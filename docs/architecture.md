# Architecture

Looma uses semantic, server-renderable HTML as its source of truth and upgrades
that HTML with package-specific behavior. Release 1 publishes one facade package
whose explicit subpaths preserve those runtime boundaries.

## Release 1 Public Package

`@threadlabs/looma` is the only public artifact. Consumers select core, layout,
editor, editor-extension, Vue, loader, and CSS behavior through explicit
`@threadlabs/looma/*` subpaths.

The repository also contains React and Svelte adapters, docs, and Storybook
workspaces. All implementation workspaces and deferred adapters are internal for
Release 1 and are not public Candidate packages.

## Package Responsibilities

- `@threadlabs/looma/*.css`: CSS-only primitive and semantic variables, themes, and component styles.
- `@threadlabs/looma/layout`: ESM and CommonJS light-DOM custom elements that own spacing through `gap`
  and never add external margins.
- `@threadlabs/looma` and `@threadlabs/looma/core`: web components whose behavior and styles live in shadow roots.
  Their slots preserve consumer-authored semantic light DOM.
- `@threadlabs/looma/editor`: ESM light-DOM custom elements and editor styles; `@threadlabs/looma/editor/extensions` provides optional domain-neutral
  Tiptap helpers. Save, upload, collaboration, and presence remain app concerns.
- `@threadlabs/looma/vue`: ESM wrappers that map Vue props, slots, and events to the public
  layout, core, and editor elements.

## DOM And Progressive-Enhancement Contract

Looma does not have one universal DOM model:

- Layout and editor elements render in light DOM.
- Core Stencil components use shadow DOM for their runtime UI and styles.
- Core components slot consumer-authored semantic controls or content. For
  example, `ui-button` enhances a real slotted `<button>` rather than replacing
  the server-rendered control with shadow markup.
- Before custom-element JavaScript loads, only the consumer-authored light DOM
  is available. Documentation and tests must therefore describe the exact
  semantic fallback per component; Looma never promises that shadow behavior or
  styling exists without JavaScript.
- Importing public JavaScript entry points in an SSR process must not require
  `window`, `document`, or `HTMLElement` at module evaluation time.

## Module Formats

Release documentation follows built artifacts, not a blanket format claim:

- Tokens are CSS-only.
- Editor and Vue expose ESM entry points.
- Layout and core expose real ESM and CommonJS build targets. Layout retains
  CommonJS because the production documentation server bundle consumes it.
- An export map must never advertise a format the build does not create.

## Token Flow

- `@threadlabs/looma/tokens.css` defines primitive and semantic CSS variables in `@layer tokens`.
- Theme files override semantics in `@layer theme`.
- The facade layout, core, and editor entries consume semantic tokens.
- Apps may add their own utility layer and override documented tokens.

## Contract Ownership

Core and editor packages define canonical attributes, properties, events, slots,
SSR/no-JS behavior, and accessibility expectations. The supported Vue adapter
translates framework conventions without introducing behavior divergence. The
[support matrix](./release-support-matrix.md) defines which surfaces receive
Candidate proof in Release 1.
