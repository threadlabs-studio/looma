# `ui-select`

## Purpose And Semantics

Enhance an author-provided native select without replacing its form, keyboard, or mobile semantics.

## SSR And No-JS Contract

```html
<ui-select value="open">
  <select name="status">
    <option value="open">Open</option>
    <option value="closed">Closed</option>
  </select>
</ui-select>
```

The native select remains functional without upgrade. Looma styling and wrapper state synchronization are enhancements.

## API

- Attributes/properties: `value`, `default-value` / `defaultValue`, `disabled`, `required`, `invalid`.
- Slot: native select markup.
- Events: use the slotted select's native `input`/`change` events.

## Interaction

Preserve native keyboard and platform picker behavior, label the control outside or through `ui-form-field`, and retain a 44px touch target.

## Candidate Proof

Cover form submission, controlled/default value, disabled/required/invalid state, keyboard/platform picker behavior, no-JS operation, and SSR import.
