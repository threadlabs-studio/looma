# `ui-search-shell`

## Purpose And Semantics

Provide the visual shell for a search overlay while the app owns query state, results, routing, and dismissal policy.

## SSR And No-JS Contract

```html
<ui-search-shell>
  <form slot="search" role="search"><input type="search" name="q" /></form>
  <div slot="body">Search results</div>
</ui-search-shell>
```

Slotted search and result markup remains available without upgrade. Shadow layout and overlay presentation are enhancements.

## API

- Slots: `backdrop`, `search`, `status`, `body`, `footer`.
- No attributes, properties, or custom events.

## Interaction

The app manages focus entry/return, Escape, routing, loading announcements, and touch-safe result controls. Do not use the shell alone as a modal/dialog semantic contract.

## Candidate Proof

Cover semantic form/results fallback, slot layout, focus ownership in the consuming pattern, narrow viewport behavior, and SSR import.
