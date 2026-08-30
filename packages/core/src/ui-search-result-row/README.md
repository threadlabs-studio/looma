# `ui-search-result-row`

## Purpose And Semantics

Provide layout and state styling for a result row while the app owns navigation, result data, and highlighting.

## SSR And No-JS Contract

```html
<ui-search-result-row>
  <a slot="title" href="/document/42">Release notes</a>
  <span slot="meta">Updated today</span>
</ui-search-result-row>
```

The author-provided link/content remains semantic without upgrade. Shadow layout and selected/disabled styling are enhancements.

## API

- Attributes/properties: `selected`, `disabled`.
- Slots: `leading`, `title`, `meta`, `excerpt`, `trailing`.
- Events: none; use the slotted control's native events.

## Interaction

Do not turn the wrapper itself into a second competing interactive control. Preserve visible focus on the slotted link/button and use 44px result targets on touch layouts.

## Candidate Proof

Cover semantic link/button fallback, slot layout, selected/disabled states, focus visibility, touch target, and SSR import.
