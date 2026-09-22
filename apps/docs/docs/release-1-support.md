# Release 1 Support and Limitations

Release 1 is a public npm **Candidate `0.5.1`** for applications that want Looma's
declarative components, editor, or supported Vue integration. Candidate means the surface is
usable and qualified but can still change before Stable; it is not semver `1.0.0`.

## Public entries

- **`@threadlabs/looma`** — ESM; registers every component with the HTML Next runtime for HTML pages.
- **`@threadlabs/looma/components/*`** — each component's definition and controller, for pages without a build.
- **`@threadlabs/looma/vue`** — ESM with declarations; every component as a Vue 3.5 component, with no HTML Next runtime. `vue.css` holds their scoped styles.
- **`@threadlabs/looma/vue/editor`** — ESM; the turnkey `LoomaEditor` and the editor components.
- **`@threadlabs/looma/editor`** — ESM; the editor components' contracts and the Tiptap-backed editor surface.
- **`@threadlabs/looma/editor/extensions`** — ESM; focused Tiptap 2 presets, `LoomaTableKit`, slash commands, mentions, and table helpers.
- **`@threadlabs/looma/*.css`** — Tokens and themes.

React support is in development and not published. Docs, Storybook, examples, and tooling are private workspaces.

## Qualified behavior

- All 48 declarative contracts must appear in generated API metadata, docs navigation, and the Vue projection where applicable.
- Public entry points import without DOM globals during server rendering.
- Chromium tests cover representative keyboard, touch/click, focus-return, disabled-state, and automated accessibility behavior.
- Real Tiptap tests prove adding rows and columns preserves existing table cells and surrounding content; Vue browser tests prove the turnkey editor and theme-token control path.
- Packed-artifact checks inspect exports, files, dependency direction, hashes, and a clean external consumer graph.
- The packed artifacts must pass an independent consumer matrix before publication.

## Table editing boundary

Editor table controls provide visible keyboard/touch actions, outside-edge row
insertion, column drag resizing, cell backgrounds, merge/split, and content
preservation. Data loss, corruption, or an essential action available only
through hover or long-press remains release-blocking.

Automated accessibility checks do not replace manual screen-reader, forced-color, zoom/reflow, and platform touch checks.

## Deferred surface

AlertDialog, Listbox, Drawer/Sheet, HoverCard, CommandPalette,
Accordion groups, interactive Chip/Tag behavior, link editing, and emoji picking
are roadmap work. Looma owns editor UI and behavior, including bounded mention
suggestions; hosts own authorized directory queries, saves, upload transport,
collaboration, presence, workspaces, pages, and app-specific commands.

## Source and issue reporting

- [Source repository](https://github.com/threadlabs-studio/looma)
- [Issue tracker](https://github.com/threadlabs-studio/looma/issues)

[MIT license](https://github.com/threadlabs-studio/looma/blob/main/LICENSE)
