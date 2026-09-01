# `ui-textarea`

## Purpose And Semantics

Enhance an author-provided native textarea while retaining its form and editing behavior.

## SSR And No-JS Contract

```html
<ui-textarea rows="4">
  <textarea name="notes" rows="4"></textarea>
</ui-textarea>
```

The textarea remains editable and submittable without upgrade. Looma styling and wrapper state synchronization are enhancements.

## API

- Attributes/properties: `value`, `default-value` / `defaultValue`, `disabled`, `readonly` / `readOnly`, `invalid`, `rows`.
- Slot: native textarea markup.
- Events: use native textarea `input`/`change` events.

## Interaction

Preserve native editing, selection, resize/scroll expectations, visible focus, labeling, and a 44px minimum touch height.

## Candidate Proof

Cover form submission, controlled/default value, disabled/readonly/invalid state, multiline keyboard input, no-JS operation, and SSR import.
