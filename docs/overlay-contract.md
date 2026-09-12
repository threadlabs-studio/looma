# Overlay Contract

## Plan

Define one consistent overlay lifecycle for `ui-popover` and `ui-dialog`, with native API preference and centralized fallback behavior.

## Task Breakdown With Checkpoints

- Checkpoint 1: close semantics (light dismiss + ESC) fixed.
- Checkpoint 2: focus, nesting, and scroll-lock rules fixed.
- Checkpoint 3: positioning policy and fallback behavior fixed.

## Overlay Types

- `ui-popover`: non-modal anchored overlay, light dismiss by default.
- `ui-dialog`: modal overlay with focus trap, light dismiss off by default.

## Light Dismiss

- Light dismiss means closing when interaction occurs outside the topmost dismissible overlay.
- Only the topmost eligible overlay responds.
- Nested overlays dismiss from top-down only.

## ESC Behavior

- ESC targets topmost closable overlay only.
- Reason payload uses `{ reason: "escape" }`.
- Lower overlays never handle ESC while a higher one is open.

## Nesting Rules

- Overlays form a stack managed by one shared manager module.
- Closing a parent closes descendants first.
- Child interactions cannot dismiss parent accidentally.

## Scroll Lock Rules

- Apply document scroll lock when any modal dialog is open.
- Use reference counting for nested modals.
- Remove lock only when modal count returns to zero.

## Focus Rules

- Dialogs trap focus while modal.
- On close, focus returns to invoker when still connected.
- Popovers do not trap focus by default.

## Positioning Policy

- Prefer Popover API and CSS Anchor Positioning when available.
- Verify the browser's resolved anchor placement against the visual viewport.
- Fall back to centralized minimal JS positioning when the native placement
  cannot fit, with:
  - placement preference
  - viewport clamping
  - flip and shift behavior
- No per-component ad hoc positioners.

`ui-menu`, `ui-context-menu`, `ui-popover`, and `ui-tooltip` all use
`createAnchoredSurface`. Popover API moves their floating surface into the top
layer so a scrolling or clipping ancestor cannot hide it. CSS Anchor
Positioning is the native placement path when its resolved rectangle stays
inside the visual viewport. If neither native placement fits, the controller
uses its small behavioral fallback for a frame-coalesced flip/shift pass and
keeps that containment current while the surface is open. This avoids both
off-screen native placement and a full CSS syntax polyfill in every consumer
bundle.

The custom-element host owns top-layer placement only. For menus and popovers,
a single shadow surface owns background, border, shadow, and conditional
overflow scrolling. The public light-DOM overlay chrome applies only before
custom-element definition, so it cannot paint a second box around the upgraded
surface.

Unanchored viewport UI uses the same top-layer boundary through
`createViewportSurface`; `ui-toast-region` is the canonical example. Its CSS
owns viewport placement while the shared surface keeps it outside clipping
ancestors. Tooltip pointer interactions wait 500ms to show and 100ms to hide by
default through configurable `show-delay` and `hide-delay` properties; keyboard
focus opens immediately.

`getVisualViewportRect` and `clampRectToViewport` are the shared geometry
primitives for floating UI. `createProximityCoordinator` uses the same viewport
signals and frame scheduling for anticipatory controls; see
[Anticipatory affordances](./anticipatory-affordances.md).

## Shared Events Contract

- `open`: `{ open: true, reason, trigger }`
- `close`: `{ open: false, reason, trigger }`
- `reason` values: `programmatic`, `light-dismiss`, `escape`, `action`.
