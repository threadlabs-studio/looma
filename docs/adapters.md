# Adapter Contract

Looma adapters are thin projections of the same declarative component contracts.
They create native roots, attach the shared definitions and controllers, and map
props, events, and slots without owning different behavior.

## Release 1 Support

| Adapter | Release 1 status | Public support promise |
| --- | --- | --- |
| `@threadlabs/looma/vue` | Published Candidate subpath | Qualified for public layout and core wrappers without the editor graph |
| `@threadlabs/looma/vue/editor` | Published Candidate subpath | Qualified for consumer-facing Tiptap-backed Vue editor helpers and wrappers; the internal Knit harness supplies additional deep-integration evidence |
| React | In development | Not published |

Publication is not release qualification. React support is in development: it ships once
HTML Next's React target converts components without the HTML Next runtime.

## Vue Mapping

Release 1 requires a named Vue wrapper for every published layout and core tag
and every published editor element. The generated/source-derived completeness
gate is the authority; this table is a readable summary.

| Element family | Elements | Vue contract |
| --- | --- | --- |
| Layout | `ui-stack`, `ui-action-bar`, `ui-cluster`, `ui-grid`, `ui-container`, `ui-switcher`, `ui-sidebar`, `ui-reel`, `ui-scroll-area`, `ui-cover`, `ui-separator` | Same names in PascalCase |
| Actions and forms | `ui-button`, `ui-icon-button`, `ui-input`, `ui-select`, `ui-textarea`, `ui-form-field`, `ui-checkbox`, `ui-switch`, `ui-radio`, `ui-radio-group` | Same names in PascalCase |
| Overlays, affordances, and navigation | `ui-affordance-scope`, `ui-dialog`, `ui-popover`, `ui-menu`, `ui-menu-item`, `ui-context-menu`, `ui-tooltip`, `ui-tabs`, `ui-disclosure`, `ui-tree`, `ui-tree-item` | Same names in PascalCase |
| Display and app shell | `ui-text`, `ui-page-header`, `ui-section`, `ui-status-message`, `ui-spinner`, `ui-card`, `ui-description-list`, `ui-description-item`, `ui-breadcrumbs`, `ui-breadcrumb-item`, `ui-avatar`, `ui-avatar-group`, `ui-badge`, `ui-callout`, `ui-list`, `ui-list-item`, `ui-chip`, `ui-toast-region`, `ui-floating-action-button`, `ui-search-shell`, `ui-search-result-row`, `ui-top-bar` | Same names in PascalCase |
| Editor | `ui-editor-toolbar`, `ui-editor-slash-menu`, `ui-editor-table-context-menu`, `ui-editor-table-toolbar`, `ui-editor-insert-table-grid`, `ui-editor-table-overlay` | `Editor*` named wrappers |

The source-derived completeness gate rejects a missing map entry or named Vue
export, including for `ui-context-menu` and the editor elements.

## Event Parity

Adapters preserve core event names and detail payloads. Where an element emits
`open`, `close`, `select`, `change`, `dismiss`, `reorder`, or `expand`, the Vue wrapper must forward
that event without changing its detail schema. Editor wrappers likewise preserve
the editor element's custom-event detail.

## SSR And Fallback Rules

- Adapter modules must import in a server process without browser globals.
- Every adapter renders the native light-DOM root declared by the component
  contract and preserves consumer-authored semantic content through slots.
- Adapters must not replace semantic fallback content with framework-only markup.
- Without JavaScript, direct invocation markup retains its semantic authored
  content; lowering, controller interaction, and adapter event translation do not run.

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

The Release 1 install path covers direct HTML and Vue only.
