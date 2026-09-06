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

## Optional field help

Use a real light-DOM button inside `ui-button variant="ghost" size="sm"` with a
question-mark icon and `aria-label="Help for …"`, adjacent to the field label (never
inside the label). Point `for` at that native button. `toggle-on-click` opts into
pinning on click/tap and dismissing on repeated activation or outside pointer input.
Focus is immediate; hover respects `show-delay` (500 ms). The tooltip stays open
while focused or while the pointer crosses onto its content (`hide-delay`: 100 ms).
Escape dismisses without moving focus. Content must be noninteractive; use a popover
for links or controls. The description ID is attached without removing existing
`aria-describedby` IDs, and is removed on trigger changes/unmount. The trigger and
tooltip must share a document or shadow root. For integrated lookup/validation/help,
use `ui-combobox` rather than assembling separate error and action widgets.
