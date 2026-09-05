# Overlay Contract

The overlay contract is shared by `ui-dialog` and `ui-popover` through a centralized manager.

## Types

- `ui-popover`: non-modal, dismissible by default.
- `ui-dialog`: modal by default (`modal !== "false"`), integrated with native `dialog`.

## Close Semantics

- Light dismiss targets only the topmost dismissible overlay.
- Escape closes only the topmost closable overlay.
- Nested overlays close top-down.

## Stack and Scroll Lock

- Overlays are registered in a shared stack.
- Any open modal dialog enables scroll lock with reference counting.
- Scroll lock clears only when modal count reaches zero.

## Focus

- Modal dialogs trap focus while open and return focus on close.
- Popovers do not trap focus by default.

## Positioning

- `ui-menu`, `ui-context-menu`, `ui-popover`, `ui-tooltip`, and
  `ui-toast-region` render their floating surface in the Popover API top layer.
- CSS Anchor Positioning follows the trigger and uses logical start/end
  placement when supported.
- Looma's shared lightweight fallback flips and shifts against the visual
  viewport when Anchor Positioning is unavailable. It runs only while the
  surface is open; consumers do not need a separate positioning dependency.
- Tooltip pointer interactions use configurable `show-delay` and `hide-delay`
  intent timing (500ms/100ms by default); keyboard focus opens immediately.

## Shared Event Payloads

- `open`: `{ open: true, reason, trigger }`
- `close`: `{ open: false, reason, trigger }`
- `reason`: `programmatic | light-dismiss | escape | action`
