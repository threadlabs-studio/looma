# Component Roadmap

Last updated: 2026-03-28

This is the editable plan for Looma components across current shipping scope and near-term promotions from Knit.

**Component system and when to add components:** See [Component System and When to Add Components](./component-system.md) for hierarchy, design rules (no external margins, tokens, dark mode, API conventions), and when to build in Looma vs in a consuming app (e.g. Knit).

## Current Shipped Components

Source of truth: `generated/component-api.json`

- `ui-avatar`
- `ui-avatar-group`
- `ui-badge`
- `ui-button`
- `ui-center`
- `ui-checkbox`
- `ui-cluster`
- `ui-dialog`
- `ui-disclosure`
- `ui-floating-action-button`
- `ui-form-field`
- `ui-grid`
- `ui-inline`
- `ui-input`
- `ui-menu`
- `ui-menu-item`
- `ui-popover`
- `ui-radio`
- `ui-radio-group`
- `ui-search-shell`
- `ui-separator`
- `ui-stack`
- `ui-switch`
- `ui-tabs`
- `ui-top-bar`
- `ui-toast-region`
- `ui-tooltip`

## Adapter Coverage

- React wrappers: full parity for current shipped core tags.
- Vue wrappers: full parity for current shipped core tags.
- Svelte: element-first by design (`bindAdapter` with native custom elements).

Wrapper naming policy:

- Use `Stack`, `Dialog`, `RadioGroup`, etc.
- Do not prefix wrapper names with `Ui` (`UiStack`, `UiDialog`, etc. are disallowed).
- Keep shared names domain-neutral (`Avatar`, `AvatarGroup`) and avoid app semantics like `Presence*`.

## Editor (Tiptap) — @looma/editor

We are building Confluence/Notion-like editor UI in Looma using **open-source Tiptap only** (no paid templates or Cloud). Package: `packages/editor` (`@looma/editor`). All editor UI is **web components** (custom elements); **Vue and React adapters** in `@looma/vue` / `@looma/react` wire the Tiptap editor to them. Scope: slash menu, tables with hover “+” and context menu, list behavior, block menu, formatting toolbar, optional emoji/mentions. Domain-neutral; apps wire save, upload, presence. Current shipped editor slice includes the toolbar shell, slash menu, table context menu, insert-table grid, and table overlay components plus adapter event wiring. See **[Editor Roadmap](./editor-roadmap.md)** for full scope, phases, and Looma vs app split.

## Planned Promotions From Knit (Candidate Queue)

These are candidates to promote into Looma after generic API extraction:

1. ~~`AvatarGroup` / `AvatarStack`~~ — **shipped** as `ui-avatar-group` (slot-based, domain-neutral).
2. ~~`FloatingActionButton`~~ — **shipped** as `ui-floating-action-button`
3. ~~Command/Search shell (from `SearchOverlay`)~~ — **shipped** as `ui-search-shell`
4. Generic search result row
5. ~~Slot-based app top bar shell~~ — **shipped** as `ui-top-bar`

## Knit Replacement Wave Status

- Completed:
  - Toast mount moved from `vue-sonner` to Looma `ToastRegion`
  - `BaseDialog` moved to Looma `Dialog` wrapper base
  - Toolbar/editor action button base moved to Looma `Button` (`ToolbarBtn`)
  - Tree/context menus in `CollectionGroup`, `FolderTreeNode`, and `PageTreeItem` moved to Looma `Menu` + `MenuItem`
  - Knit editor now uses `@looma/editor` toolbar shell plus Phase 1 slash/table primitives and extension preset in the page editor flow
  - Floating action button pattern promoted into Looma and consumed by Knit via the shared primitive
  - Mobile app top bar shell promoted into Looma and consumed by Knit via the shared primitive
  - Search overlay shell promoted into Looma and consumed by Knit while query/result behavior stays app-local
- In progress:
  - Primitive normalization (`Button`/`Input`/`FormField`) in high-use flows such as sidebar dialogs and settings
- Not started:
  - Promotion work for generic search result row

## Future: Docs Site in Looma

At some point, rebuild the Docusaurus docs UI (navbar, sidebar, footer, etc.) using Looma components. This would dogfood the library and demonstrate real-world usage.

## How To Adjust This Plan

- Add, reorder, or remove items in the candidate queue.
- Mark replacement wave items as completed/in-progress/blocked.
- Keep this file aligned with:
  - `PROJECT_STATE.md` (`Current Focus`, `Next Up`)
  - `knit/docs/looma-migration-inventory.md`
