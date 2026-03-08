# `ui-checkbox`

## Purpose

Checkbox primitive that mirrors checked state and emits normalized change details.

## SSR Markup Contract

```html
<ui-checkbox value="newsletter">
  <label>
    <input type="checkbox" name="newsletter" />
    <span>Subscribe to product updates</span>
  </label>
</ui-checkbox>
```

Wrap the input and label text in a `<label>` so clicking the text toggles the checkbox. Use `<span>` for the text.

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
