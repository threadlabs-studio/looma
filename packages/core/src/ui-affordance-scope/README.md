# `ui-affordance-scope`

## Purpose And Semantics

Coordinate presentation-only proximity states for a related set of interactive affordances. The scope does not replace the semantics, focus behavior, or hit target of any descendant control.

## SSR And No-JS Contract

```html
<ui-affordance-scope near-radius="16">
  <ui-icon-button anticipatory label="Add item">+</ui-icon-button>
</ui-affordance-scope>
```

Without upgrade, descendants remain ordinary interactive controls. Proximity is a progressive visual enhancement.

## API

- Attribute/property: `near-radius` / `nearRadius` (number, default `16`).
- Slot: interactive descendants marked with `data-ui-affordance`, including `ui-icon-button anticipatory`.
- Events: none.

## Interaction

The scope owns one pointer listener and batches proximity calculations into animation frames. Multiple nearby descendants can enter the near state at once, but only their actual visible controls are hit-testable. Touch input skips proximity; direct focus and activation remain available.

## Candidate Proof

Cover overlapping near regions, one listener per scope, layout refresh, teardown, keyboard behavior, touch fallback, SSR markup, and theme-token overrides.
