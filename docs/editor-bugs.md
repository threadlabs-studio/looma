# Editor Bugs

Last updated: 2026-09-03

This file tracks shared Looma editor defects that are visible in Knit and other consuming apps.

## Open

### E-TBL-001: Slash-triggered table picker anchors to toolbar instead of the slash context

Status: closed

Observed behavior:

- Choosing `Table` from the slash menu opens the insert-table picker near the toolbar anchor instead of near the slash menu / insertion point.

Expected behavior:

- Slash-triggered table insertion should feel local to the slash action.
- Either:
  - the picker opens adjacent to the slash menu / caret location, or
  - `/table` inserts a sensible default table immediately and skips the separate picker.

Resolution:

- `/table` now uses the shared Looma helper `insertTableAtRange(editor, range)` to insert a stable default table directly from the slash interaction.
- The slash flow no longer jumps to a toolbar-owned picker anchor.

Acceptance notes:

- A slash-triggered table action must no longer jump the user to a visually unrelated anchor.
- Desktop and mobile behavior must be intentionally specified, not incidental.

### E-TBL-002: Insert-table grid uses hover-only selection with no pinning step

Status: closed

Observed behavior:

- The grid expands as the pointer moves.
- Moving from the grid down to `Insert table` can change the selected dimensions on the way to the button.

Expected behavior:

- The user must be able to lock in a row/column size before confirming insertion.
- Acceptable patterns:
  - click a grid size to pin, then click `Insert table`, or
  - click a grid size and insert immediately, or
  - keep hover preview but make confirmation occur without the pointer crossing live selection cells.

Resolution:

- `ui-editor-insert-table-grid` now treats hover as preview only and click as the commit step for `rows` and `cols`.
- The inserted size stays stable while moving from the grid to the confirmation button.
- Dimension cells are native, named toggle buttons, so keyboard and touch users can pin the same dimensions before confirmation.

Acceptance notes:

- The chosen dimensions must remain stable while the user moves to the confirmation control.
- Keyboard selection and touch behavior should be defined as part of the fix.

### E-TBL-003: Table overlay and options model are placeholder-quality, not Confluence-quality

Status: closed for the 0.1.6 interaction contract (2026-09-03)

Observed behavior:

- Row/column insert controls are large, persistent, and not visually tied to individual boundaries the way Confluence does it.
- Table options are routed through a cell context menu, which makes structural actions feel hidden and cell formatting/table structure feel mixed together.

Expected behavior:

- Row and column insertion affordances should appear on hover near the specific row/column boundary they affect.
- Structural table actions should be easier to discover than a right-click-only cell menu.
- Cell-specific actions and table-structure actions should not be forced into one overloaded entry point.

Design direction to evaluate:

- Keep hover boundary controls for insert-row / insert-column.
- Add a lightweight table toolbar or action strip when selection is inside a table for structural actions:
  - add/delete row
  - add/delete column
  - header row / header column
  - merge / split
  - table delete
- Reserve the cell menu for cell-scoped actions such as background color, merge/split, and future cell formatting.

Resolution:

- Row and column boundary controls now behave as hover-only line affordances instead of persistent visible buttons.
- The overlay now keeps a single active boundary at a time, with the insert handle tied to the hovered row/column line instead of a blanket of visually equivalent controls.
- Looma now keeps the floating table toolbar scoped to active table selection only and uses it for quick actions such as cell alignment and simple row/column insertion.
- Looma’s shared toolbar overflow is now explicitly structural-only; cell-specific actions such as merge/split and background color live in the cell context menu instead of being duplicated in the floating bar.
- Cell background is now a shared cell-scoped action in the right-click menu instead of being mixed into the quick toolbar or structural overflow.
- The heavier row/column delete, merge/split, and other overflow actions are now available from a grouped toolbar overflow menu as well as the right-click menu.
- The right-click menu now hides unavailable actions and groups the remaining actions by structure/table intent instead of presenting one long partially-disabled list.
- Looma now also normalizes resized column widths back into the active table so the table stays full-width inside the editor after drag-resize completes.
- `LoomaEditor` owns the complete selection, focus, command, overlay, toolbar, and context-menu interaction instead of requiring each host app to reconstruct it.

Release evidence:

- Chromium exercises keyboard dimension selection, the visible structural toolbar,
  destructive-intent dispatch, and keyboard activation of row insertion controls.
- Automated browser accessibility checks pass for the toolbar, table menu, insert
  grid, and insertion overlay without disabled rules.
- Tiptap data-integrity tests add rows and columns to a populated table and prove
  every existing cell plus surrounding document content survives serialization.
- Destructive controls emit one explicit app-owned intent and do not mutate editor
  state on their own.

Acceptance notes:

- Hovering a row/column boundary should clearly preview the affected line.
- Insert controls should appear where the action will apply, not as oversized always-on buttons.
- The primary structural actions must be discoverable without requiring right-click hunting.
- Visual identity is controlled through Looma semantic tokens, including host-theme overrides for every editor control state.

### E-TBL-004: Toolbar icon rendering still looks off compared with the pre-Looma editor

Status: closed (2026-03-29)

Observed behavior:

- Toolbar icons still look slightly wrong in size, alignment, or stroke/fill consistency compared with the earlier Knit editor.

Expected behavior:

- Toolbar buttons should read as visually crisp and uniform at a glance.
- Icon sizing, optical alignment, and stroke/fill language should be consistent across the toolbar.

Resolution notes:

- Looma’s shared toolbar shell now enforces more stable sizing and non-shrinking child layout.
- The turnkey Looma editor now renders all formatting actions through the same Looma `IconButton` primitive and semantic token contract.
- Browser verification passed both in Looma and against the real page editor in Knit, including a computed-style assertion on the rendered shadow-root button.

Acceptance notes:

- Run a visual audit of all toolbar icons together, not one-by-one.
- Normalize icon box, stroke width, fill/stroke policy, and button centering.

## Notes

- These are shared Looma editor issues even when first reported from Knit.
- Do not mark Phase 1 table UX as hardened until the open table items above are closed in real browser testing.
