---
order: 2
---

# Release 1 Support and Limitations

Looma publishes to npm as **`@threadlabs/looma`**, and this page is the supported surface of
the published release. It is pre-1.0: the surface is usable and qualified, but it can still change
between minor versions.

## Public entries

- **`@threadlabs/looma`** — ESM; registers every component with the HTML Next runtime for HTML pages.
- **`@threadlabs/looma/components/*`** — each component's definition and controller, for pages without a build.
- **`@threadlabs/looma/editor`** — ESM; the editor components' contracts and the Tiptap-backed editor surface.
- **`@threadlabs/looma/editor/extensions`** — ESM; focused Tiptap 2 presets, `LoomaTableKit`, slash commands, mentions, and table helpers.
- **`@threadlabs/looma/*.css`** — Tokens and themes.


Framework applications use the HTML Next Vite plugin with `target: "vue"`, `"react"`, or `"svelte"`. It generates prefixed imports such as `UiButton` and `UiEditor` from the package root. React alpha.70 declaration generation still requires upstream correction before release qualification.

## Qualified behavior

- All public declarative contracts must appear in generated API metadata, docs navigation, and source-generated framework projections where applicable.
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
