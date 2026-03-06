# `ui-disclosure`

## Purpose

Toggle visibility of related content with accessible semantics.

## SSR Markup Contract

```html
<ui-disclosure>
  <button aria-expanded="false" aria-controls="faq-a1">Question</button>
  <div id="faq-a1" hidden>Answer</div>
</ui-disclosure>
```

## Attributes

- `open`: boolean, indicates expanded state.
- `disabled`: boolean, disables toggle action.

## Properties

- `open: boolean`
- `defaultOpen: boolean`
- `disabled: boolean`

## Events

- `open`: `{ open: true, reason: "action" | "programmatic", trigger: "keyboard" | "pointer" | "programmatic" }`
- `close`: `{ open: false, reason: "action" | "programmatic", trigger: "keyboard" | "pointer" | "programmatic" }`

## Slots/Children

- Children should include one trigger control and one content region.

## Keyboard Behavior

- `Enter`/`Space` on trigger toggles state.

## ARIA

- Trigger must reflect `aria-expanded` and `aria-controls`.
- Content region should use `hidden` when closed.
