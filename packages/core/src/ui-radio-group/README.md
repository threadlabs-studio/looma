# `ui-radio-group`

## Purpose

Grouped selection primitive that coordinates `ui-radio` descendants, keyboard navigation, and event payloads.

## SSR Markup Contract

```html
<ui-radio-group value="starter" name="plan" orientation="horizontal">
  <ui-radio value="starter">Starter</ui-radio>
  <ui-radio value="pro">Pro</ui-radio>
</ui-radio-group>
```

## Attributes

- `value`
- `name`
- `disabled`
- `required`
- `orientation`

## Properties

- `value: string`
- `name: string`
- `disabled: boolean`
- `required: boolean`
- `orientation: "horizontal" | "vertical"`

## Events

- `select`: `{ value, previousValue, trigger }`
- `change`: `{ checked, value, trigger }`

## Slots/Children

- Default slot; expects one or more `ui-radio` descendants.

## Keyboard Behavior

- Arrow keys move selection to adjacent enabled radios based on orientation.
- `Home` and `End` move to first and last enabled radio.

## ARIA

- Host uses `role="radiogroup"` and `aria-orientation`.
