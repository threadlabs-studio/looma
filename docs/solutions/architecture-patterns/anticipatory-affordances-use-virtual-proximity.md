---
title: Use virtual proximity for anticipatory affordances
date: 2026-09-04
category: architecture-patterns
module: interaction-design
problem_type: design_pattern
component: frontend
severity: medium
applies_when:
  - "An interaction should reveal itself before direct hover without enlarging its hit target."
  - "Several nearby controls need overlapping near states."
  - "A container must expose contextual actions without moving content."
tags:
  - anticipatory-affordances
  - proximity
  - interaction-design
  - overlays
  - pointer-events
  - performance
---

# Use virtual proximity for anticipatory affordances

## Context

Contextual controls are hard to discover when they appear only under direct
hover. Making their invisible hit areas larger seems to help, but overlapping
halos steal clicks, text selections, and drag gestures from the content. Giving
each control its own pointer listener and geometry observer also makes a rich
surface expensive and difficult to coordinate.

Table editing exposed an additional failure mode. A geometry refresh that
replaced equivalent overlay markup could invalidate a button after hover but
before pointer-down, so a visible control ignored the click.

## Guidance

Use one scoped proximity coordinator for a related interaction surface. It
tracks the pointer once, measures registered anchors into one cache, and evaluates
all anchors in one animation frame. The near region is state, not an element:
only the visible control participates in hit testing. This allows nearby regions
to overlap without changing pointer ownership.

Keep the interaction language progressive:

1. A quiet guide shows that an action exists.
2. Every anchor within the near radius reveals a neutral control.
3. Direct hover or keyboard focus adds the accent, cursor, guide line, and tooltip.
4. Pressed, selected, or dragging state confirms the action.

Invalidate cached geometry on layout, scroll, resize, and visual-viewport
changes, then batch the measurement into the next animation frame. A component
that owns dynamic geometry should accept typed geometry through its framework
adapter rather than encoding multiple related measurements as string attributes.
Compare incoming geometry by value and preserve existing controls when nothing
material changed.

## Why This Matters

Virtual proximity creates a larger discovery region without creating a larger
interaction region. One scoped listener and one geometry pass scale with the
surface rather than with the number of components. Stable markup preserves the
critical sequence from hover to click and prevents reactive updates from turning
visible controls into stale nodes.

Container state should only reveal relevant descendants or strengthen a local
guide. It must not shift content or restyle unrelated descendants. Touch has no
near-hover state, so coarse-pointer layouts must expose the equivalent action
directly.

## When to Apply

- Contextual icon buttons, insertion points, resize handles, and item actions.
- Containers whose hover should gently reveal related descendant controls.
- Overlay geometry that changes with selection, merged content, or viewport size.

## Examples

    const coordinator = createProximityCoordinator(scope, {
      anchorSelector: "[data-ui-affordance]",
    })

    // Call only when anchors or layout may have changed.
    coordinator.refresh()

Avoid pseudo-elements or transparent elements with pointer events as proximity
halos. They change hit testing and make overlapping near states compete.

## Related

- [Anticipatory affordances](../../anticipatory-affordances.md)
- [Treat the visual viewport as the mobile editor layout boundary](./visual-viewport-mobile-editor-layout.md)
