# `ui-form-field`

## Purpose

Wire label, help text, error text, and control accessibility attributes.

## SSR Markup Contract

```html
<ui-form-field>
  <label for="email">Email</label>
  <input id="email" type="email" aria-describedby="email-help" />
  <small id="email-help">We never share your email.</small>
</ui-form-field>
```

## Attributes

- `invalid`
- `required`
- `disabled`

## Properties

- `invalid: boolean`
- `required: boolean`
- `disabled: boolean`

## Events

- Pass-through native form control events (`input`, `change`, `blur`).

## Slots/Children

- Label/control/help/error content in natural source order.

## Keyboard Behavior

- Defers to child control behavior.

## ARIA

- Ensures label association and descriptive wiring (`aria-describedby`, `aria-invalid`).
