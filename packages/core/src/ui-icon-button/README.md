# `ui-icon-button`

## Purpose And Semantics

Style an icon-only action while retaining an author-provided semantic button and accessible name.

## SSR And No-JS Contract

```html
<ui-icon-button label="Close">
  <button type="button" aria-label="Close"><svg aria-hidden="true"></svg></button>
</ui-icon-button>
```

The real button remains keyboard- and form-semantic without upgrade. Shadow styling and disabled synchronization are enhancements.

## API

- Attributes/properties: `label`, `disabled`, `size` (`sm | md | lg`), `variant` (`ghost | outline | solid`).
- Slot: one icon-bearing semantic control.
- Events: native control events; no Looma custom event.

## Interaction

Use a non-empty accessible label, preserve native focus/activation, and keep at least a 44px touch target where the control is used on mobile.

## Candidate Proof

Cover semantic fallback, accessible naming, keyboard activation, disabled behavior, sizes/variants, touch target, and SSR import.
