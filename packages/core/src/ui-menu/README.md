# `ui-menu` and `ui-menu-item`

## Purpose

Provide accessible command/action menu with keyboard navigation.

## SSR Markup Contract

```html
<ui-menu role="menu" aria-label="Actions">
  <ui-menu-item role="menuitem" tabindex="0">Edit</ui-menu-item>
  <ui-menu-item role="menuitem" tabindex="-1">Delete</ui-menu-item>
</ui-menu>
```

## Attributes

- `ui-menu`: `open`, `orientation`
- `ui-menu-item`: `disabled`, `selected`, `value`

## Properties

- `ui-menu.open: boolean`
- `ui-menu.defaultOpen: boolean`
- `ui-menu-item.value: string`
- `ui-menu-item.disabled: boolean`

## Events

- `select`: `{ value: string, trigger: "keyboard" | "pointer" | "programmatic" }`
- `open`: `{ open: true, reason, trigger }`
- `close`: `{ open: false, reason, trigger }`

## Slots/Children

- `ui-menu` default slot for `ui-menu-item` children.

## Keyboard Behavior

- Arrow keys navigate items.
- `Enter`/`Space` selects active item.
- `Escape` closes parent menu.

## ARIA

- Menu roles and item roles must be reflected for assistive technologies.
