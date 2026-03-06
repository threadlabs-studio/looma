# `ui-input`

## Purpose

Styled text input that preserves native form behavior.

## SSR Markup Contract

```html
<ui-input>
  <input type="text" name="query" />
</ui-input>
```

## Attributes

- `value`
- `placeholder`
- `disabled`
- `readonly`
- `invalid`

## Properties

- `value: string`
- `defaultValue: string`
- `disabled: boolean`
- `readOnly: boolean`
- `invalid: boolean`

## Events

- Native `input` and `change`.
- Optional custom `change` detail mapping when needed in wrappers.

## Slots/Children

- Default child should be a native input control.

## Keyboard Behavior

- Native text input keyboard behavior.

## ARIA

- Supports `aria-invalid`, `aria-describedby`, and native label association.
