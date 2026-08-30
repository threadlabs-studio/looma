# Release 1 Support and Limitations

Release 1 is a synchronized public npm **Candidate `0.1.0`** for the smallest Looma graph required by Knit. Candidate means the surface is usable and qualified but can still change before Stable; it is not semver `1.0.0`.

:::caution Candidate availability

Candidate availability is defined by the npm `candidate` dist-tag resolving this complete `0.1.0` package graph. A preview build describes the reviewed contract without asserting registry availability; the production build is deployed only from the same source commit after public Candidate verification.

:::

## Public package set

| Package | Candidate contract |
| --- | --- |
| `@threadlabs/looma-tokens` | CSS tokens plus light, dark, and high-contrast themes |
| `@threadlabs/looma-layout` | ESM and CommonJS; six light-DOM layout elements |
| `@threadlabs/looma-core` | ESM and CommonJS; 26 shadow-root elements with semantic slotted fallback |
| `@threadlabs/looma-editor` | ESM; six light-DOM editor elements, CSS, Tiptap 2 presets, and table helpers |
| `@threadlabs/looma-vue` | ESM; Vue 3 wrappers for every published layout, core, and editor element |

`@threadlabs/looma-react` and `@threadlabs/looma-svelte` are deferred repository previews. Docs, Storybook, examples, and tooling are private workspaces.

## Qualified behavior

- All 38 source elements must appear in generated API metadata, docs navigation, and the Vue projection where applicable.
- Public entry points import without DOM globals during server rendering.
- Chromium tests cover representative keyboard, touch/click, focus-return, disabled-state, and automated accessibility behavior.
- Real Tiptap tests prove adding rows and columns preserves existing table cells and surrounding content.
- Packed-artifact checks inspect exports, files, dependency direction, hashes, and a clean external consumer graph.
- Knit must repeat its build, tests, and SSR import proof against the approved packed artifacts before publication.

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
