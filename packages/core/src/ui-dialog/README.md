# `ui-dialog`

## Purpose

Provide accessible modal and non-modal dialog behavior with focus management.

## SSR Markup Contract

```html
<ui-dialog label="Settings">
  <h2>Settings</h2>
  <p>Body copy</p>
  <button value="cancel">Close</button>
</ui-dialog>
```

## Attributes

- `open`: boolean
- `default-open`: initial uncontrolled open state (default false)
- `modal`: boolean (default true)
- `dismissible`: boolean (default true) — close on backdrop click and Escape when true
- `label`: accessible name for the native dialog surface

## Properties

- `open: boolean`
- `defaultOpen: boolean`
- `modal: boolean`
- `dismissible: boolean`
- `label?: string`

## Events

- `open`: `{ open: true, reason, trigger }`
- `close`: `{ open: false, reason: "escape" | "action" | "programmatic" | "light-dismiss", trigger }`

## Slots/Children

- Default slot for dialog content.

## Keyboard & pointer behavior

- `Escape` closes dialog when `dismissible` is true.
- Backdrop click closes dialog when `dismissible` is true.
- On open, focus moves to the first focusable element inside the dialog (or the dialog element).
- Focus is trapped when modal (native dialog behavior).

## ARIA

- The component owns the native `dialog` surface. Do not slot another `<dialog>`.
- `label` is the reliable accessible-name contract and is recommended for
  localized applications. When omitted, the first slotted heading (or an element
  marked `slot="heading"` / `data-ui-dialog-title`) is observed reactively and
  used as the name. The final fallback is `"Dialog"`.
