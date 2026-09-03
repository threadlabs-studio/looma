# Release 1 Support and Limitations

Release 1 is a public npm **Candidate `0.1.4`** for applications that want Looma's
web components, editor, or supported Vue integration. Candidate means the surface is
usable and qualified but can still change before Stable; it is not semver `1.0.0`.
Knit is the first deep integration and release-qualification harness, not the audience or
the boundary of the public API.

:::caution Candidate availability

Candidate availability is defined by the npm `candidate` dist-tag resolving `@threadlabs/looma@0.1.4`. A preview build describes the reviewed contract without asserting registry availability; the production build is deployed only from the same source commit after public Candidate verification.

:::

## Public entries

- **`@threadlabs/looma` and `/core`** — ESM and CommonJS; 26 shadow-root elements with semantic slotted fallback.
- **`@threadlabs/looma/layout`** — ESM and CommonJS; six light-DOM layout elements.
- **`@threadlabs/looma/editor`** — ESM; the complete Tiptap-backed editor surface.
- **`@threadlabs/looma/editor/ui`** — ESM; low-level editor web-component chrome without Tiptap integration.
- **`@threadlabs/looma/editor/extensions`** — ESM; focused Tiptap 2 presets and table helpers.
- **`@threadlabs/looma/vue`** — ESM; optional Vue 3 wrappers for published layout and core elements, without the editor graph.
- **`@threadlabs/looma/vue/editor`** — ESM; the supported Tiptap-backed Vue editor helpers and wrappers.
- **`@threadlabs/looma/*.css`** — Tokens, themes, layout, core, and editor styles.

React and Svelte adapters are deferred internal repository previews. Docs, Storybook, examples, and tooling are private workspaces.

## Qualified behavior

- All 38 source elements must appear in generated API metadata, docs navigation, and the Vue projection where applicable.
- Public entry points import without DOM globals during server rendering.
- Chromium tests cover representative keyboard, touch/click, focus-return, disabled-state, and automated accessibility behavior.
- Real Tiptap tests prove adding rows and columns preserves existing table cells and surrounding content.
- Packed-artifact checks inspect exports, files, dependency direction, hashes, and a clean external consumer graph.
- The packed artifacts must pass an independent consumer matrix. Knit then repeats its
  build, tests, and SSR import proof as Looma's deepest release-qualification harness.

## Accepted Candidate limitation

Editor table controls provide visible keyboard/touch actions and preserve content, but they do not yet have Confluence-level boundary polish or discoverability. That visual limitation is accepted for Candidate under `E-TBL-003`. Data loss, corruption, or an essential action available only through hover or long-press remains release-blocking.

Automated accessibility checks do not replace manual screen-reader, forced-color, zoom/reflow, and platform touch checks.

## Deferred surface

AlertDialog, Listbox, Combobox, Drawer/Sheet, HoverCard, CommandPalette, Accordion groups, interactive Chip/Tag behavior, block menus, floating editor toolbars, link editing, mentions, and emoji picking are roadmap work. Looma also does not own saves, uploads, collaboration, presence, workspaces, pages, or app-specific commands.

## Source and issue reporting

- [Source repository](https://github.com/threadlabs-studio/looma)
- [Issue tracker](https://github.com/threadlabs-studio/looma/issues)
- [Release checklist](https://github.com/threadlabs-studio/looma/blob/main/docs/release-checklist.md)

[MIT license](https://github.com/threadlabs-studio/looma/blob/main/LICENSE)
