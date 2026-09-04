---
title: Treat the visual viewport as the mobile editor layout boundary
date: 2026-09-04
category: architecture-patterns
module: editor
problem_type: architecture_pattern
component: frontend
severity: high
applies_when:
  - "An editor must remain usable while a mobile software keyboard is open."
  - "Formatting, table, or slash-command controls use fixed or floating positioning."
  - "Wide tables must remain readable on a narrow screen."
tags:
  - mobile-editor
  - visual-viewport
  - software-keyboard
  - responsive-layout
  - table-overflow
---

# Treat the visual viewport as the mobile editor layout boundary

## Context

Mobile browsers expose two different layout boundaries. The layout viewport can
remain close to the full browser height while the visual viewport shrinks and
moves when the software keyboard opens. Positioning editor chrome against
`window.innerHeight` can therefore push the document header offscreen or place
formatting and slash-command controls behind the keyboard.

The same responsive pass exposed a separate containment mistake: compressing
every table column to the page width makes cell content unusable. The correct
overflow owner is the table wrapper, not an individual cell.

## Guidance

Treat `window.visualViewport` as the positioning boundary for fixed mobile
editor UI, with `window.innerWidth` and `window.innerHeight` only as fallbacks.
Listen to both `resize` and `scroll`, because mobile browsers may change viewport
size or offset while the keyboard and browser chrome move. `LoomaEditor` derives
the dock's left, top, and width from those values
(`packages/vue/src/editor/LoomaEditor.ts:195`). Slash-command positioning follows
the same boundary and reserves the dock height
(`packages/editor/src/slash-menu.ts:225`).

Render one mobile dock and change its mode rather than stacking independent
formatting and table bars. Looma switches the dock to table actions for an active
table selection, suppresses desktop-only table overlays on mobile, and exposes a
Formatting action that returns to text tools without discarding editor focus
(`packages/vue/src/editor/LoomaEditor.ts:231`,
`packages/vue/src/editor/LoomaEditor.ts:551`). The dock itself owns horizontal
touch overflow and snap points (`packages/editor/src/editor.css:224`).

For tables, give cells a useful minimum width and put horizontal overflow on the
table wrapper. Looma applies `overflow-x: auto` to `.tableWrapper`, lets the table
grow to `max-content`, and sets the cell minimum independently
(`packages/editor/src/editor.css:1018`, `packages/editor/src/editor.css:1032`,
`packages/editor/src/editor.css:1046`). Individual cells do not become scroll
containers.

## Why This Matters

A keyboard-aware page shell alone is insufficient if each popup computes against
a different viewport. Sharing one visual boundary prevents controls from becoming
unreachable and avoids contradictory layers competing for the same space above
the keyboard. Assigning table overflow to the wrapper preserves readable columns
while keeping the document itself within the page width.

## When to Apply

- Rich-text editors or form-heavy views with fixed controls near the screen edge.
- Mobile surfaces where the software keyboard changes the visible viewport.
- Toolbars with more actions than fit in one row.
- Tables whose meaningful column width exceeds the available page width.

## Examples

The browser contract uses a 375-by-420 visual viewport with a nonzero vertical
offset, then asserts there is exactly one mobile dock, a table selection changes
its mode, the desktop overlay is absent, and Formatting restores text actions
(`packages/vue/src/editor/LoomaEditor.browser.test.ts:93`). Table browser coverage
separately asserts that minimum-width cells live inside a horizontally scrolling
wrapper.
