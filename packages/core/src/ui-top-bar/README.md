# `ui-top-bar`

## Purpose And Semantics

Provide a slot-based app/page top-bar layout without owning navigation or app state.

## SSR And No-JS Contract

```html
<ui-top-bar>
  <a slot="leading" href="/">Home</a>
  <h1>Documents</h1>
  <button slot="actions" type="button">Create</button>
</ui-top-bar>
```

Author-provided heading, links, and controls remain semantic without upgrade. Shadow layout and responsive presentation are enhancements.

## API

- Slots: `leading`, default title/content, `search`, `actions`.
- No attributes, properties, or custom events.

## Interaction

Apps own landmark choice, heading level, navigation, search behavior, focus, and command handling. Interactive slots must remain keyboard-visible and use 44px touch targets.

## Candidate Proof

Cover semantic slotted fallback, slot ordering, narrow viewport layout, focus visibility, touch targets, and SSR import.
