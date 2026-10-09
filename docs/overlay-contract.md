# Overlay Contract

## Plan

Define one consistent overlay lifecycle for `ui-popover` and `ui-dialog`, with native API preference and centralized fallback behavior.

## Task Breakdown With Checkpoints

- Checkpoint 1: close semantics (light dismiss + ESC) fixed.
- Checkpoint 2: focus, nesting, and scroll-lock rules fixed.
- Checkpoint 3: positioning policy and fallback behavior fixed.

## Overlay Types

- `ui-popover`: non-modal anchored overlay, light dismiss by default.
- `ui-dialog`: viewport-centered overlay, non-modal by default; `modal` adds inertness, backdrop, and focus containment.

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

Every open floating surface uses the browser's native top presentation layer. A popup stays in
its authored DOM position for inheritance, events, and framework ownership, but its presentation
is outside ancestor clipping, transforms, and stacking contexts. Anchored controls remain visually
attached to their invoker; viewport dialogs remain viewport-centered. Inline menus and docked
controls remain ordinary page content.

A popover or menu without `for` also renders in the top layer, at the place it is written, and
travels with that place. Engines disagree on a top-layer surface's static position (Chromium uses
the viewport origin), so `writtenPlace` measures the surface in page flow before it is shown, then
carries that point with the box that holds it through page and nested scrolling. It neither flips
nor shifts into the viewport. Table Context Menu uses the same place; only a menu written in a
fixed or absolutely positioned box, or placed by an integration's inline insets as LoomaEditor
does, is kept inside the viewport.

Native modal dialogs use `showModal()`. Non-modal dialogs use `show()` plus a manual popover,
keeping focus and close semantics while leaving the rest of the page usable. Modality and top-layer
presentation are separate responsibilities.

`observeOverlayViewport` owns one capture scroll handler and a coalesced viewport pass per
document, shared across separately loaded HTML and Vue bundles. Only active surfaces subscribe;
the last unsubscribe removes the listeners. Nested scroller events, resize, and visual viewport
changes remeasure each live element or virtual anchor. The shared flip/shift policy keeps anchored
surfaces within viewport gutters; oversized surfaces constrain their own scrollable height.
Editor suggestion snapshots expose `getRect()` to remeasure the current caret anchor after scroll.

Static, always-open docs examples run in isolated preview documents with their own native top
layers. Live triggered examples, including Dialog, use the page's top layer. Preview CSS must not
turn a production popup into an inline or card-positioned surface.

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
