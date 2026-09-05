---
title: Keep Tiptap table chrome local to each cell
date: 2026-09-04
category: ui-bugs
module: editor
problem_type: ui_bug
component: frontend
severity: medium
symptoms:
  - "Column resize handles appeared at the editor's far-right edge instead of the hovered cell boundary."
  - "A compact table cell became taller after Tiptap injected its column-resize-handle sibling."
  - "Cell text showed an unintended trailing paragraph gap once the injected handle invalidated the paragraph's last-child match."
root_cause: implicit_editor_dom_assumption
resolution_type: code_fix
related_components:
  - table
  - tiptap
  - prosemirror
tags:
  - editor
  - tables
  - column-resize
  - positioning-context
  - paragraph-spacing
  - dom-injection
  - tiptap
  - browser-regression
framework_version: "Tiptap 2.x (verified with 2.27.2)"
---

# Keep Tiptap table chrome local to each cell

## Problem

Looma's Tiptap table resize decoration depended on two CSS assumptions that were not true at runtime: an absolutely positioned resize handle did not have the table cell as its containing block, and table paragraph spacing assumed the paragraph would remain the cell's last child. Together, those assumptions misplaced the column boundary and made compact cells jump in height when resize chrome appeared.

## Symptoms

- Column resize handles appeared at the editor's far-right edge instead of on the hovered column boundary.
- A compact one-line cell gained bottom whitespace only after hovering near a resizable column.
- Before a resize boundary became active, Tiptap emitted no resize-handle decoration; the failure emerged when that interaction-created widget was inserted.

## What Didn't Work

- Resetting only `:is(th, td) > p:last-child` was structurally fragile. Once Tiptap appended a `.column-resize-handle` widget after the paragraph, the paragraph stopped matching `:last-child`, so the global paragraph margin applied again.
- Giving `.column-resize-handle` `position: absolute` and a right-edge offset was insufficient without a positioned cell. The browser resolved the offset against a more distant ancestor, so the handle tracked the editor edge rather than its column.

## Solution

Make each table cell own the coordinate system for injected resize chrome:

```css
.ProseMirror th,
.ProseMirror td {
  position: relative;
}
```

This contract is defined in `packages/editor/src/editor.css:1201`; the resize handle remains absolutely positioned in the same stylesheet.

Then style semantic table content independently of whether a plugin widget follows it:

```css
.ProseMirror :is(th, td) > p,
.looma-editor .ProseMirror :is(th, td) > p {
  margin: 0;
}

.ProseMirror :is(th, td) > p + p,
.looma-editor .ProseMirror :is(th, td) > p + p {
  margin-top: var(--ui-editor-table-paragraph-gap, var(--ui-space-2, 8px));
}
```

The direct-child reset and adjacent-paragraph rhythm are defined at `packages/editor/src/editor.css:1212` and `packages/editor/src/editor.css:1217`. A real-browser regression in `packages/vue/src/editor/LoomaEditor.browser.test.ts:95` records compact cell geometry before hover, activates the actual resize boundary, and verifies that the injected handle is usable without changing the cell height.

## Why This Works

Absolute positioning resolves against the nearest positioned ancestor. Giving every `th` and `td` a positioning context makes the cell boundary the stable coordinate owner for Tiptap's handle.

The paragraph rule identifies content by semantic relationship instead of sibling order. A later decoration cannot disable `> p`, while `> p + p` restores spacing only between real adjacent paragraphs. Layout intent therefore remains independent of transient DOM that an editor extension injects.

## Prevention

- Treat third-party editor DOM as mutable. Avoid positional selectors such as `:last-child` for content spacing when extensions can insert decorations alongside that content.
- Give every absolutely positioned editor affordance an explicit local containing block rather than relying on a distant editor-shell ancestor.
- Exercise interaction-created DOM in a real browser. A static render that never activates the resize boundary cannot catch this regression.
- Express internal cell rhythm as relationships among semantic children, such as `p + p`, instead of cleanup rules for whichever content node happens to be last.

## Related Issues

- [E-TBL-003: Table overlay and options model](../../editor-bugs.md#e-tbl-003-table-overlay-and-options-model-are-placeholder-quality-not-confluence-quality)
- [Use virtual proximity for anticipatory affordances](../architecture-patterns/anticipatory-affordances-use-virtual-proximity.md)
- [Treat the visual viewport as the mobile editor layout boundary](../architecture-patterns/visual-viewport-mobile-editor-layout.md)
- [Anticipatory affordances](../../anticipatory-affordances.md)
