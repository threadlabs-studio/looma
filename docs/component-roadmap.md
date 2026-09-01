# Component Roadmap

Last updated: 2026-08-30

This is the editable plan for Looma components across current shipping scope and near-term promotions from Knit.

**Component system and when to add components:** See [Component System and When to Add Components](./component-system.md) for hierarchy, design rules (no external margins, tokens, dark mode, API conventions), and when to build in Looma vs in a consuming app (e.g. Knit).

## Release 1 Classification

The [Release 1 support matrix](./release-support-matrix.md) is the authority for
Candidate publication. The 6 layout, 26 core, and 6 editor source elements listed
there are published Candidate surface. Missing roadmap families remain deferred
and do not block R1. React and Svelte are repository previews; Vue is the only
supported framework adapter in R1.

## Current Shipped Components

This readable list is expected to match source-derived API metadata. Source tags
remain authoritative when generated metadata is incomplete; R1's completeness
gate must reject any mismatch instead of silently omitting a component.

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
- `ui-icon-button`
- `ui-grid`
- `ui-inline`
- `ui-input`
- `ui-context-menu`
- `ui-menu`
- `ui-menu-item`
- `ui-popover`
- `ui-radio`
- `ui-radio-group`
- `ui-search-result-row`
- `ui-search-shell`
- `ui-select`
- `ui-separator`
- `ui-stack`
- `ui-switch`
- `ui-tabs`
- `ui-top-bar`
- `ui-toast-region`
- `ui-tooltip`
- `ui-textarea`

## Master Component Checklist

This is the single checklist for the component families Looma is expected to own based on the current shipped surface plus the broader audit in [Component Library Audit](./component-library-audit.md).

Conventions for this checklist:

- `[x]` = shipped in Looma today
- `[~]` = partly covered today, but not yet a complete first-class family
- `[ ]` = identified from the audit and still missing / not yet promoted
- Some entries are explicit subfamilies because the audit showed they recur often enough to deserve tracking separately

### Layout

- [x] Stack
- [x] Inline
- [x] Cluster
- [x] Grid
- [x] Center
- [x] Separator

### Forms and actions

- [x] Button
- [x] IconButton
- [x] Input
- [x] FormField
- [x] Checkbox
- [x] Radio
- [x] RadioGroup
- [x] Switch
- [x] Textarea
- [x] Select
- [ ] Listbox
- [ ] Combobox

### Overlay, navigation, and display

- [x] Dialog
- [ ] AlertDialog
- [ ] Drawer / Sheet
- [x] Popover
- [ ] HoverCard
- [x] Tooltip
- [x] Menu
- [x] MenuItem
- [x] ContextMenu
- [ ] DropdownMenu trigger/content recipe
- [x] Tabs
- [x] Disclosure
- [ ] Accordion group API
- [x] ToastRegion
- [~] Badge / Tag / Chip family
  `ui-badge` is shipped today. Interactive or removable chip/tag variants are not yet first-class Looma components.
- [x] Avatar
- [x] AvatarGroup
- [x] TopBar
- [x] FloatingActionButton

### Search and app-shell recipes

- [x] SearchShell
- [x] SearchResultRow
- [ ] CommandPalette recipe

### Editor UI

- [x] EditorToolbar
- [x] EditorSlashMenu
- [x] EditorTableContextMenu
- [x] EditorTableToolbar
- [x] EditorInsertTableGrid
- [x] EditorTableOverlay
- [ ] EditorBlockHandle
- [ ] EditorBlockMenu / block side menu
- [ ] EditorFloatingToolbar
- [ ] EditorLinkEditor / link popover
- [ ] EditorMentionList
- [ ] EditorEmojiPicker

## Adapter Coverage

- Vue wrappers: R1 Candidate surface; completeness is a release gate.
- React wrappers: internal/deferred preview for R1.
- Svelte bindings: internal/deferred preview for R1.

Wrapper naming policy:

- Use `Stack`, `Dialog`, `RadioGroup`, etc.
- Do not prefix wrapper names with `Ui` (`UiStack`, `UiDialog`, etc. are disallowed).
- Keep shared names domain-neutral (`Avatar`, `AvatarGroup`) and avoid app semantics like `Presence*`.

## Editor (Tiptap) — `@threadlabs/looma/editor`

We are building Confluence/Notion-like editor UI in Looma using **open-source Tiptap only** (no paid templates or Cloud). The private `packages/editor` workspace is projected through `@threadlabs/looma/editor`. All editor UI is **web components** (custom elements); `/vue/editor` wires the R1 supported Vue integration while `/vue` remains editor-free, and the React adapter remains an internal preview. Scope: slash menu, tables with hover “+” and context menu, list behavior, block menu, formatting toolbar, optional emoji/mentions. Domain-neutral; apps wire save, upload, presence. Current shipped editor slice includes the toolbar shell, slash menu, table context menu, table toolbar, insert-table grid, and table overlay components plus adapter event wiring. See **[Editor Roadmap](./editor-roadmap.md)** for full scope, phases, and Looma vs app split.

## Planned Promotions From Knit (Candidate Queue)

These are candidates to promote into Looma after generic API extraction:

1. ~~`AvatarGroup` / `AvatarStack`~~ — **shipped** as `ui-avatar-group` (slot-based, domain-neutral).
2. ~~`FloatingActionButton`~~ — **shipped** as `ui-floating-action-button`
3. ~~Command/Search shell (from `SearchOverlay`)~~ — **shipped** as `ui-search-shell`
4. ~~Generic search result row~~ — **shipped** as `ui-search-result-row`
5. ~~Slot-based app top bar shell~~ — **shipped** as `ui-top-bar`

## Benchmark-Driven Gaps And Next Promotions

Source: [Component Library Audit](./component-library-audit.md), based on official docs review across React, Vue, web-component, and editor ecosystems.

### P0

- Fix source-of-truth mismatches before planning further promotions:
  - keep generated API metadata, adapter docs, and docs discoverability aligned as new primitives ship
- Add missing high-frequency form primitives:
  - `Listbox`
  - `Combobox` after select/listbox baseline is stable
- Deepen existing high-frequency primitives:
  - `Button`: loading and icon-placement guidance
  - `Input`: clearable, size, and adornment strategy
  - `Menu`: submenu/checkable-item roadmap
  - `ToastRegion`: severity and action guidance

### P1

- Lock overlay positioning vocabulary before more overlay APIs grow:
  - decide when Looma uses `placement`
  - decide whether future overlay APIs also expose `side` + `align`
- Document field strategy more explicitly:
  - `ui-input` is the control primitive
  - `ui-form-field` is the composed label/help/error wrapper
- Add slot guidance for icon/adornment-heavy components:
  - `prefix` / `suffix` for input-like controls
  - `leading` / `trailing` for rows and shell recipes

### P2

- Decide whether grouped accordion behavior should become first-class beyond `ui-disclosure`
- Decide whether interactive chip/tag behavior should stay separate from `ui-badge`
- Revisit multi-action floating action button behavior if a real app needs speed-dial semantics
- Keep `ui-top-bar`, `ui-search-shell`, and `ui-search-result-row` as recipe-level primitives rather than forcing them into lower-level generic atoms

## Knit Replacement Wave Status

- Completed:
  - Toast mount moved from `vue-sonner` to Looma `ToastRegion`
  - `BaseDialog` moved to Looma `Dialog` wrapper base
  - Toolbar/editor action button base moved to Looma `Button` (`ToolbarBtn`)
  - Tree/context menus in `CollectionGroup`, `FolderTreeNode`, and `PageTreeItem` moved to Looma `Menu` + `MenuItem`
  - Knit editor now uses `@threadlabs/looma/editor` toolbar shell plus Phase 1 slash/table primitives and extension preset in the page editor flow
  - Floating action button pattern promoted into Looma and consumed by Knit via the shared primitive
  - Mobile app top bar shell promoted into Looma and consumed by Knit via the shared primitive
  - Search overlay shell promoted into Looma and consumed by Knit while query/result behavior stays app-local
  - Search result row promoted into Looma and consumed by Knit while result shaping and highlighting stay app-local
- In progress:
  - Primitive normalization (`Button`/`Input`/`FormField`) in high-use flows such as sidebar dialogs and settings
  - `IconButton` adoption in high-use shell controls while preserving Knit’s exact spacing and behavior
  - `Select` adoption in settings and sidebar dialogs while keeping domain behavior app-local

## Future: Docs Site in Looma

At some point, rebuild the Docusaurus docs UI (navbar, sidebar, footer, etc.) using Looma components. This would dogfood the library and demonstrate real-world usage.

## How To Adjust This Plan

- Add, reorder, or remove items in the candidate queue.
- Mark replacement wave items as completed/in-progress/blocked.
- Keep this file aligned with:
  - `PROJECT_STATE.md` (`Current Focus`, `Next Up`)
  - `knit/docs/looma-migration-inventory.md`
