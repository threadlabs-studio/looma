# Adapter Parity Guide

## Plan

Keep framework adapters thin and mechanical: they pass props/attributes/children to the same light-DOM custom elements and map core DOM events to framework callback style.

## Adapter Mapping Matrix

| Core Tag | React (`@ui/react`) | Vue (`@ui/vue`) | Svelte (`@ui/svelte`) |
| --- | --- | --- | --- |
| `ui-stack` | `Stack` | `Stack` | native element + `bindAdapter` |
| `ui-inline` | `Inline` | `Inline` | native element + `bindAdapter` |
| `ui-cluster` | `Cluster` | `Cluster` | native element + `bindAdapter` |
| `ui-grid` | `Grid` | `Grid` | native element + `bindAdapter` |
| `ui-center` | `Center` | `Center` | native element + `bindAdapter` |
| `ui-separator` | `Separator` | `Separator` | native element + `bindAdapter` |
| `ui-disclosure` | `Disclosure` | `Disclosure` | native element + `bindAdapter` |
| `ui-tabs` | `Tabs` | `Tabs` | native element + `bindAdapter` |
| `ui-dialog` | `Dialog` | `Dialog` | native element + `bindAdapter` |
| `ui-popover` | `Popover` | `Popover` | native element + `bindAdapter` |
| `ui-menu` | `Menu` | `Menu` | native element + `bindAdapter` |
| `ui-menu-item` | `MenuItem` | `MenuItem` | native element + `bindAdapter` |
| `ui-button` | `Button` | `Button` | native element + `bindAdapter` |
| `ui-input` | `Input` | `Input` | native element + `bindAdapter` |
| `ui-form-field` | `FormField` | `FormField` | native element + `bindAdapter` |
| `ui-tooltip` | `Tooltip` | `Tooltip` | native element + `bindAdapter` |
| `ui-toast-region` | `ToastRegion` | `ToastRegion` | native element + `bindAdapter` |
| `ui-checkbox` | `Checkbox` | `Checkbox` | native element + `bindAdapter` |
| `ui-switch` | `Switch` | `Switch` | native element + `bindAdapter` |
| `ui-radio-group` | _pending wrapper export_ | _pending wrapper export_ | native element + `bindAdapter` |
| `ui-radio` | _pending wrapper export_ | _pending wrapper export_ | native element + `bindAdapter` |
| `ui-badge` | _pending wrapper export_ | _pending wrapper export_ | native element + `bindAdapter` |
| `ui-avatar` | _pending wrapper export_ | _pending wrapper export_ | native element + `bindAdapter` |

## Event Parity

Adapters preserve core event names and detail payloads:

- `open` -> `{ open: true, reason, trigger }`
- `close` -> `{ open: false, reason, trigger }`
- `select` -> `{ value, previousValue, trigger }`
- `change` -> `{ checked, value, trigger }`
- `dismiss` -> `{ id, reason, trigger }`

## SSR Contract Reminder

- Author semantic HTML first.
- Keep light DOM structure identical to core contracts.
- Adapters must not introduce shadow DOM or framework-only interaction behavior.

## Usage Snippets

### React

```tsx
import { Disclosure, Tabs, Button } from "@ui/react";

export function Example() {
  return (
    <Disclosure
      onOpen={(detail) => console.log("open", detail)}
      onClose={(detail) => console.log("close", detail)}
    >
      <button type="button" aria-controls="faq-a1">What is light DOM?</button>
      <div id="faq-a1" hidden>It keeps SSR markup inspectable and portable.</div>
    </Disclosure>
  );
}
```

### Vue

```ts
import { h } from "vue";
import { Disclosure, Menu, MenuItem } from "@ui/vue";

export const Example = {
  setup() {
    return () =>
      h(Disclosure, {
        onOpen: (detail) => console.log("open", detail),
        onClose: (detail) => console.log("close", detail)
      }, {
        default: () => [
          h("button", { type: "button", "aria-controls": "faq-a1" }, "What is light DOM?"),
          h("div", { id: "faq-a1", hidden: true }, "It keeps SSR markup inspectable and portable.")
        ]
      });
  }
};
```

### Svelte

```svelte
<script lang="ts">
  import { bindAdapter } from "@ui/svelte";

  const disclosureOptions = {
    onOpen: (detail) => console.log("open", detail),
    onClose: (detail) => console.log("close", detail)
  };
</script>

<ui-disclosure use:bindAdapter={disclosureOptions}>
  <button type="button" aria-controls="faq-a1">What is light DOM?</button>
  <div id="faq-a1" hidden>It keeps SSR markup inspectable and portable.</div>
</ui-disclosure>
```
