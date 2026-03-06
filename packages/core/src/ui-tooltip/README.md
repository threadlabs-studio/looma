# `ui-tooltip`

## Purpose

Provide contextual, non-modal help text linked to a trigger.

## SSR Markup Contract

```html
<button id="help-trigger" type="button">Help</button>
<ui-tooltip for="help-trigger">Helpful guidance.</ui-tooltip>
```

## Attributes

- `for`: trigger element id (optional when tooltip follows trigger in DOM).
- `open`: controls visibility state.
- `default-open`: initial visibility hint.

## Properties

- `for: string`
- `open: boolean`
- `defaultOpen: boolean`

## Events

- `open`: `{ open: true, reason, trigger }`
- `close`: `{ open: false, reason, trigger }`

## Slots/Children

- Default slot for tooltip content.

## Keyboard Behavior

- Opens on trigger focus.
- Closes with `Escape`.

## ARIA

- `role="tooltip"` on the tooltip host.
- Trigger receives `aria-describedby` while tooltip is active.
