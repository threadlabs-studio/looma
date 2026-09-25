# Adapter Support

Adapters project framework props, slots, and callbacks onto Looma's declarative component contracts. They create native roots directly and do not own separate component behavior.

## Release 1 status

| Adapter | Status | Release 1 promise |
| --- | --- | --- |
| `@threadlabs/looma/vue` | Published | Named wrappers for every published layout and core element |
| `@threadlabs/looma/vue/editor` | Published | Named wrappers for all 7 published editor elements plus Looma editor helpers |
| React | In development | Not published |

Vue and direct declarative HTML examples are the supported public paths.

## Vue mapping

The source-derived release check requires a named Vue projection and export for every published element:

| Family | Published elements | Vue names |
| --- | --- | --- |
| Layout | `ui-stack`, `ui-action-bar`, `ui-cluster`, `ui-grid`, `ui-container`, `ui-switcher`, `ui-sidebar`, `ui-reel`, `ui-scroll-area`, `ui-cover`, `ui-separator` | Same names in PascalCase |
| Actions and forms | `ui-button`, `ui-icon-button`, `ui-input`, `ui-input-group`, `ui-select`, `ui-textarea`, `ui-form-field`, `ui-checkbox`, `ui-switch`, `ui-radio`, `ui-radio-group` | Same names in PascalCase |
| Overlays, affordances, and navigation | `ui-affordance-scope`, `ui-dialog`, `ui-popover`, `ui-menu`, `ui-menu-item`, `ui-context-menu`, `ui-tooltip`, `ui-tabs`, `ui-disclosure`, `ui-tree`, `ui-tree-item` | Same names in PascalCase |
| Display and app shell | `ui-text`, `ui-page-header`, `ui-section`, `ui-status-message`, `ui-spinner`, `ui-card`, `ui-description-list`, `ui-description-item`, `ui-table`, `ui-breadcrumbs`, `ui-breadcrumb-item`, `ui-avatar`, `ui-avatar-group`, `ui-badge`, `ui-callout`, `ui-list`, `ui-list-item`, `ui-toast-region`, `ui-search-shell`, `ui-search-result-row`, `ui-top-bar` | Same names in PascalCase |
| Editor | Seven `ui-editor-*` components | `Editor*` named wrappers |

## Event and SSR rules

- Vue wrappers preserve Looma event names and detail payloads.
- Adapter modules must import in a server process without browser globals.
- Wrappers attach the same definitions and controllers used by direct HTML invocations.
- Wrappers preserve authored semantic fallback content instead of replacing it with framework-only markup.
- A missing projection or named export is a release defect.
