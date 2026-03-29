# Editor Bugs

Last updated: 2026-03-29

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

Acceptance notes:

- The chosen dimensions must remain stable while the user moves to the confirmation control.
- Keyboard selection and touch behavior should be defined as part of the fix.

### E-TBL-003: Table overlay and options model are placeholder-quality, not Confluence-quality

Status: open

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

Current implementation note:

- `ui-editor-table-overlay` is still a Phase 1 primitive and does not yet match the Confluence interaction model in spacing, discoverability, or hover behavior.
- Row and column boundary controls now behave as hover-only line affordances instead of persistent visible buttons.
- Looma now keeps the floating table toolbar scoped to active table selection only and uses it for quick actions such as cell alignment and simple row/column insertion.
- The heavier row/column delete, merge/split, and other overflow actions are now available from a toolbar overflow menu as well as the right-click menu.
- Looma now also normalizes resized column widths back into the active table so the table stays full-width inside the editor after drag-resize completes.
- The full Confluence-style hover-line interaction model and richer structural options model are still not complete.

Acceptance notes:

- Hovering a row/column boundary should clearly preview the affected line.
- Insert controls should appear where the action will apply, not as oversized always-on buttons.
- The primary structural actions must be discoverable without requiring right-click hunting.

### E-TBL-004: Toolbar icon rendering still looks off compared with the pre-Looma editor

Status: closed (2026-03-29)

Observed behavior:

- Toolbar icons still look slightly wrong in size, alignment, or stroke/fill consistency compared with the earlier Knit editor.

Expected behavior:

- Toolbar buttons should read as visually crisp and uniform at a glance.
- Icon sizing, optical alignment, and stroke/fill language should be consistent across the toolbar.

Resolution notes:

- Looma’s shared toolbar shell now enforces more stable sizing and non-shrinking child layout.
- Knit’s remaining app-local formatting actions now use one consistent Lucide icon set instead of mixed inline fill/stroke/text glyph icons.
- Browser verification passed against the real page editor in Knit.

Acceptance notes:

- Run a visual audit of all toolbar icons together, not one-by-one.
- Normalize icon box, stroke width, fill/stroke policy, and button centering.

## Notes

- These are shared Looma editor issues even when first reported from Knit.
- Do not mark Phase 1 table UX as hardened until the open table items above are closed in real browser testing.
