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
- `open`: initial visibility state; interaction subsequently owns visibility.
- `placement`: preferred anchored edge.
- `show-delay` and `hide-delay`: hover timing in milliseconds.

## Properties

- `for: string`
- `open: boolean`
- `placement: string`
- `showDelay: number`
- `hideDelay: number`

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

## Optional field help

Use `ui-button variant="ghost" size="sm"` with a question-mark icon and
`aria-label="Help for …"`, adjacent to the field label (never inside the label).
Point `for` at that native button. Focus is immediate; hover respects `show-delay`
(500 ms). The tooltip stays open
while focused or while the pointer crosses onto its content (`hide-delay`: 100 ms).
Escape dismisses without moving focus. Content must be noninteractive; use a popover
for links or controls. The description ID is attached without removing existing
`aria-describedby` IDs, and is removed on trigger changes/unmount. The trigger and
tooltip must share a document or shadow root. For integrated lookup/validation/help,
use `ui-combobox` rather than assembling separate error and action widgets.
