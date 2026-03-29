# `ui-floating-action-button`

## Purpose

Fixed-position floating action control for mobile-first create and compose flows.

## SSR Markup Contract

```html
<ui-floating-action-button label="Create new page" mobile-only>
  <svg aria-hidden="true" viewBox="0 0 24 24"></svg>
</ui-floating-action-button>
```

## Attributes

- `disabled`
- `label`
- `mobile-only`

## Properties

- `disabled: boolean`
- `label: string`
- `mobileOnly: boolean`

## Events

- None.

## Slots/Children

- Default slot for icon or action content.

## Keyboard Behavior

- Uses native button keyboard behavior.

## ARIA

- Applies `aria-label` to the internal button when `label` is provided.
