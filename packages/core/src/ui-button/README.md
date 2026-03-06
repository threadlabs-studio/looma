# `ui-button`

## Purpose

Styled action button with semantic button behavior.

## SSR Markup Contract

```html
<ui-button>
  <button type="button">Save</button>
</ui-button>
```

## Attributes

- `variant`: visual style token
- `size`: size token
- `disabled`: boolean

## Properties

- `variant: string`
- `size: string`
- `disabled: boolean`

## Events

- Native `click` behavior.

## Slots/Children

- Default children for button label/content.

## Keyboard Behavior

- Native button keyboard interaction.

## ARIA

- Native button semantics; no extra ARIA required when using `button`.
