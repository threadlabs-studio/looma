# Architecture

Looma uses semantic, server-renderable HTML as its source of truth and upgrades
that HTML with package-specific behavior. Release 1 publishes one facade package
whose explicit subpaths preserve those runtime boundaries.

## Release 1 Public Package

`@threadlabs/looma` is the only public artifact. Consumers select core, layout,
editor, low-level editor UI, editor-extension, native loader, and CSS behavior through explicit
`@threadlabs/looma/*` subpaths.

The repository also contains React and Svelte adapters, docs, and Storybook
workspaces. All implementation workspaces and deferred adapters are internal for
Release 1 and are not public Candidate packages.

## Package Responsibilities

- `@threadlabs/looma/*.css`: CSS-only primitive and semantic variables, themes, and component styles.
- `@threadlabs/looma/layout`: ESM and CommonJS declarative layout components that own spacing through `gap`
  and never add external margins.
- `@threadlabs/looma` and `@threadlabs/looma/core`: declarative core components whose slots preserve consumer-authored semantic light DOM.
- `@threadlabs/looma/editor`: the complete ESM Tiptap-backed editor surface: declarative UI, the extension preset, and command helpers.
- `@threadlabs/looma/editor/ui`: the low-level Tiptap-independent declarative UI for advanced composition.
- `@threadlabs/looma/editor/extensions`: the focused domain-neutral Tiptap preset and command-helper surface. Save, upload, collaboration, and presence remain app concerns.
- Vue, React and Svelte applications compile those HTML definitions through the HTML Next Vite plugin. All use prefixed imports such as `UiButton` and `UiEditor` from the package root.

## DOM And Progressive-Enhancement Contract

Looma has one framework-neutral component model:

- Each contract declares props and defaults, input channels, slots,
  events, internal state, dependencies, and a native root.
- Direct HTML uses `ui-*` invocation tags as declarative source. Browser imports
  lower each invocation to its native light-DOM root and activate its component module.
- Framework adapters create the same native root directly and attach the same
  definition; they do not route through a custom-element bridge.
- Authored semantic controls and content remain meaningful before JavaScript.
  For example, `ui-button` preserves a real authored `<button>`.
- Importing public JavaScript entry points in an SSR process must not require
  `window`, `document`, `HTMLElement`, or a custom-element registry at module
  evaluation time.

A component template selects its behavior with `module="./ui-button.js"`. That
module exports a named `connect(host)` function, called once for each connection.
It returns cleanup for listeners and observers; reconnecting calls it again with
retained component state. A module import does not perform DOM setup. Component
modules communicate through native events and commands rather than generated
methods on component elements. There is no default activation callback or
`controller` attribute in the authored component contract.

Component styles read resolved props with `:host([prop])` and mutable or computed
state with `:host(:state(name))`.

## Module Formats

Release documentation follows built artifacts, not a blanket format claim:

- Tokens are CSS-only.
- Editor helpers and native runtime support expose ESM entry points; framework components compile from the HTML definitions in the consumer.
- Layout and core expose real ESM and CommonJS build targets. Layout retains
  CommonJS because the production documentation server bundle consumes it.
- An export map must never advertise a format the build does not create.

## Token Flow

- `@threadlabs/looma/tokens.css` defines primitive and semantic CSS variables in `@layer tokens`.
- Theme files override semantics in `@layer theme`. Optional `theme-system.css` derives shared scale/material roles from semantic levers without changing the default token contract.
- The facade layout, core, and editor entries consume semantic tokens.
- Apps may add their own utility layer and override documented tokens.

## Contract Ownership

The declarative contracts define canonical native roots, attributes, properties,
events, slots, SSR/no-JS behavior, and accessibility expectations. Consumer-side Vue, React
and Svelte compilation translates framework conventions without introducing behavior divergence. The
[support matrix](./release-support-matrix.md) defines which surfaces receive
Candidate proof in Release 1.
