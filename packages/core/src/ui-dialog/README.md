# `ui-dialog`

## Purpose

Provide accessible modal and non-modal dialog behavior with focus management.

## SSR Markup Contract

```html
<ui-dialog>
  <dialog>
    <h2>Title</h2>
    <p>Body copy</p>
    <button value="cancel">Close</button>
  </dialog>
</ui-dialog>
```

## Attributes

- `open`: boolean
- `modal`: boolean (default true)
- `dismissible`: boolean (default true) — close on backdrop click and Escape when true

## Properties

- `open: boolean`
- `defaultOpen: boolean`
- `modal: boolean`
- `dismissible: boolean`

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

- Native `dialog` element semantics preferred.
