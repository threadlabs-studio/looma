# `ui-checkbox`

## Purpose

Checkbox primitive that mirrors checked state and emits normalized change details.

## SSR Markup Contract

```html
<ui-checkbox value="newsletter">
  <input type="checkbox" name="newsletter" />
  Subscribe to product updates
</ui-checkbox>
```

## Attributes

- `checked`
- `default-checked`
- `disabled`
- `required`
- `value`
- `indeterminate`

## Properties

- `checked: boolean`
- `defaultChecked: boolean`
- `disabled: boolean`
- `required: boolean`
- `value: string`
- `indeterminate: boolean`

## Events

- `change`: `{ checked, value, trigger }`

## Slots/Children

- Default slot; usually includes a native `<input type="checkbox">`.

## Keyboard Behavior

- Native keyboard behavior when an input child exists.
- Fallback host toggles on `Space`/`Enter`.

## ARIA

- Reflects `aria-checked` including `"mixed"` for indeterminate.
