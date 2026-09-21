# Looma editor UI audit (2026-09-21)

> **Evidence, not decisions.** These are the research notes behind the 0.3 option audit. They describe the API *before* 0.3, and some verdicts were overruled or already resolved. The binding decisions are in the [Component option audit](../../apps/docs/docs/component-library-audit.md).

Scope: `ui-editor-toolbar`, `ui-editor-slash-menu`, `ui-editor-mention-menu`, `ui-editor-insert-table-grid`, `ui-editor-table-toolbar`, `ui-editor-table-context-menu`, `ui-editor-table-overlay`.

Baseline: the declared Looma API before 0.3, compared with the pre-0.3 editor implementation (`packages/editor/src/*.ts`). The Vue adapter is in `packages/vue/src/editor/LoomaEditor.ts`. Several gaps below come from the declared API and the implementation disagreeing.

Ecosystems compared (5): **T** Tiptap (core plus UI Components and templates), **B** BlockNote, **P** Plate (plugins plus registry UI), **L** Lexical (playground), **N** Novel. I left out Remirror and Milkdown because they added nothing that changes a verdict. "Common" means at least 3 of the 5 ecosystems have the feature. For tables it means at least 3 of the 4 that ship table UI (Novel ships none).

Constraints I applied: props are attributes, so there are no function-valued options. Booleans default to false. No author-facing `data-*`. I only propose something when it has real value.

---

## Declared-vs-implemented drift (fix first)

These are facts from the source, not recommendations to add features.

| Component | Drift |
|---|---|
| ui-editor-toolbar | The Vue adapter renders `<ui-editor-toolbar floating>` and `editor.css` styles `ui-editor-toolbar[floating]`, but the API declares no attributes. |
| ui-editor-slash-menu | Items (`items`: `{title, description, icon}[]`) and the anchor (`anchorRect`) exist only as JS properties. The declared API has no way to supply either, so the component cannot be used from markup. The select and highlight events carry only `{index}`. |
| ui-editor-mention-menu | Same as the slash menu: `items` (`{id,label,detail?,initials?}`) and `anchorRect` are JS-only. |
| ui-editor-insert-table-grid | `header-row` is declared, but the implementation does not observe it. It hard-codes `#withHeaderRow = true`, so the checkbox is checked by default. `max-rows` and `max-cols` are silently clamped to 10. |
| ui-editor-table-toolbar and ui-editor-table-context-menu | The implementation observes 9 undeclared booleans: `can-add-row-before/after`, `can-add-column-before/after`, `can-delete-row/column/table`, `can-merge-cells`, `can-split-cell`. |
| ui-editor-table-overlay | The geometry (`rowBoundaries`, `columnBoundaries`, `activeCell`, `hoveredCell`) is JS-only. |
| slash-menu and mention-menu | `connectedCallback` sets `aria-label` unconditionally ("Insert block" or "Mention a person"), which overwrites an author's `aria-label`. The visible header, footer and hint strings are hard-coded English. |

---

## 1. ui-editor-toolbar (fixed formatting toolbar)

**Looma today:** a slot-only shell that adds `role="toolbar"` and a default `aria-label`. All buttons and command wiring are app- or adapter-owned. The Vue adapter's toolbar has: bold, italic, underline, strike, highlight, inline code | H1–H3, bullet, numbered and check lists, blockquote, code block, divider | table picker, image | undo and redo. Active state is shown with `variant="solid"` plus `data-active`, and disabled state comes from `editor.can()`.

### Equivalents
- **T:** `Toolbar` (`variant: "fixed" | "floating"`), `ToolbarGroup`, `ToolbarSeparator`, `Spacer`. The Simple Editor fills it with `MarkButton` (bold, italic, strike, code, underline, sup, sub), `HeadingDropdownMenu` (levels 1–4), `ListDropdownMenu`, `BlockquoteButton`, `CodeBlockButton`, `ColorHighlightPopover`, `LinkPopover`, `TextAlignButton` ×4, `ImageUploadButton`, and `UndoRedoButton`. There is also a separate `BubbleMenu` and `FloatingMenu` extension (Floating UI).
- **B:** a floating `FormattingToolbar` only: `BlockTypeSelect`, `TableCellMergeButton`, file buttons, bold, italic, underline and strike, align ×3, `ColorStyleButton`, nest and unnest, `CreateLinkButton`, comment. There is no fixed toolbar and no undo/redo.
- **P:** `FixedToolbar` and `FloatingToolbar` with `ToolbarGroup`s: undo and redo, AI, export and import, `InsertToolbarButton`, `TurnIntoToolbarButton`, font size, marks ×6 (with shortcut tooltips), text and background colour, align, lists ×3, toggle, link, table, emoji, media ×4, line height, indent and outdent, `MoreToolbarButton` (overflow dropdown), highlight, comment, and mode.
- **L:** the playground `ToolbarPlugin`: undo and redo, block-format dropdown (paragraph, H1–H3, lists, check, quote, code), font family and size, bold, italic, underline, code and link (shortcut in `title` and `aria-label`), text and background colour, a "more styles" dropdown (strike, sub, sup, highlight, case, clear formatting), an Insert dropdown, and an alignment and indent dropdown. It also has a separate `FloatingTextFormatToolbarPlugin`.
- **N:** a bubble menu only (`EditorBubble`) with node selector, link selector, text buttons and colour selector.

### Capability table

| Capability | T | B | P | L | N | Count | Common | Looma |
|---|---|---|---|---|---|---|---|---|
| Marks (B/I/U/S) | ✓ | ✓ | ✓ | ✓ | ✓ | 5 | yes | adapter ✓ |
| Inline code mark | ✓ | – (not default) | ✓ | ✓ | ✓ | 4 | yes | adapter ✓ |
| Headings / block-type | ✓ dropdown | ✓ select | ✓ turn-into | ✓ dropdown | ✓ selector | 5 | yes | adapter ✓ (flat H1–H3 buttons) |
| Lists | ✓ | ✓ (via block type) | ✓ | ✓ | ✓ (selector) | 5 | yes | adapter ✓ |
| Link | ✓ | ✓ | ✓ | ✓ | ✓ | 5 | yes | **missing** |
| Alignment | ✓ | ✓ | ✓ | ✓ | – | 4 | yes | missing (no TextAlign extension for paragraphs) |
| Undo/redo | ✓ | – | ✓ | ✓ | – | 3 | yes | adapter ✓ |
| Colour/highlight | ✓ | ✓ | ✓ | ✓ | ✓ | 5 | yes | adapter ✓ (highlight) |
| Active state | ✓ | ✓ | ✓ | ✓ | ✓ | 5 | yes | via `variant` + `data-active` (no `aria-pressed`) |
| Disabled state | ✓ (`canToggle`, or `hideWhenUnavailable`) | hides | ✓ | ✓ (`canUndo`) | uncertain | 4 | yes | ✓ |
| Grouping / separators | ✓ | – | ✓ | ✓ (Divider) | ✓ | 4 | yes | adapter uses a raw `span.ui-editor-toolbar__divider` |
| Overflow ("more" dropdown) | – (mobile swaps views; uncertain) | – | ✓ | ✓ | – | 2 | no | horizontal scroll on mobile |
| Shortcut display | ✓ (`showShortcut` badge) | ✓ (tooltip) | ✓ (tooltip) | ✓ (title) | – | 4 | yes | missing |
| Roving-focus keyboard nav | ✓ (documented) | uncertain | uncertain (Radix Toolbar) | – | – | 1–2 | no, but required by the WAI-ARIA toolbar pattern | **missing** |
| Fixed vs floating variant | ✓ | floating only | ✓ both | ✓ both | floating only | 5 | yes | `floating` is used but undeclared |

### Gaps and verdicts

| Gap | Real value? | Proposal |
|---|---|---|
| Undeclared `floating` | Yes, because it is already used. | Declare `floating: boolean = false`. |
| Roving tabindex (Arrow, Home and End between enabled controls; Tab exits) | **Yes.** `role="toolbar"` implies it, and today every button is a tab stop. | Behaviour only, no attribute. |
| Toggle buttons expose pressed state | **Yes (a11y).** `data-active` is a magic data attribute and is invisible to assistive technology. | Cross-component: add `pressed: boolean` to `ui-icon-button`, which renders `aria-pressed`. The adapter drops `data-active`. |
| Link button | **Yes.** 5 of 5 ecosystems have one, and it is the most-missed control. | Adapter or command work, not toolbar API. It needs a link popover (`ui-popover` plus `ui-input`). |
| Paragraph alignment | Moderate. 4 of 5 have it, but it requires the TextAlign extension. | Defer. Add when documents need it. |
| Grouping element | Low. `<div role="group" aria-label>` plus `<ui-separator orientation="vertical">` already covers it. | Adapter should use `ui-separator` instead of the private class. No new component. |
| Auto-overflow | No. Not common (2 of 5, and both use explicit dropdowns). | Skip. Authors put a `ui-menu` in the toolbar. |
| Shortcut display | Low for the shell. | Use `ui-tooltip` children. No toolbar attribute. |
| `label` attribute | No. Native `aria-label` is already respected (the component checks `hasAttribute`). | Skip. |

**Extras:** none. Keep it as a thin shell.

Sources: https://tiptap.dev/docs/ui-components/primitives/toolbar · https://tiptap.dev/docs/ui-components/components/mark-button · https://tiptap.dev/docs/ui-components/templates/simple-editor · https://github.com/ueberdosis/tiptap-ui-components/blob/main/apps/web/src/components/tiptap-templates/simple/simple-editor.tsx · https://tiptap.dev/docs/editor/extensions/functionality/bubble-menu · https://www.blocknotejs.org/docs/react/components/formatting-toolbar · https://github.com/TypeCellOS/BlockNote/blob/main/packages/react/src/components/FormattingToolbar/FormattingToolbar.tsx · https://platejs.org/docs/toolbar · https://github.com/udecode/plate/blob/main/apps/www/src/registry/ui/fixed-toolbar-buttons.tsx · https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/plugins/ToolbarPlugin/index.tsx · https://novel.sh/docs

---

## 2. ui-editor-slash-menu

**Looma today:** declared `open`, `query`, `selected-index`, with events `highlight` and `select` (`{index}`). Items and anchor are JS-only. It renders a header ("Insert" plus the query echo), an option list (icon, title, description) and a footer with keyboard hints. It is hidden when there are zero items. It flips below or above the caret and becomes a bottom sheet under 768px. Filtering (title plus keywords) lives in the `slash-command` extension, which has about 17 commands.

### Equivalents
- **T:** the `Suggestion` utility (`char`, `startOfLine`, `allowedPrefixes`, `allowSpaces`, `minQueryLength`, `debounce`, `items`, `render` lifecycle, `placement`, `offset`, `flip`). Some of the newer positioning and debounce options are uncertain as to which version introduced them. The UI component is `SlashDropdownMenu` (`enabledItems`, `customItems`, `itemGroups`, `showGroups`; items have title, subtext, aliases, badge and group).
- **B:** `SuggestionMenuController` (`triggerCharacter`, `getItems`, `minQueryLength`, `suggestionMenuComponent`). Items have `title`, `subtext`, `badge` (shortcut), `aliases`, `group` and `icon`. It has `filterSuggestionItems`, adjacent-group labels, `loadingState` and a "No items" empty item.
- **P:** `SlashPlugin` (`trigger`, `triggerPreviousCharPattern`, `triggerQuery`) with the `InlineCombobox`, `InlineComboboxGroup`, `InlineComboboxGroupLabel` and `InlineComboboxEmpty` UI. Items have `icon`, `keywords`, `label`, `value` and `focusEditor`.
- **L:** `LexicalTypeaheadMenuPlugin` (`triggerFn`, `options`, `menuRenderFn`, `onQueryChange`, `preselectFirstItem`) and the playground `ComponentPickerPlugin` (flat list with keywords, plus dynamic options such as typing "3x4" for a table).
- **N:** `EditorCommand`, `EditorCommandList`, `EditorCommandItem` and `EditorCommandEmpty` (cmdk). Items have `title`, `description`, `searchTerms`, `icon` and `command`.

### Capability table

| Capability | T | B | P | L | N | Count | Common | Looma |
|---|---|---|---|---|---|---|---|---|
| Declarative item list (title + description + icon) | ✓ | ✓ | ✓ | ✓ | ✓ | 5 | yes | JS-only property |
| Keywords/aliases filtering | ✓ | ✓ | ✓ | ✓ | ✓ | 5 | yes | in extension, not component |
| Grouping with labels | ✓ | ✓ | ✓ | – | – | 3 | yes | **missing** |
| Empty state | uncertain | ✓ | ✓ | – (closes) | ✓ | 3 | yes | hides |
| Loading state | ✓ (Suggestion props) | ✓ | – | – | – | 2 | no | n/a |
| Keyboard nav (↑↓ Enter Esc) | ✓ | ✓ | ✓ | ✓ | ✓ | 5 | yes | ✓ (extension-driven `selected-index`) |
| Trigger char / start-of-line rules | ✓ | ✓ | ✓ | ✓ | ✓ | 5 | yes | extension concern |
| Placement flip / configurable placement | ✓ | ✓ (bottom-start, auto) | ✓ | ✓ | ✓ | 5 | flip yes; configurable 1–2 | auto flip plus mobile sheet |
| Shortcut/markdown badge per item | ✓ (badge) | ✓ | – | – | – | 2 | no | – |

### Gaps and verdicts

| Gap | Real value? | Proposal |
|---|---|---|
| Items not expressible in markup | **Critical.** Without it the component is unusable outside the adapter. | Child markup: `<ui-editor-slash-menu-item value="heading-1" icon="heading-1" description="Large section heading" keywords="h1 title">Heading 1</ui-editor-slash-menu-item>`. `keywords` is a space-separated string, and a disabled item uses the plain `disabled` boolean. `select` and `highlight` details add `value` alongside `index`. |
| Grouping | **Yes.** Looma has about 17 commands (text, lists, callouts, code, media). | `<ui-editor-slash-menu-group label="Basic blocks">…items…</ui-editor-slash-menu-group>`, rendered as `role="group"` with `aria-labelledby`. |
| Filtering in the component | **Yes, once items are markup.** The `query` attribute already exists but today it is only echoed in the header. | The component hides items whose text and `keywords` don't match `query`, and `selected-index` counts visible items. The extension stops filtering. |
| Empty state | Moderate. The menu vanishing mid-query reads as "slash broke". | `empty` slot shown when `open` and zero visible items. If the slot is absent, keep the current hide behaviour. |
| Anchor not declarable | **Yes.** Positioning is impossible without it. | `anchor-rect: record` as JSON text (`{"left","top","right","bottom"}`). The adapter keeps setting the property. |
| Hard-coded English header, footer and aria-label | **Yes (i18n and a11y).** | Respect an author's `aria-label`. Make the visible header use the same label, or drop the header. Move the kbd hints into a `footer` slot, which matches `ui-combobox`'s `footer` slot, and render no footer by default. |
| `placement` attribute | No. Caret-anchored plus flip covers it. | Skip. |
| Loading | No. Slash items are static. | Skip. |
| Shortcut badge | Low. | Skip. Authors can put a `<kbd>` inside the item's content if needed. |

**Extras:** the mobile bottom-sheet positioning is a keep because it is real mobile value. The query echo in the header is a drop; it is redundant with the caret text and is where an English string lives. The `highlight` event is a keep, because it syncs the extension's selected index on hover.

Sources: https://tiptap.dev/docs/editor/api/utilities/suggestion · https://tiptap.dev/docs/ui-components/components/slash-dropdown-menu · https://www.blocknotejs.org/docs/react/components/suggestion-menus · https://github.com/TypeCellOS/BlockNote/blob/main/packages/react/src/components/SuggestionMenu/SuggestionMenu.tsx · https://platejs.org/docs/slash-command · https://github.com/udecode/plate/blob/main/apps/www/src/registry/ui/inline-combobox.tsx · https://github.com/facebook/lexical/blob/main/packages/lexical-react/src/LexicalTypeaheadMenuPlugin.tsx · https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/plugins/ComponentPickerPlugin/index.tsx · https://novel.sh/docs/guides/tailwind/slash-command

---

## 3. ui-editor-mention-menu

**Looma today:** declared `loading`, `open`, `query`, `selected-index`, with events `highlight` and `select`. Items (`id`, `label`, `detail?`, `initials?`) and the anchor are JS-only. It renders an initials avatar, label and detail. It shows "Searching…" only while there are zero items. It uses `aria-activedescendant` and `aria-busy`. The header ("People", "Type after @ to search") is hard-coded. The provider, limit (default 8, max 20) and filter live in the extension.

### Equivalents
- **T:** the `Mention` extension plus `Suggestion` (`char: '@'`, async `items`, loading exposed in props). The UI component is `MentionDropdownMenu` (inherits `SuggestionMenuProps`; details thin in the docs, so uncertain).
- **B:** `SuggestionMenuController triggerCharacter="@"` with custom inline content. It has loading and empty states and groups.
- **P:** `MentionPlugin` (`trigger`, `triggerPreviousCharPattern`, `insertSpaceAfterMention`; items have `key` and `text`) and the `InlineCombobox` (groups, `InlineComboboxEmpty`). Async loading is not documented.
- **L:** the playground `MentionsExtension` (regex triggers, 75-character query limit, a 5-result limit, a cached async lookup service). It has no loading or empty UI.
- **N:** no mention UI (uncertain; none documented).

### Capability table

| Capability | T | B | P | L | N | Count | Common | Looma |
|---|---|---|---|---|---|---|---|---|
| Async items | ✓ | ✓ | ✓ (app-side) | ✓ | – | 4 | yes | ✓ (extension) |
| Loading state | ✓ | ✓ | – | – | – | 2 | no | ✓ |
| Empty state | uncertain | ✓ | ✓ | – | – | 2–3 | borderline | hides |
| Result limit | – | – | – | ✓ (5) | – | 1 | no | ✓ (extension) |
| Grouping (people/pages…) | uncertain | ✓ | ✓ | – | – | 2 | no | – |
| Avatar/secondary text | uncertain | custom | custom | ✓ (image option) | – | – | – | initials + detail |
| Keyboard nav | ✓ | ✓ | ✓ | ✓ | – | 4 | yes | ✓ |
| Trigger char configurable | ✓ | ✓ | ✓ | ✓ | – | 4 | yes | extension concern |

### Gaps and verdicts

| Gap | Real value? | Proposal |
|---|---|---|
| Items not expressible in markup | **Critical.** | `<ui-editor-mention-menu-item value="u_123" detail="Design" initials="AL">Ada Lovelace</ui-editor-mention-menu-item>`, with a `start` slot that accepts a `<ui-avatar>` so real photos work (`initials` is the fallback). `select` detail adds `value`. |
| Empty state ("No people found") | **Yes, more than for slash.** Async search makes "no match" vs "still loading" meaningful. | `empty` slot shown when `open`, `loading` is false and there are zero items. |
| Anchor | Yes. | Same `anchor-rect: record` as the slash menu. |
| Hard-coded header, hint and aria-label | Yes (i18n). | Respect `aria-label`. Move the header and hint into a `header` slot (default empty). |
| Loading while stale results are shown | Low. | Keep the current behaviour (spinner only when there are zero items), because `aria-busy` already reflects it. |
| Grouping | No. Not common, and Looma mentions are people-only. | Skip until other mentionable kinds exist. |
| Filtering in the component | No. Mentions are provider-filtered and async. | Keep in the extension. `query` stays informational. |

**Extras:** `loading` is a keep, and so are `aria-activedescendant`/`aria-busy`. `initials` is a keep as the fallback, but prefer an avatar slot. The result limit is an extension concern, so keep it off the component.

Sources: https://tiptap.dev/docs/ui-components/components/mention-dropdown-menu · https://tiptap.dev/docs/editor/api/utilities/suggestion · https://www.blocknotejs.org/docs/react/components/suggestion-menus · https://platejs.org/docs/mention · https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/plugins/MentionsExtension/index.tsx

---

## 4. ui-editor-insert-table-grid

**Looma today:** declared `header-row`, `max-cols` (8), `max-rows` (8), `open`, with event `insert` (`{rows, cols, withHeaderRow}`). Hover previews the size, clicking commits it ("3 × 3 selected"), then a separate "Insert table" button fires the event. There is a "Header row" checkbox. Every cell is a `<button>`, which means 64 tab stops and no arrow-key navigation.

### Equivalents
- **T:** `TableTriggerButton`, a grid picker (`maxRows` 8, `maxCols` 8, `onInserted`, `hideWhenUnavailable`). It inserts on click.
- **B:** no picker. The slash "Table" item inserts a default table (uncertain on size).
- **P:** `TableToolbarButton`, an 8×8 hover picker showing an "r x c" label. It inserts on click and has no header toggle.
- **L:** `InsertTableDialog` with numeric Rows (1–500) and Columns (1–50) inputs, default 5×5. `INSERT_TABLE_COMMAND` accepts `includeHeaders`, but the dialog does not expose it (uncertain).
- **N:** none.

| Capability | T | B | P | L | Count | Common | Looma |
|---|---|---|---|---|---|---|---|
| Grid size picker | ✓ | – | ✓ | – (inputs) | 2 | no (but it is the chosen UX) | ✓ |
| Max rows/cols configurable | ✓ | – | – (fixed 8) | fixed limits | 1 | no | ✓ |
| Insert on click | ✓ | n/a | ✓ | n/a | 2 | – | **two-step** |
| Header-row choice at insert | – | – | – | command only | 0–1 | no | ✓ |
| Size readout | uncertain | – | ✓ | – | – | – | ✓ |

### Verdicts
- **Bug:** wire `header-row` (boolean, default false, meaning "checkbox starts checked") and observe it. Stop hard-coding `true`.
- **Gap, keyboard navigation (real value, a11y):** use roving focus over the grid, where the arrows grow or shrink the selection and Enter inserts. Only one cell is a tab stop. This is behaviour, not API.
- **Extra, two-step commit:** simplify, don't drop. Clicking a cell should insert immediately, as in T and P, while the header checkbox stays above the grid. The separate "Insert table" button is the drop candidate. Keep it only if touch testing shows mis-taps; that is uncertain.
- **Extra, header-row checkbox:** keep. Header rows matter for table semantics, and nobody else offers it at insert time.
- **`open`:** consider dropping. The grid is always hosted in a popover, so `ui-popover[open]` already owns visibility (low risk; verify adapters).
- `max-rows` and `max-cols` are a keep, and so is the Tiptap parity. Document the clamp to 10, or remove it.

Sources: https://tiptap.dev/docs/ui-components/node-components/table-node · https://github.com/udecode/plate/blob/main/apps/www/src/registry/ui/table-toolbar-button.tsx · https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/plugins/TablePlugin.tsx

---

## Table capabilities (shared by the table toolbar, context menu and overlay)

The Looma action vocabulary (`TableContextMenuAction`) is: `align-left|center|right`, `background-{none,gray,yellow,blue,green,red}`, `add-row-before/after`, `add-column-before/after`, `delete-row|column|table`, `clear-cells`, `merge-cells`, `split-cell`. The overlay adds `select-row`, `select-column` and `open-cell-menu`. The extension sets `resizable: true`.

| Capability | T | B | P | L | Count/4 | Common | Looma |
|---|---|---|---|---|---|---|---|
| Add row/col before/after | ✓ | ✓ | ✓ | ✓ | 4 | yes | ✓ |
| Delete row/col | ✓ | ✓ | ✓ | ✓ | 4 | yes | ✓ |
| Delete table | ✓ (command; UI uncertain) | – (delete block) | ✓ | ✓ | 3 | yes | ✓ |
| Merge / split | ✓ | ✓ (opt-in) | ✓ | ✓ | 4 | yes | ✓ |
| **Header row/column toggle** | ✓ | ✓ (opt-in) | – | ✓ | 3 | **yes** | **missing** |
| Horizontal cell alignment | ✓ | – (block align) | ✓ (general align) | – (toolbar) | 2–4 | borderline | ✓ |
| Vertical cell alignment | ✓ | – | – | ✓ | 2 | no | – |
| Cell background | ✓ (NodeBackground) | ✓ (opt-in) | ✓ | ✓ | 4 | yes | ✓ (6 hard-coded hex presets) |
| Cell text colour | – | ✓ | – | – | 1 | no | – |
| Borders | – | – | ✓ | – | 1 | no | – |
| Column resize | ✓ | ✓ | ✓ | ✓ | 4 | yes | ✓ (extension) |
| **Reorder row/col (drag or move)** | ✓ (drag + Move button) | ✓ (drag) | ✓ (rows) | ✓ (columns) | 4 | **yes** | **missing** |
| Duplicate row/col | ✓ | – | – | – | 1 | no | – |
| Sort | ✓ | – | – | ✓ | 2 | no | – |
| Clear contents | ✓ | – | – | – | 1 | no | ✓ |
| Freeze / striping / fit-width | – | – | – | ✓ / ✓ / T only | 1 | no | – |
| Unavailable actions hidden or disabled | ✓ (`hideWhenUnavailable`) | ✓ | ✓ (`canMerge`, `canSplit`) | ✓ | 4 | yes | ✓ (undeclared `can-*`) |
| Row/col handles opening a scoped menu | ✓ | ✓ | – | – (column drag + sort) | 2–3 | borderline | handles only select |
| Boundary "+" insert | end-of-table extend (+ drag) | end extend | – | add row/col (position uncertain) | 3 (end only) | end-only is common | ✓ at **every** boundary |
| Cell menu trigger in cell | ✓ | ✓ | – | ✓ (chevron) | 3 | yes | ✓ |

## 5. ui-editor-table-toolbar

**Equivalents:** Plate's floating table toolbar in `table-node.tsx` (background colour, merge and split, borders, delete table, insert and delete row and column) is the closest. Tiptap composes buttons (`TableAlignCellButton`, `TableMergeSplitCellButton`, …) into its menus. BlockNote adds `TableCellMergeButton` to its formatting toolbar. Lexical has no table toolbar.

**Looma today:** an alignment group, "Add row" and "Add column" buttons, and a "Table options" overflow menu. The overflow menu contains background swatches plus Structure, Cells and Table sections, and those sections are an almost exact copy of the context menu.

| Item | Verdict |
|---|---|
| Declare `can-*` booleans (9) | **Do it.** They are in use, and hiding unavailable actions is common. False-by-default correctly hides unavailable actions. An alternative is a single `available: list<action keyword>` shared with the context menu, which is cleaner but a bigger change. |
| Header row/column toggles | **Add (common, real value).** A header chosen at insert time can't be fixed later today. Add the actions `toggle-header-row` and `toggle-header-column`, and add state attributes `header-row: boolean` and `header-column: boolean` so the buttons show `aria-pressed`. |
| Overflow menu duplicating the context menu | **Drop the duplication.** No ecosystem ships a toolbar, a context menu and a cell menu with the same full action set. Keep alignment plus add row and add column (plus the header toggles) in the toolbar. Make "Table options" open the shared `ui-editor-table-context-menu`, or drop the button. |
| `cell-alignment` (left/center/right) | Keep. |
| `cell-background` (string) | Keep. Change the presets from hard-coded hex values to theme tokens (for dark mode), rather than adding a palette attribute. |
| Vertical align, borders, text colour, sort, duplicate | Skip (not common). |

## 6. ui-editor-table-context-menu

**Equivalents:** Lexical `TableActionMenuPlugin` (merge and unmerge, background colour, vertical align, row striping, freeze first row and column, insert above, below, left and right, delete row, column and table, toggle row and column header). Tiptap `TableCellHandleMenu` and the row and column handle menus. BlockNote `TableHandleMenu` (add, delete, header toggle, colour) and `TableCellMenu` (colour, split). Plate has none (it uses its floating toolbar).

| Item | Verdict |
|---|---|
| Declare `can-*` | Do it, as for the toolbar. |
| Header row/column toggles | **Add** (`toggle-header-row`, `toggle-header-column`, and `header-row` and `header-column` state booleans). This is the most natural home for them, matching L and B. |
| `scope: "cell" \| "row" \| "column" = "cell"` | **Add (real value).** T and B show row- or column-specific menus from handles. Today a row handle can only select, and the cell menu mixes row and column deletes. With `scope="row"` the menu shows insert above and below, delete row, header row and move up and down. With `scope="column"` it shows insert left and right, delete column, header column and move left and right. |
| Move row/column (`move-row-up/down`, `move-column-left/right`) | **Add as menu items.** Reorder is common (4 of 4). Menu items give a keyboard-accessible version at a fraction of drag's cost, matching Tiptap's `TableMoveRowColumnButton`. Drag is deferred. |
| Background swatches + `cell-background` | Keep (4 of 4). |
| Clear cells | Keep (cheap, and Tiptap has it). |
| Freeze, striping, sort, duplicate | Skip. |

## 7. ui-editor-table-overlay

**Equivalents:** Tiptap `TableHandle`, `TableExtendRowColumnButtons`, `TableSelectionOverlay` and `TableCellHandleMenu`. BlockNote `TableHandlesController` (row and column drag handles plus menu, `ExtendButton`, `TableCellButton`). Lexical `TableHoverActionsV2Plugin` (column drag indicator, sort menu, add row, add column) and the cell chevron. Plate has a row drag handle plus column resize handles.

**Looma today:** declared `open` only, with geometry JS-only. It emits `add-*` with `boundaryIndex`, `select-row` and `select-column` with indices, and `open-cell-menu` with the anchor.

| Item | Verdict |
|---|---|
| Geometry not declarable | Declare `geometry: record` (JSON: `rowBoundaries`, `columnBoundaries`, `activeCell`, `hoveredCell`). It is needed for any non-adapter use, and the type already has a text form. |
| Row/column handle opens a scoped menu | **Add.** A handle click emits `open-row-menu` or `open-column-menu` with `{rowIndex|columnIndex, anchor}`, and the host opens the context menu with `scope`. Keep `select-row` and `select-column`, which are needed for merge and bulk clear. Either pair the actions (click selects and opens) or keep both. |
| Drag-to-reorder | Common, but costly. **Defer.** Ship the move menu items first. |
| Boundary "+" at every row and column boundary | **Keep (Looma extra).** It is a superset of the common end-of-table extend, it is already built and tested, and it saves a menu round-trip. |
| Cell menu trigger | Keep (3 of 4 common). |
| Column resize | Already provided by the Tiptap `resizable` column handles. No overlay work. |
| Selection overlay (Tiptap) | Skip. The ProseMirror cell-selection styling suffices. |

Sources (tables): https://tiptap.dev/docs/ui-components/node-components/table-node · https://tiptap.dev/docs/editor/extensions/nodes/table · https://www.blocknotejs.org/docs/features/blocks/tables · https://github.com/TypeCellOS/BlockNote/tree/main/packages/react/src/components/TableHandles · https://platejs.org/docs/table · https://github.com/udecode/plate/blob/main/apps/www/src/registry/ui/table-node.tsx · https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/plugins/TableActionMenuPlugin/index.tsx · https://github.com/facebook/lexical/blob/main/packages/lexical-playground/src/plugins/TableHoverActionsV2Plugin/index.tsx · https://github.com/facebook/lexical/tree/main/packages/lexical-playground/src/plugins/TableCellResizer

---

## Uncertain facts
- Tiptap `Suggestion` options `placement`, `debounce` and `initialItems`: taken from the current docs page, but it is unclear which version introduced them.
- Tiptap `MentionDropdownMenu`'s empty and loading behaviour is not documented on its page.
- Whether Tiptap's mobile Simple Editor toolbar overflows or scrolls; not documented.
- Plate and BlockNote toolbar roving focus (Radix and Mantine may provide it); not verified.
- Lexical "Add row" and "Add column" hover buttons: whether they insert at the end or next to the hovered cell (the code calls `insertTable*AtSelection`).
- BlockNote default table size when inserted from the slash menu.
- Novel has no mention or table UI (none found in its docs).
