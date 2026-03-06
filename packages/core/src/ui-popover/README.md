# `ui-popover`

## Purpose

Display non-modal anchored contextual content.

## SSR Markup Contract

```html
<button popovertarget="help-popover">Help</button>
<ui-popover id="help-popover" popover>
  Contextual help text.
</ui-popover>
```

## Attributes

- `open`: boolean state hint.
- `anchor`: optional anchor element id.
- `placement`: preferred placement token.

## Properties

- `open: boolean`
- `defaultOpen: boolean`
- `anchor: string | null`
- `placement: string`

## Events

- `open`: `{ open: true, reason, trigger }`
- `close`: `{ open: false, reason: "light-dismiss" | "escape" | "programmatic" | "action", trigger }`

## Slots/Children

- Default slot for content.

## Keyboard Behavior

- `Escape` closes topmost popover when closable.

## ARIA

- Trigger should use `aria-controls` and optional `aria-expanded`.
