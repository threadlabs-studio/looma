# `ui-switch`

## Purpose

Switch primitive built on checkbox semantics with `role="switch"` state reflection.

## SSR Markup Contract

```html
<ui-switch value="notifications">
  <input type="checkbox" name="notifications" />
  Enable notifications
</ui-switch>
```

## Attributes

- `checked`
- `default-checked`
- `disabled`
- `required`
- `value`

## Properties

- `checked: boolean`
- `defaultChecked: boolean`
- `disabled: boolean`
- `required: boolean`
- `value: string`

## Events

- `change`: `{ checked, value, trigger }`

## Slots/Children

- Default slot; usually includes a native `<input type="checkbox">`.

## Keyboard Behavior

- Native keyboard behavior when an input child exists.
- Fallback host toggles on `Space`/`Enter`.

## ARIA

- Host reflects `role="switch"` and `aria-checked`.
