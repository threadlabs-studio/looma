# Adapter Contract

Looma adapters are thin translations over the same custom-element contracts.
They pass attributes, properties, events, and slots through without owning
different behavior.

## Release 1 Support

| Adapter | Release 1 status | Public support promise |
| --- | --- | --- |
| `@threadlabs/looma/vue` | Published Candidate subpath | Qualified for public layout and core wrappers without the editor graph |
| `@threadlabs/looma/vue/editor` | Published Candidate subpath | Qualified for consumer-facing Tiptap-backed Vue editor helpers and wrappers; the internal Knit harness supplies additional deep-integration evidence |
| React | Internal/deferred preview | Repository code only; not published or supported in Release 1 |
| Svelte | Internal/deferred preview | Repository code only; not published or supported in Release 1 |

Repository presence is not release qualification. React and Svelte API parity,
tests, and public documentation remain follow-up work.

## Vue Mapping

Release 1 requires a named Vue wrapper for every published layout and core tag
and every published editor element. The generated/source-derived completeness
gate is the authority; this table is a readable summary.

| Element family | Elements | Vue contract |
| --- | --- | --- |
| Layout | `ui-stack`, `ui-inline`, `ui-cluster`, `ui-grid`, `ui-center`, `ui-switcher`, `ui-sidebar`, `ui-reel`, `ui-separator` | Same names in PascalCase |
| Actions and forms | `ui-button`, `ui-icon-button`, `ui-input`, `ui-select`, `ui-textarea`, `ui-form-field`, `ui-checkbox`, `ui-switch`, `ui-radio`, `ui-radio-group` | Same names in PascalCase |
| Overlays, affordances, and navigation | `ui-affordance-scope`, `ui-dialog`, `ui-popover`, `ui-menu`, `ui-menu-item`, `ui-context-menu`, `ui-tooltip`, `ui-tabs`, `ui-disclosure` | Same names in PascalCase |
| Display and app shell | `ui-avatar`, `ui-avatar-group`, `ui-badge`, `ui-toast-region`, `ui-floating-action-button`, `ui-search-shell`, `ui-search-result-row`, `ui-top-bar` | Same names in PascalCase |
| Editor | `ui-editor-toolbar`, `ui-editor-slash-menu`, `ui-editor-table-context-menu`, `ui-editor-table-toolbar`, `ui-editor-insert-table-grid`, `ui-editor-table-overlay` | `Editor*` named wrappers |

The source-derived completeness gate rejects a missing map entry or named Vue
export, including for `ui-context-menu` and the editor elements.

## Event Parity

Adapters preserve core event names and detail payloads. Where an element emits
`open`, `close`, `select`, `change`, or `dismiss`, the Vue wrapper must forward
that event without changing its detail schema. Editor wrappers likewise preserve
the editor element's custom-event detail.

## SSR And Fallback Rules

- Adapter modules must import in a server process without browser globals.
- Layout and editor elements use light DOM; core elements use shadow roots after
  upgrade and preserve consumer-authored semantic content through slots.
- Adapters must not replace semantic fallback content with framework-only markup.
- Without JavaScript, the semantic light DOM remains; custom-element interaction,
  shadow styling, and adapter event translation do not.

## Vue Example

```ts
import { h } from "vue";
import { Disclosure } from "@threadlabs/looma/vue";

export const Example = {
  setup() {
    return () =>
      h(
        Disclosure,
        {
          onOpen: (detail) => console.log("open", detail),
          onClose: (detail) => console.log("close", detail)
        },
        {
          default: () => [
            h("button", { type: "button", "aria-controls": "faq-a1" }, "Question"),
            h("div", { id: "faq-a1", hidden: true }, "Answer")
          ]
        }
      );
  }
};
```

React and Svelte examples are intentionally omitted from the Release 1 install
path because those adapters are deferred.
