# `ui-radio`

## Purpose

Radio control primitive for mutually exclusive selection, designed for use inside `ui-radio-group`.

## SSR Markup Contract

```html
<ui-radio value="starter">
  <input type="radio" name="plan" />
  Starter
</ui-radio>
```

## Attributes

- `checked`
- `default-checked`
- `disabled`
- `required`
- `value`
- `name`

## Properties

- `checked: boolean`
- `defaultChecked: boolean`
- `disabled: boolean`
- `required: boolean`
- `value: string`
- `name: string`

## Events

- `change`: `{ checked, value, trigger }`

## Slots/Children

- Default slot; can include a native `<input type="radio">` for progressive enhancement.

## Keyboard Behavior

- Native keyboard behavior when an input child exists.
- Fallback host selects on `Space` or `Enter`.

## ARIA

- Host reflects `role="radio"`, `aria-checked`, and `aria-disabled` in fallback mode.
