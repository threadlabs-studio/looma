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

- `open`: reflects whether at least one toast is present.

## Properties

- `open: boolean`

## Events

- `open`: `{ open: true, reason, trigger }`
- `close`: `{ open: false, reason, trigger }`
- `dismiss`: `{ id, reason, trigger }`

## Slots/Children

- Default slot containing toast nodes marked with `data-ui-toast`.

## Keyboard Behavior

- Uses native keyboard behavior of child controls.

## ARIA

- Defaults to `role="region"` with `aria-live="polite"` for announcements.
