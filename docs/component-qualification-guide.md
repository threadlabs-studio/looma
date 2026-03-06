# Component Qualification Guide

## Plan

Define what qualifies as a component, recipe, or token, and gate progression from draft to stable.

## Task Breakdown With Checkpoints

- Checkpoint 1: qualification categories locked.
- Checkpoint 2: required evidence checklist locked.
- Checkpoint 3: release readiness report format locked.

## Component vs Recipe vs Token

- Component: reusable semantic primitive with behavioral/API contract.
- Recipe: composition pattern built from components and layout primitives.
- Token: design primitive/semantic variable, not a renderable UI element.

## Qualification Levels

- Draft: initial contract + SSR baseline + keyboard path.
- Candidate: complete contract, adapters, tests, and a11y checks.
- Stable: all checks pass and API is semver protected.

## Required Evidence

- Contract README complete.
- SSR markup contract verified.
- Attributes/properties/events documented.
- Keyboard and focus behavior documented and tested.
- Mobile and touch behavior validated.
- No external margins verified.
- Unit and a11y checks passing.
- Adapter parity for React/Vue/Svelte passing.

## Non-Qualification Conditions

- Adapter-only behavior divergence.
- Missing event detail schema.
- Missing or broken SSR usage contract.
- Component injects external margins.
