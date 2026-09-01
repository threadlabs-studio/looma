# `ui-context-menu`

## Purpose And Semantics

Provide a pointer-anchored action menu while reusing Looma menu selection and overlay dismissal. Its parent is the context-menu trigger; slotted `ui-menu-item` elements are the commands.

## SSR And No-JS Contract

```html
<div>
  <button type="button">Document actions</button>
  <ui-context-menu>
    <ui-menu-item value="rename">Rename</ui-menu-item>
  </ui-context-menu>
</div>
```

Author text remains in light DOM, but positioning, opening, dismissal, and selection require upgrade. Essential actions need another visible no-JS/touch path.

## API

- Attributes/properties: `open`, `default-open` / `defaultOpen`.
- Events: `open`, `close`, and `select` with Looma reason/trigger details.
- Slot: default `ui-menu-item` children.

## Interaction

- Browser `contextmenu` on the parent opens at pointer coordinates.
- `Enter`/`Space` selects the focused enabled item; `Escape` dismisses.
- Disabled items never select.
- Touch long-press is browser-dependent, so provide a visible action trigger with 44px targets.

## Candidate Proof

Unit/browser coverage must include pointer open, keyboard selection, disabled items, light dismiss, Escape, SSR import, and the visible touch alternative.
