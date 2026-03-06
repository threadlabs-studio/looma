# Component Contract Template

## Plan

Use this template for every component at `packages/core/src/<component>/README.md`.

## Task Breakdown With Checkpoints

- Checkpoint 1: SSR contract completed.
- Checkpoint 2: API contract completed.
- Checkpoint 3: interaction/a11y/mobile/testing sections completed.

## 1) Purpose

- Problem solved:
- Why this is a component (not a recipe/token):

## 2) SSR Markup Contract

```html
<!-- Must work without JS -->
<ui-example>
  <!-- semantic baseline content -->
</ui-example>
```

- No-JS behavior:
- Upgrade behavior:

## 3) Attributes

| Name | Type | Default | Reflects | Notes |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

## 4) Properties

| Name | Type | Default | Controlled? | Notes |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

## 5) Events

| Name | Detail Shape | Bubbles | Composed | Cancelable | Trigger |
| --- | --- | --- | --- | --- | --- |
|  | `{}` |  |  |  |  |

## 6) Slots/Children

- Required children:
- Named slots:
- Child constraints:

## 7) Keyboard Behavior

- Key map:
- Roving tabindex/focus movement (if applicable):

## 8) ARIA

- Required roles:
- Required aria attributes:
- Name/role/value strategy:

## 9) Mobile Behavior

- Touch target expectations:
- Coarse pointer behavior:
- Responsive/container behavior:

## 10) Styling Hooks

- Exposed attributes/data-state:
- CSS variables consumed:
- CSS parts (if used):
- External margin policy: none.

## 11) Examples

- Plain HTML:
- React:
- Vue:
- Svelte:

## 12) Tests

- Unit behavior tests:
- Accessibility tests:
- SSR/hydration tests:
