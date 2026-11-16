# Looma behavior inventory

This inventory maps each Looma component, including internal editor parts, to its primary responsibility and shared behaviors. Use the published component catalog for APIs and examples.

| Family | Scope | Shared implementation and boundary |
| --- | --- | --- |
| Layout | Layout group, page and section components, and app chrome | Layout belongs to the authored tree, public tokens, and breakpoint behavior. Sidebar is also a temporary surface. Scroll Area owns scroll observation. |
| Temporary surfaces | Overlay group, popup form controls, responsive chrome, and editor menus and popovers | The overlay stack owns dismissal order and modal bookkeeping. Surface placement owns geometry. Native dialog and popover integration owns top-layer presentation and focus return. |
| Collection navigation | Menus, Listbox, Combobox, Tabs, editor toolbar, search results, Tree, and data views | Share positional navigation where the controls agree. Tree ancestry and table sorting are separate rules. Each widget owns eligibility, direction, active focus, and action or selection. |
| Form state | Forms group and editor forms | Preserve native form ownership, reset, submission, and validity. Enhanced fields reconcile their state after native reset. Checkbox, radio, select, and other native controls already receive browser behavior. |
| Date and time | Calendar, Date Field, Date Picker, Date Range Picker, Time Field, and Time Picker | Shared date parts, availability rules, range state, calendar grid, and date navigation sit below locale-aware editing and picker commit policy. |
| Document editing | Editor, Compact Editor, editor controls, and editor overlays | Document and compact sessions own data and editor commands. Controls bind shared collection, overlay, and form behaviors to editor-specific intent. |
| Status and presentation | Display group, overlays for feedback, and extras | Native semantics or authored content lead. Add behavior only for an observable interaction such as disclosure, pagination, resolution of status, or a keyboard-editable visualization. |

## Component index

Each tag appears once under its primary responsibility. The family table above records the shared behaviors that can cross these categories. For example, Sidebar also participates in temporary surface dismissal, and Combobox combines collection navigation, form state, and a popup.

| Primary responsibility | Components |
| --- | --- |
| **Layout and application chrome.** Spacing, measure, and wrapping | `ui-cluster`, `ui-column`, `ui-container`, `ui-cover`, `ui-grid`, `ui-stack`, `ui-switcher` |
| Page structure and responsive chrome | `ui-action-bar`, `ui-breadcrumb-item`, `ui-breadcrumbs`, `ui-nav-item`, `ui-page-header`, `ui-section`, `ui-sidebar`, `ui-site-header`, `ui-top-bar` |
| Scrolling and pagination | `ui-pagination`, `ui-reel`, `ui-scroll-area` |
| **Temporary surfaces.** Dismissal, placement, and focus | `ui-context-menu`, `ui-dialog`, `ui-menu`, `ui-menu-group`, `ui-menu-item`, `ui-popover`, `ui-search-shell`, `ui-tooltip` |
| Feedback and lifetime | `ui-toast`, `ui-toast-region` |
| **Actions and collections.** Action and command activation | `ui-affordance-scope`, `ui-button`, `ui-cycle-button`, `ui-disclosure`, `ui-floating-action-button`, `ui-icon-button` |
| Collection selection and navigation | `ui-combobox`, `ui-listbox`, `ui-search-result-row`, `ui-segmented-control`, `ui-tabs`, `ui-tree`, `ui-tree-item`, `ui-wizard` |
| Native table semantics and enhanced data state | `ui-data-table`, `ui-table` |
| **Forms and dates.** Native field semantics and enhanced editing | `ui-checkbox`, `ui-color-picker`, `ui-editable`, `ui-file-input`, `ui-form-field`, `ui-input`, `ui-input-group`, `ui-number-input`, `ui-radio`, `ui-radio-group`, `ui-select`, `ui-slider`, `ui-switch`, `ui-textarea` |
| Calendar and localized field behavior | `ui-calendar`, `ui-date-field`, `ui-date-picker`, `ui-date-range-picker`, `ui-time-field`, `ui-time-picker` |
| Pointer and keyboard value manipulation | `ui-curve-editor` |
| **Presentation.** Content, grouping, and status semantics | `ui-avatar`, `ui-avatar-group`, `ui-badge`, `ui-callout`, `ui-card`, `ui-card-group`, `ui-description-item`, `ui-description-list`, `ui-icon`, `ui-image`, `ui-list`, `ui-list-item`, `ui-meter`, `ui-notice-stripe`, `ui-separator`, `ui-skeleton`, `ui-spinner`, `ui-status-message`, `ui-swatch`, `ui-text` |
| **Document editing.** Document and compact editor sessions | `ui-compact-content`, `ui-compact-editor`, `ui-compact-mark`, `ui-compact-node`, `ui-editor`, `ui-editor-surface`, `ui-light-editor` |
| Editor menus and command surfaces | `ui-editor-block-actions`, `ui-editor-code-language`, `ui-editor-formatting-tools`, `ui-editor-image-toolbar`, `ui-editor-insert-table-grid`, `ui-editor-mention-menu`, `ui-editor-mention-menu-item`, `ui-editor-slash-menu`, `ui-editor-slash-menu-group`, `ui-editor-slash-menu-item`, `ui-editor-table-context-menu`, `ui-editor-table-overlay`, `ui-editor-table-toolbar`, `ui-editor-toolbar` |
| Editing structured document attributes | `ui-editor-chip-editor`, `ui-editor-footnote-editor`, `ui-editor-link-card`, `ui-editor-link-form` |

## Extraction checks

- Give a shared behavior two consumers or one consumer and a concrete presenter requirement. Identify the behavior each consumer already promises before extracting code.
- Test state transitions directly and keep contract assertions at each public entry point. A keyboard move that changes focus, a committed selection, and an emitted action need distinct assertions.
- Retain the native HTML path for browser-owned semantics. Share portable rules with a native presenter only when the presenter has a matching requirement.
- Run the interaction inside a screen with a realistic width, neighboring controls, and overflow. The [Blocks guide](../apps/docs-next/docs/blocks.md) is the starting point.
