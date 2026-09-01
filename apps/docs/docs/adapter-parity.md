# Adapter Support

Adapters translate framework props, slots, and callbacks to Looma custom-element contracts. They do not own separate component behavior.

## Release 1 status

| Adapter | Status | Release 1 promise |
| --- | --- | --- |
| `@threadlabs/looma/vue` | Published Candidate | Named wrappers for all 38 published layout, core, and editor elements |
| React | Deferred internal preview | Not published or supported in Release 1 |
| Svelte | Deferred internal preview | Not published or supported in Release 1 |

Vue and direct custom-element examples are the supported public paths.

## Vue mapping

The source-derived release check requires a named Vue projection and export for every published element:

| Family | Published elements | Vue names |
| --- | --- | --- |
| Layout | `ui-stack`, `ui-inline`, `ui-cluster`, `ui-grid`, `ui-center`, `ui-separator` | `Stack`, `Inline`, `Cluster`, `Grid`, `Center`, `Separator` |
| Actions and forms | `ui-button`, `ui-icon-button`, `ui-input`, `ui-select`, `ui-textarea`, `ui-form-field`, `ui-checkbox`, `ui-switch`, `ui-radio`, `ui-radio-group` | Same names in PascalCase |
| Overlays and navigation | `ui-dialog`, `ui-popover`, `ui-menu`, `ui-menu-item`, `ui-context-menu`, `ui-tooltip`, `ui-tabs`, `ui-disclosure` | Same names in PascalCase |
| Display and app shell | `ui-avatar`, `ui-avatar-group`, `ui-badge`, `ui-toast-region`, `ui-floating-action-button`, `ui-search-shell`, `ui-search-result-row`, `ui-top-bar` | Same names in PascalCase |
| Editor | Six `ui-editor-*` elements | `Editor*` named wrappers |

## Event and SSR rules

- Vue wrappers preserve Looma event names and detail payloads.
- Adapter modules must import in a server process without browser globals.
- Wrappers preserve authored semantic fallback content instead of replacing it with framework-only markup.
- A missing projection or named export is a release defect.
