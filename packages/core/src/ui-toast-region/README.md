# `ui-toast-region`

## Purpose

Host transient toast messages in a live region with dismiss handling.

## SSR Markup Contract

```html
<ui-toast-region>
  <div id="saved-toast" data-ui-toast>
    Profile saved.
    <button type="button" data-ui-toast-dismiss aria-label="Dismiss">Dismiss</button>
  </div>
</ui-toast-region>
```

## Attributes

- `open`: visibility gate (default `true`); the region is visible only while this
  is true and at least one toast is present.

## Properties

- `open: boolean`

## Events

- `open`: `{ open: true, reason, trigger }`
- `close`: `{ open: false, reason, trigger }`
- `dismiss`: `{ id, reason, trigger }` — a request for the consumer to remove
  the matching toast from its owned list. The region never removes or hides a
  slotted toast itself.

## Slots/Children

- Default slot containing toast nodes marked with `data-ui-toast`.

Consumers must handle `dismiss` and update the source list. `close` is emitted
after that update removes the final toast.

## Keyboard Behavior

- Uses native keyboard behavior of child controls.

## ARIA

- Defaults to `role="region"` with `aria-live="polite"` for announcements.
