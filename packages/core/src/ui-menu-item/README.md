# `ui-menu-item`

## Purpose And Semantics

Represent one focusable command inside `ui-menu` or `ui-context-menu`.

## SSR And No-JS Contract

```html
<ui-menu-item role="menuitem" value="rename">Rename</ui-menu-item>
```

The label remains visible without upgrade. Roving focus, disabled-state enforcement, and parent selection events require Looma JavaScript; provide an ordinary link/button fallback when the command must work without JavaScript.

## API

- Attribute/property: `disabled`; property: `value`.
- Slot: command label/content.
- Selection is emitted by the parent menu, not directly by the item.

## Interaction

Parent menus manage Arrow-key focus and `Enter`/`Space` activation. Disabled items are skipped and never select. Touch rows must provide a 44px target.

## Candidate Proof

Cover parent-driven roving focus, selection value, disabled skipping, pointer activation, visible fallback, and SSR import.
